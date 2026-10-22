package expo.modules.subjecttravel

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.nfc.NfcAdapter
import android.nfc.Tag
import android.nfc.tech.NfcF
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import com.facebook.react.common.LifecycleState
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.TextRecognizer
import com.google.mlkit.vision.text.japanese.JapaneseTextRecognizerOptions
import com.google.mlkit.vision.text.korean.KoreanTextRecognizerOptions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.IOException
import java.util.concurrent.atomic.AtomicBoolean

class SubjectTravelModule : Module() {
  private val main = Handler(Looper.getMainLooper())
  @Volatile private var destroyed = false
  @Volatile private var foreground = true
  private var speech: SpeechRecognizer? = null
  private var voicePromise: Promise? = null
  private var voiceTimeout: Runnable? = null
  private var ocrPromise: Promise? = null
  private var ocrBusy = false
  private var card: CardSession? = null
  // A cancelled transport must finish closing before another scan can use the NFC service.
  private var cardWorkers = 0

  private class CardSession(val promise: Promise, val activity: Activity, val adapter: NfcAdapter) {
    val claimed = AtomicBoolean(false)
    val cancelled = AtomicBoolean(false)
    @Volatile var tech: NfcF? = null
    var timeout: Runnable? = null
  }

  override fun definition() = ModuleDefinition {
    Name("SubjectTravel")
    AsyncFunction("capabilities") { promise: Promise -> main.post {
      val context = appContext.reactContext
      if (context == null) { promise.reject("UNAVAILABLE", "앱을 다시 열어 주세요.", null); return@post }
      promise.resolve(mapOf("ocr" to !destroyed,
        "nfc" to (!destroyed && runCatching { NfcAdapter.getDefaultAdapter(context)?.isEnabled == true }.getOrDefault(false)),
        "voice" to (!destroyed && Build.VERSION.SDK_INT >= 31 &&
          runCatching { SpeechRecognizer.isOnDeviceRecognitionAvailable(context) }.getOrDefault(false))))
    }; Unit }
    AsyncFunction("recognizeImage") { uri: String, language: String, promise: Promise -> main.post {
      if (!requireForeground(promise)) return@post
      if (ocrBusy) { promise.reject("BUSY", "이미 사진을 읽고 있어요.", null); return@post }
      val context = appContext.reactContext ?: return@post
      val parsed = Uri.parse(uri)
      if (language !in listOf("ja", "ko") ||
        (parsed.scheme != "content" && (parsed.scheme != "file" || !parsed.authority.isNullOrEmpty()))) {
        promise.reject("OCR", "사진과 선택 언어를 확인해 주세요.", null); return@post
      }
      ocrBusy = true
      ocrPromise = promise
      // Decode only an already accessible local URI; no camera/storage permission or upload is needed.
      Thread({
        try {
          val image = InputImage.fromFilePath(context, parsed)
          main.post { processImage(image, language, promise) }
        } catch (_: Exception) {
          main.post {
            ocrBusy = false
            finishOcr(promise, null, "사진을 열지 못했어요. 사진 접근 권한을 확인해 주세요.")
          }
        }
      }, "SubjectTravel-OCR").start()
    }; Unit }
    AsyncFunction("listen") { language: String, promise: Promise -> main.post {
      if (!requireForeground(promise)) return@post
      val context = appContext.reactContext ?: return@post
      if (voicePromise != null) { promise.reject("BUSY", "이미 듣고 있어요.", null); return@post }
      if (language !in listOf("ko", "ja")) {
        promise.reject("INVALID_INPUT", "음성 인식 언어를 확인해 주세요.", null); return@post
      }
      if (context.checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
        promise.reject("PERMISSION", "마이크 권한을 허용해 주세요.", null); return@post
      }
      if (Build.VERSION.SDK_INT < 31 ||
        !runCatching { SpeechRecognizer.isOnDeviceRecognitionAvailable(context) }.getOrDefault(false)) {
        promise.reject("UNAVAILABLE", "이 기기에서는 오프라인 음성 인식을 지원하지 않아요.", null); return@post
      }
      voicePromise = promise
      try {
        // EXTRA_PREFER_OFFLINE alone is only a hint. Never create the network-capable default recognizer.
        val recognizer = SpeechRecognizer.createOnDeviceSpeechRecognizer(context)
        speech = recognizer
        recognizer.setRecognitionListener(object : RecognitionListener {
          override fun onReadyForSpeech(params: Bundle?) {}
          override fun onBeginningOfSpeech() {}
          override fun onRmsChanged(rmsdB: Float) {}
          override fun onBufferReceived(buffer: ByteArray?) {}
          override fun onEndOfSpeech() {}
          override fun onPartialResults(results: Bundle?) {}
          override fun onEvent(eventType: Int, params: Bundle?) {}
          override fun onError(error: Int) {
            if (voicePromise === promise) finishVoice(null,
              "음성을 인식하지 못했어요. 기기의 한국어·일본어 음성팩과 마이크를 확인해 주세요. ($error)")
          }
          override fun onResults(results: Bundle?) {
            if (voicePromise !== promise) return
            val text = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull()
            finishVoice(text, if (text.isNullOrBlank()) "인식한 말이 없어요." else null)
          }
        })
        val timeout = Runnable {
          if (voicePromise === promise) finishVoice(null, "음성 인식 시간이 끝났어요. 다시 말해 주세요.")
        }
        voiceTimeout = timeout
        main.postDelayed(timeout, 45000)
        recognizer.startListening(Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
          putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
          putExtra(RecognizerIntent.EXTRA_LANGUAGE, if (language == "ko") "ko-KR" else "ja-JP")
          putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true)
          putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
        })
      } catch (_: Exception) { finishVoice(null, "기기 내 음성 인식을 시작하지 못했어요.") }
    }; Unit }
    AsyncFunction("stopListening") { promise: Promise -> main.post {
      try {
        speech?.stopListening()
        val pending = voicePromise
        if (pending != null) {
          voiceTimeout?.let { main.removeCallbacks(it) }
          val timeout = Runnable {
            if (voicePromise === pending) finishVoice(null, "음성 인식 시간이 끝났어요. 다시 말해 주세요.")
          }
          voiceTimeout = timeout
          main.postDelayed(timeout, 5000)
        }
      }
      catch (_: Exception) { finishVoice(null, "음성 인식을 마치지 못했어요.") }
      // Keep the promise and timeout until onResults/onError, as required by SpeechRecognizer.
      promise.resolve(null)
    }; Unit }
    AsyncFunction("cancel") { promise: Promise -> main.post { cancelAll(); promise.resolve(null) }; Unit }
    AsyncFunction("scanCard") { promise: Promise -> main.post {
      if (!requireForeground(promise)) return@post
      if (card != null || cardWorkers != 0) {
        promise.reject("BUSY", "이전 카드 읽기를 마치는 중이에요. 잠시 후 다시 시도해 주세요.", null); return@post
      }
      var session: CardSession? = null
      try {
        val activity = appContext.currentActivity ?: throw IllegalStateException()
        if (activity.checkSelfPermission(Manifest.permission.NFC) != PackageManager.PERMISSION_GRANTED) {
          promise.reject("PERMISSION", "앱의 NFC 권한 설정을 확인해 주세요.", null); return@post
        }
        val adapter = NfcAdapter.getDefaultAdapter(activity)
        if (adapter?.isEnabled != true) {
          promise.reject("NFC", "NFC를 켜고 실물 교통카드를 준비해 주세요.", null); return@post
        }
        val current = CardSession(promise, activity, adapter)
        session = current
        card = current
        val timeout = Runnable {
          if (card === current) finishCard(current, null, "카드를 찾지 못했어요. NFC 위치를 확인해 주세요.")
        }
        current.timeout = timeout
        main.postDelayed(timeout, 60000)
        adapter.enableReaderMode(activity, { tag -> main.post {
          if (card === current && !current.cancelled.get() && current.claimed.compareAndSet(false, true)) {
            cardWorkers++
            Thread({ readCard(current, tag) }, "SubjectTravel-NFC").start()
          }
        } }, NfcAdapter.FLAG_READER_NFC_F or NfcAdapter.FLAG_READER_SKIP_NDEF_CHECK, null)
      } catch (_: Exception) {
        val current = session
        if (current != null) finishCard(current, null, "NFC 읽기를 시작하지 못했어요.")
        else promise.reject("NFC", "NFC 읽기를 시작하지 못했어요.", null)
      }
    }; Unit }
    OnActivityEntersForeground { foreground = true }
    OnActivityEntersBackground { foreground = false; onMain { cancelAll() } }
    OnActivityDestroys { foreground = false; onMain { cancelAll() } }
    OnDestroy { destroyed = true; onMain { cancelAll() } }
  }

  private fun isForeground(): Boolean {
    val activity = appContext.currentActivity
    return !destroyed && foreground && activity != null && !activity.isFinishing && !activity.isDestroyed &&
      appContext.reactContext?.lifecycleState == LifecycleState.RESUMED
  }

  private fun requireForeground(promise: Promise): Boolean {
    if (isForeground()) return true
    promise.reject("UNAVAILABLE", "앱을 화면에 열고 다시 시도해 주세요.", null)
    return false
  }

  private fun onMain(action: () -> Unit) {
    if (Looper.myLooper() == main.looper) action() else main.post { action() }
  }

  private fun processImage(image: InputImage, language: String, promise: Promise) {
    if (ocrPromise !== promise || !isForeground()) {
      ocrBusy = false
      finishOcr(promise, null, "사진 읽기를 취소했어요.")
      return
    }
    var recognizer: TextRecognizer? = null
    try {
      val current = if (language == "ko") TextRecognition.getClient(KoreanTextRecognizerOptions.Builder().build())
        else TextRecognition.getClient(JapaneseTextRecognizerOptions.Builder().build())
      recognizer = current
      current.process(image).addOnCompleteListener { task ->
        // ML Kit tasks are not cancellable. Always close on completion, including after JS/lifecycle cancellation.
        try { current.close() } catch (_: Exception) {}
        ocrBusy = false
        finishOcr(promise, if (task.isSuccessful) task.result.text else null,
          if (task.isSuccessful) null else "사진에서 글자를 읽지 못했어요.")
      }
    } catch (_: Exception) {
      try { recognizer?.close() } catch (_: Exception) {}
      ocrBusy = false
      finishOcr(promise, null, "사진에서 글자를 읽지 못했어요.")
    }
  }

  private fun finishOcr(promise: Promise, text: String?, error: String?) {
    if (ocrPromise !== promise) return
    ocrPromise = null
    val failure = if (!isForeground()) "사진 읽기를 취소했어요." else error
    if (failure == null) promise.resolve(text) else promise.reject("OCR", failure, null)
  }

  private fun finishVoice(text: String?, error: String?) {
    val promise = voicePromise ?: return
    voicePromise = null
    voiceTimeout?.let { main.removeCallbacks(it) }
    voiceTimeout = null
    val recognizer = speech
    speech = null
    // Clear ownership before cancelling: service callbacks may be reentrant or arrive late.
    try { recognizer?.cancel() } catch (_: Exception) {}
    finally { try { recognizer?.destroy() } catch (_: Exception) {} }
    val failure = if (!isForeground()) "음성 인식을 취소했어요." else error
    if (failure == null) promise.resolve(text) else promise.reject("VOICE", failure, null)
  }

  private fun readCard(session: CardSession, tag: Tag) {
    var result: Any? = null
    var error: String? = null
    var tech: NfcF? = null
    try {
      if (session.cancelled.get()) return
      val current = NfcF.get(tag) ?: throw IOException("Unsupported tag")
      tech = current
      session.tech = current
      checkCardActive(session)
      current.connect()
      checkCardActive(session)
      current.timeout = 3000
      val poll = transceive(session, current, byteArrayOf(6, 0, 0, 3, 0, 0))
      require(poll.size == 18 && (poll[0].toInt() and 255) == poll.size && poll[1].toInt() == 1)
      val id = poll.copyOfRange(2, 10)
      val blocks = ArrayList<List<Int>>()
      for (index in 0 until 20) {
        val command = byteArrayOf(16, 6) + id + byteArrayOf(1, 0x0f, 0x09, 1, 0x80.toByte(), index.toByte())
        val response = transceive(session, current, command)
        require(response.size == 29 && (response[0].toInt() and 255) == response.size &&
          response[1].toInt() == 7 && response.copyOfRange(2, 10).contentEquals(id) &&
          response[10].toInt() == 0 && response[11].toInt() == 0 && response[12].toInt() == 1)
        blocks.add(response.copyOfRange(13, 29).map { it.toInt() and 255 })
      }
      checkCardActive(session)
      result = mapOf("id" to id.joinToString("") { "%02x".format(it.toInt() and 255) }, "blocks" to blocks)
    } catch (_: Exception) {
      error = "카드를 움직이지 말고 다시 시도해 주세요. FeliCa 실물 교통카드만 지원해요."
    } finally {
      // Close before posting success; never hand a new session a still-connected transport.
      try { tech?.close() } catch (_: Exception) {}
      session.tech = null
      val value = result
      val failure = error
      main.post {
        cardWorkers--
        if (card === session && !session.cancelled.get()) finishCard(session, value, failure)
      }
    }
  }

  private fun checkCardActive(session: CardSession) {
    if (session.cancelled.get() || destroyed || !foreground) throw IOException("Cancelled")
  }

  private fun transceive(session: CardSession, tech: NfcF, command: ByteArray): ByteArray {
    checkCardActive(session)
    val response = tech.transceive(command)
    checkCardActive(session)
    return response
  }

  private fun finishCard(session: CardSession, result: Any?, error: String?) {
    if (card !== session) return
    card = null
    session.cancelled.set(true)
    session.timeout?.let { main.removeCallbacks(it) }
    session.timeout = null
    // disableReaderMode does not cancel connect/transceive. close from another thread does.
    session.tech?.let { tech ->
      cardWorkers++
      Thread({
        try { tech.close() } catch (_: Exception) {}
        finally { main.post { cardWorkers-- } }
      }, "SubjectTravel-NFC-close").start()
    }
    try { session.adapter.disableReaderMode(session.activity) } catch (_: Exception) {}
    val failure = if (!isForeground()) "카드 읽기를 취소했어요." else error
    if (failure == null) session.promise.resolve(result) else session.promise.reject("NFC", failure, null)
  }

  private fun cancelAll() {
    ocrPromise?.let { finishOcr(it, null, "사진 읽기를 취소했어요.") }
    finishVoice(null, "음성 인식을 취소했어요.")
    card?.let { finishCard(it, null, "카드 읽기를 취소했어요.") }
  }
}
