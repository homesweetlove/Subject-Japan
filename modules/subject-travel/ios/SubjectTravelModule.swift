import ExpoModulesCore
import Vision
import UIKit
import AVFoundation
import Speech
import CoreNFC
import ImageIO

public class SubjectTravelModule: Module {
  private let voice = LocalVoice()
  private let cards = LocalCards()
  private let images = LocalImages()
  public func definition() -> ModuleDefinition {
    Name("SubjectTravel")
    AsyncFunction("capabilities") { (promise: Promise) in
      DispatchQueue.main.async {
        promise.resolve(["ocr": true, "nfc": NFCTagReaderSession.readingAvailable,
          "voice": ["ko-KR", "ja-JP"].contains { SFSpeechRecognizer(locale: Locale(identifier: $0))?.supportsOnDeviceRecognition == true }])
      }
    }
    AsyncFunction("recognizeImage") { (uri: String, language: String, promise: Promise) in
      DispatchQueue.main.async { self.images.start(uri, language, promise) }
    }
    AsyncFunction("listen") { (language: String, promise: Promise) in
      DispatchQueue.main.async { self.voice.start(language, promise) }
    }
    AsyncFunction("stopListening") { (promise: Promise) in
      DispatchQueue.main.async { self.voice.stop(); promise.resolve(nil) }
    }
    AsyncFunction("scanCard") { (promise: Promise) in DispatchQueue.main.async { self.cards.start(promise) } }
    AsyncFunction("cancel") { (promise: Promise) in
      DispatchQueue.main.async { self.voice.cancel(); self.cards.cancel(); self.images.cancel(); promise.resolve(nil) }
    }
    OnAppEntersBackground { DispatchQueue.main.async { self.voice.cancel(); self.cards.cancel(); self.images.cancel() } }
    OnDestroy { DispatchQueue.main.async { self.voice.destroy(); self.cards.destroy(); self.images.destroy() } }
  }
}

// All state is confined to the main queue; only Vision processing runs off it.
private final class LocalImages {
  private var destroyed = false
  private var request: VNRecognizeTextRequest?
  private var promise: Promise?
  private var generation = UUID()
  func start(_ uri: String, _ language: String, _ promise: Promise) {
    guard self.promise == nil else { promise.reject("BUSY", "이미 사진을 읽고 있어요."); return }
    guard !destroyed, UIApplication.shared.applicationState != .background,
          ["ko", "ja"].contains(language), let url = URL(string: uri), url.isFileURL,
          url.host == nil || url.host == "" || url.host == "localhost" else {
      promise.reject("OCR", "사진과 언어를 확인해 주세요."); return
    }
    let request = VNRecognizeTextRequest()
    // Revision 3 adds Japanese and Korean; do not depend on an OS default.
    request.revision = VNRecognizeTextRequestRevision3
    request.recognitionLevel = .accurate
    request.recognitionLanguages = [language == "ja" ? "ja-JP" : "ko-KR", "en-US"]
    request.usesLanguageCorrection = true
    self.request = request; self.promise = promise
    let token = UUID(); generation = token
    DispatchQueue.global(qos: .userInitiated).async {
      autoreleasepool {
        do {
          // Preserve camera/HEIC orientation without decoding a full UIImage.
          let source = CGImageSourceCreateWithURL(url as CFURL, nil)
          let properties = source.flatMap { CGImageSourceCopyPropertiesAtIndex($0, 0, nil) as? [CFString: Any] }
          let raw = (properties?[kCGImagePropertyOrientation] as? NSNumber)?.uint32Value ?? 1
          let orientation = CGImagePropertyOrientation(rawValue: raw) ?? .up
          try VNImageRequestHandler(url: url, orientation: orientation).perform([request])
          let text = (request.results ?? []).compactMap { $0.topCandidates(1).first?.string }.joined(separator: "\n")
          DispatchQueue.main.async { if self.generation == token { self.finish(text, nil) } }
        } catch {
          DispatchQueue.main.async { if self.generation == token { self.finish(nil, "사진에서 글자를 읽지 못했어요.") } }
        }
      }
    }
  }
  func cancel() { request?.cancel(); finish(nil, "사진 읽기를 취소했어요.") }
  func destroy() { destroyed = true; cancel() }
  private func finish(_ text: String?, _ error: String?) {
    guard let promise = promise else { return }
    self.promise = nil; request = nil; generation = UUID()
    if let error = error { promise.reject("OCR", error) } else { promise.resolve(text ?? "") }
  }
}

