import ExpoModulesCore
import Vision
import UIKit
import AVFoundation
import Speech
import CoreNFC

public class SubjectTravelModule: Module {
  private let voice = LocalVoice()
  private let cards = LocalCards()
  public func definition() -> ModuleDefinition {
    Name("SubjectTravel")
    AsyncFunction("capabilities") { () -> [String: Bool] in
      ["ocr": true, "nfc": NFCTagReaderSession.readingAvailable,
       "voice": ["ko-KR", "ja-JP"].contains { SFSpeechRecognizer(locale: Locale(identifier: $0))?.supportsOnDeviceRecognition == true }]
    }
    AsyncFunction("recognizeImage") { (uri: String, language: String, promise: Promise) in
      guard ["ko", "ja"].contains(language), let url = URL(string: uri), url.isFileURL else {
        promise.reject("OCR", "사진과 언어를 확인해 주세요."); return
      }
      DispatchQueue.global(qos: .userInitiated).async {
        do {
          let request = VNRecognizeTextRequest()
          request.recognitionLevel = .accurate
          request.recognitionLanguages = [language == "ja" ? "ja-JP" : "ko-KR", "en-US"]
          request.usesLanguageCorrection = true
          try VNImageRequestHandler(url: url).perform([request])
          promise.resolve((request.results ?? []).compactMap { $0.topCandidates(1).first?.string }.joined(separator: "\n"))
        } catch { promise.reject("OCR", "사진에서 글자를 읽지 못했어요.") }
      }
    }
    AsyncFunction("listen") { (language: String, promise: Promise) in
      DispatchQueue.main.async { self.voice.start(language, promise) }
    }
    AsyncFunction("stopListening") { DispatchQueue.main.async { self.voice.stop() } }
    AsyncFunction("scanCard") { (promise: Promise) in DispatchQueue.main.async { self.cards.start(promise) } }
    AsyncFunction("cancel") { DispatchQueue.main.async { self.voice.cancel(); self.cards.cancel() } }
    OnAppEntersBackground { DispatchQueue.main.async { self.voice.cancel(); self.cards.cancel() } }
    OnDestroy { DispatchQueue.main.async { self.voice.cancel(); self.cards.cancel() } }
  }
}

private final class LocalVoice {
  private var engine: AVAudioEngine?
  private var request: SFSpeechAudioBufferRecognitionRequest?
  private var task: SFSpeechRecognitionTask?
  private var recognizer: SFSpeechRecognizer?
  private var promise: Promise?
  private var timeout: DispatchWorkItem?
  private var generation = UUID()
  private var tapInstalled = false
  func start(_ language: String, _ promise: Promise) {
    guard self.promise == nil else { promise.reject("BUSY", "이미 듣고 있어요."); return }
    guard ["ko", "ja"].contains(language), let recognizer = SFSpeechRecognizer(locale: Locale(identifier: language == "ko" ? "ko-KR" : "ja-JP")), recognizer.supportsOnDeviceRecognition else {
      promise.reject("UNAVAILABLE", "이 언어의 기기 내 음성 인식을 지원하지 않아요."); return
    }
    self.promise = promise; self.recognizer = recognizer
    let token = UUID(); generation = token
    SFSpeechRecognizer.requestAuthorization { status in
      guard status == .authorized else { DispatchQueue.main.async { if self.generation == token { self.finish(nil, "음성 인식 권한이 필요해요.") } }; return }
      AVAudioSession.sharedInstance().requestRecordPermission { granted in
        DispatchQueue.main.async {
          guard self.generation == token, self.promise != nil else { return }
          guard granted else { self.finish(nil, "마이크 권한이 필요해요."); return }
          do {
            let audio = AVAudioSession.sharedInstance()
            try audio.setCategory(.record, mode: .measurement, options: .duckOthers)
            try audio.setActive(true, options: .notifyOthersOnDeactivation)
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
            let timeout = DispatchWorkItem { if self.generation == token { self.finish(nil, "음성 인식 시간이 끝났어요.") } }
            self.timeout = timeout
            DispatchQueue.main.asyncAfter(deadline: .now() + 45, execute: timeout)
          } catch { self.finish(nil, "마이크를 시작하지 못했어요.") }
        }
      }
    }
  }
  func stop() { engine?.stop(); request?.endAudio() }
  func cancel() { finish(nil, "음성 인식을 취소했어요.") }
  private func finish(_ text: String?, _ error: String?) {
    guard let promise = promise else { return }
    self.promise = nil; generation = UUID(); timeout?.cancel(); timeout = nil
    engine?.stop()
    if tapInstalled { engine?.inputNode.removeTap(onBus: 0) }
    tapInstalled = false; engine = nil
    request?.endAudio(); task?.cancel(); task = nil; request = nil; recognizer = nil
    try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    if let error = error { promise.reject("VOICE", error) }
    else if let text = text, !text.isEmpty { promise.resolve(text) }
    else { promise.reject("VOICE", "인식한 말이 없어요.") }
  }
}