private final class LocalVoice {
  private var destroyed = false
  private var engine: AVAudioEngine?
  private var request: SFSpeechAudioBufferRecognitionRequest?
  private var task: SFSpeechRecognitionTask?
  private var recognizer: SFSpeechRecognizer?
  private var promise: Promise?
  private var timeout: DispatchWorkItem?
  private var generation = UUID()
  private var tapInstalled = false
  private var finalizing = false
  private var audioActive = false
  private var previousCategory: AVAudioSession.Category?
  private var previousMode: AVAudioSession.Mode?
  private var previousOptions: AVAudioSession.CategoryOptions?
  private var interruption: NSObjectProtocol?
  func start(_ language: String, _ promise: Promise) {
    guard self.promise == nil else { promise.reject("BUSY", "이미 듣고 있어요."); return }
    guard !destroyed, UIApplication.shared.applicationState != .background else {
      promise.reject("VOICE", "앱을 연 상태에서 음성 인식을 시작해 주세요."); return
    }
    guard ["ko", "ja"].contains(language), let recognizer = SFSpeechRecognizer(locale: Locale(identifier: language == "ko" ? "ko-KR" : "ja-JP")), recognizer.supportsOnDeviceRecognition else {
      promise.reject("UNAVAILABLE", "이 언어의 기기 내 음성 인식을 지원하지 않아요."); return
    }
    self.promise = promise; self.recognizer = recognizer
    let token = UUID(); generation = token
    SFSpeechRecognizer.requestAuthorization { status in
      // Authorization callbacks may arrive off-main and after cancel/teardown.
      // Check the token before showing a second permission prompt as well.
      DispatchQueue.main.async {
        guard self.generation == token, self.promise != nil else { return }
        guard status == .authorized else { self.finish(nil, "음성 인식 권한이 필요해요."); return }
        AVAudioSession.sharedInstance().requestRecordPermission { granted in
          DispatchQueue.main.async {
          guard self.generation == token, self.promise != nil else { return }
          guard granted else { self.finish(nil, "마이크 권한이 필요해요."); return }
          guard UIApplication.shared.applicationState != .background else { self.cancel(); return }
          guard recognizer.supportsOnDeviceRecognition else {
            self.finish(nil, "이 언어의 기기 내 음성 인식을 지원하지 않아요."); return
          }
          do {
            let audio = AVAudioSession.sharedInstance()
            self.previousCategory = audio.category
            self.previousMode = audio.mode
            self.previousOptions = audio.categoryOptions
            // duckOthers is unsupported by the record category. Restore the
            // caller's category on cleanup so subsequent TTS can play audio.
            try audio.setCategory(.record, mode: .measurement)
            try audio.setActive(true)
            self.audioActive = true
            self.interruption = NotificationCenter.default.addObserver(forName: AVAudioSession.interruptionNotification, object: audio, queue: .main) { [weak self] _ in
              guard let self = self, self.generation == token else { return }
              self.finish(nil, "음성 인식이 중단됐어요. 다시 시도해 주세요.")
            }
            let engine = AVAudioEngine()
            self.engine = engine
            let request = SFSpeechAudioBufferRecognitionRequest()
            request.requiresOnDeviceRecognition = true
            request.shouldReportPartialResults = false
            self.request = request
            let input = engine.inputNode
            let format = input.outputFormat(forBus: 0)
            guard format.sampleRate > 0, format.channelCount > 0 else { self.finish(nil, "마이크를 사용할 수 없어요."); return }
            input.installTap(onBus: 0, bufferSize: 1024, format: format) { buffer, _ in request.append(buffer) }
            self.tapInstalled = true
            self.task = recognizer.recognitionTask(with: request) { result, error in
              DispatchQueue.main.async {
                guard self.generation == token else { return }
                if let result = result, result.isFinal { self.finish(result.bestTranscription.formattedString, nil) }
                else if error != nil { self.finish(nil, "음성을 인식하지 못했어요. 기기 음성팩과 마이크를 확인해 주세요.") }
              }
            }
            engine.prepare(); try engine.start()
            self.scheduleTimeout(token, 45)
          } catch { self.finish(nil, "마이크를 시작하지 못했어요.") }
          }
        }
      }
    }
  }
  private func scheduleTimeout(_ token: UUID, _ seconds: Double) {
    timeout?.cancel()
    let timeout = DispatchWorkItem { if self.generation == token { self.finish(nil, "음성 인식 시간이 끝났어요.") } }
    self.timeout = timeout
    DispatchQueue.main.asyncAfter(deadline: .now() + seconds, execute: timeout)
  }
  private func stopCapture() {
    engine?.stop()
    if tapInstalled { engine?.inputNode.removeTap(onBus: 0) }
    tapInstalled = false; engine = nil
    request?.endAudio()
    if audioActive {
      try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
      audioActive = false
    }
    if let category = previousCategory, let mode = previousMode, let options = previousOptions {
      try? AVAudioSession.sharedInstance().setCategory(category, mode: mode, options: options)
    }
    previousCategory = nil; previousMode = nil; previousOptions = nil
    if let interruption = interruption { NotificationCenter.default.removeObserver(interruption) }
    interruption = nil
  }
  func stop() {
    guard promise != nil else { return }
    // Repeated stop actions must preserve the task and its original deadline
    // while the recognizer produces the final transcript.
    guard !finalizing else { return }
    guard engine != nil else { cancel(); return }
    finalizing = true
    stopCapture()
    // Final transcription may still arrive; release the microphone immediately
    // and bound the wait instead of keeping it for the full recording timeout.
    scheduleTimeout(generation, 5)
  }
  func cancel() { finish(nil, "음성 인식을 취소했어요.") }
  func destroy() { destroyed = true; cancel() }
  private func finish(_ text: String?, _ error: String?) {
    guard let promise = promise else { return }
    self.promise = nil; finalizing = false; generation = UUID(); timeout?.cancel(); timeout = nil
    stopCapture()
    task?.cancel(); task = nil; request = nil; recognizer = nil
    if let error = error { promise.reject("VOICE", error) }
    else if let text = text, !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty { promise.resolve(text) }
    else { promise.reject("VOICE", "인식한 말이 없어요.") }
  }
}