private final class LocalCards: NSObject, NFCTagReaderSessionDelegate {
  private var session: NFCTagReaderSession?
  private var promise: Promise?
  func start(_ promise: Promise) {
    guard self.promise == nil else { promise.reject("BUSY", "이미 카드를 읽고 있어요."); return }
    guard NFCTagReaderSession.readingAvailable else { promise.reject("NFC", "이 기기에서는 NFC를 사용할 수 없어요."); return }
    self.promise = promise
    session = NFCTagReaderSession(pollingOption: .iso18092, delegate: self, queue: .main)
    session?.alertMessage = "실물 Suica·PASMO·ICOCA를 iPhone 상단에 대 주세요."
    session?.begin()
  }
  func cancel() { session?.invalidate(); finish(nil, "카드 읽기를 취소했어요.") }
  func tagReaderSessionDidBecomeActive(_ session: NFCTagReaderSession) {}
  func tagReaderSession(_ session: NFCTagReaderSession, didInvalidateWithError error: Error) {
    if self.session === session { finish(nil, "NFC 읽기가 종료됐어요. 카드와 NFC 권한을 확인해 주세요.") }
  }
  func tagReaderSession(_ session: NFCTagReaderSession, didDetect tags: [NFCTag]) {
    guard tags.count == 1, case let .feliCa(card) = tags[0] else {
      session.alertMessage = "실물 교통카드 한 장만 대 주세요."; session.restartPolling(); return
    }
    session.connect(to: tags[0]) { error in
      guard self.session === session else { return }
      if error != nil { session.invalidate(errorMessage: "카드를 연결하지 못했어요."); self.finish(nil, "카드를 다시 대 주세요."); return }
      self.read(card, session, 0, [])
    }
  }
  private func read(_ card: NFCFeliCaTag, _ session: NFCTagReaderSession, _ index: Int, _ blocks: [[Int]]) {
    guard self.session === session else { return }
    if index == 20 {
      let id = card.currentIDm.map { String(format: "%02x", $0) }.joined()
      session.alertMessage = "교통카드 기록을 읽었어요."
      session.invalidate()
      finish(["id": id, "blocks": blocks], nil); return
    }
    card.readWithoutEncryption(serviceCodeList: [Data([0x0f, 0x09])], blockList: [Data([0x80, UInt8(index)])]) { flag1, flag2, data, error in
      guard self.session === session else { return }
      guard error == nil, flag1 == 0, flag2 == 0, data.count == 1, data[0].count == 16 else {
        session.invalidate(errorMessage: "이 카드의 기록을 읽지 못했어요.")
        self.finish(nil, "FeliCa 실물 교통카드를 움직이지 말고 다시 시도해 주세요."); return
      }
      self.read(card, session, index + 1, blocks + [data[0].map { Int($0) }])
    }
  }
  private func finish(_ value: [String: Any]?, _ error: String?) {
    guard let promise = promise else { return }
    self.promise = nil; session = nil
    if let error = error { promise.reject("NFC", error) } else { promise.resolve(value) }
  }
}