private final class LocalCards: NSObject, NFCTagReaderSessionDelegate {
  private var destroyed = false
  private var session: NFCTagReaderSession?
  private var promise: Promise?
  private var reading = false
  private var timeout: DispatchWorkItem?
  func start(_ promise: Promise) {
    guard self.promise == nil else { promise.reject("BUSY", "이미 카드를 읽고 있어요."); return }
    guard !destroyed, UIApplication.shared.applicationState == .active, NFCTagReaderSession.readingAvailable else { promise.reject("NFC", "앱을 열고 NFC를 사용할 수 있는 기기에서 시도해 주세요."); return }
    guard let session = NFCTagReaderSession(pollingOption: .iso18092, delegate: self, queue: .main) else {
      promise.reject("NFC", "NFC 읽기를 시작하지 못했어요."); return
    }
    self.promise = promise
    self.session = session; reading = false
    session.alertMessage = "실물 Suica·PASMO·ICOCA를 iPhone 상단에 대 주세요."
    let timeout = DispatchWorkItem { [weak self, weak session] in
      guard let self = self, let session = session, self.session === session else { return }
      self.finish(nil, "카드를 찾지 못했어요. NFC 위치를 확인해 주세요.")
      session.invalidate(errorMessage: "카드 읽기 시간이 끝났어요.")
    }
    self.timeout = timeout
    DispatchQueue.main.asyncAfter(deadline: .now() + 60, execute: timeout)
    session.begin()
  }
  func cancel() {
    let session = session
    finish(nil, "카드 읽기를 취소했어요.")
    session?.invalidate()
  }
  func destroy() { destroyed = true; cancel() }
  func tagReaderSessionDidBecomeActive(_ session: NFCTagReaderSession) {}
  func tagReaderSession(_ session: NFCTagReaderSession, didInvalidateWithError error: Error) {
    if self.session === session { finish(nil, "NFC 읽기가 종료됐어요. 카드와 NFC 권한을 확인해 주세요.") }
  }
  func tagReaderSession(_ session: NFCTagReaderSession, didDetect tags: [NFCTag]) {
    guard self.session === session, !reading else { return }
    guard tags.count == 1, case let .feliCa(card) = tags[0] else {
      session.alertMessage = "실물 교통카드 한 장만 대 주세요."; session.restartPolling(); return
    }
    guard card.currentSystemCode == Data([0x00, 0x03]), card.currentIDm.count == 8 else {
      finish(nil, "일본 FeliCa 실물 교통카드만 지원해요.")
      session.invalidate(errorMessage: "지원하지 않는 카드예요."); return
    }
    reading = true
    session.connect(to: tags[0]) { error in
      DispatchQueue.main.async {
        guard self.session === session else { return }
        if error != nil {
          self.finish(nil, "카드를 다시 대 주세요.")
          session.invalidate(errorMessage: "카드를 연결하지 못했어요."); return
        }
        self.read(card, session, 0, [])
      }
    }
  }
  private func read(_ card: NFCFeliCaTag, _ session: NFCTagReaderSession, _ index: Int, _ blocks: [[Int]]) {
    guard self.session === session else { return }
    if index == 20 {
      let id = card.currentIDm.map { String(format: "%02x", $0) }.joined()
      session.alertMessage = "교통카드 기록을 읽었어요."
      finish(["id": id, "blocks": blocks], nil)
      session.invalidate()
      return
    }
    card.readWithoutEncryption(serviceCodeList: [Data([0x0f, 0x09])], blockList: [Data([0x80, UInt8(index)])]) { flag1, flag2, data, error in
      DispatchQueue.main.async {
        guard self.session === session else { return }
        guard error == nil, flag1 == 0, flag2 == 0, data.count == 1, data[0].count == 16 else {
          // A non-zero status after some blocks may mean either end-of-history
          // or a card/service error. Never turn it into a verified balance.
          let incomplete = error == nil && (flag1 != 0 || flag2 != 0) && !blocks.isEmpty
          let message = incomplete
            ? "기록 일부만 읽혔어요. 검증되지 않은 잔액은 저장하지 않았어요."
            : "FeliCa 실물 교통카드를 움직이지 말고 다시 시도해 주세요."
          self.finish(nil, message)
          session.invalidate(errorMessage: "이 카드의 기록을 완전히 확인하지 못했어요."); return
        }
        self.read(card, session, index + 1, blocks + [data[0].map { Int($0) }])
      }
    }
  }
  private func finish(_ value: [String: Any]?, _ error: String?) {
    guard let promise = promise else { return }
    self.promise = nil; session = nil; reading = false
    timeout?.cancel(); timeout = nil
    if let error = error { promise.reject("NFC", error) } else { promise.resolve(value) }
  }
}

