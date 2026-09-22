package expo.modules.subjecttravel

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.nfc.NfcAdapter
import android.nfc.tech.NfcF
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.japanese.JapaneseTextRecognizerOptions
import com.google.mlkit.vision.text.korean.KoreanTextRecognizerOptions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.concurrent.atomic.AtomicBoolean

class SubjectTravelModule : Module() {
  private val main = Handler(Looper.getMainLooper())
  private var speech: SpeechRecognizer? = null
  private var voicePromise: Promise? = null
  @Volatile private var cardPromise: Promise? = null
  private var readerActivity: android.app.Activity? = null
  private val reading = AtomicBoolean(false)
  private val voiceTimeout = Runnable { finishVoice(null, "음성 인식 시간이 끝났어요. 다시 말해 주세요.") }
  private val cardTimeout = Runnable { finishCard(null, "카드를 찾지 못했어요. NFC 위치를 확인해 주세요.") }

  override fun definition() = ModuleDefinition {
    Name("SubjectTravel")
    AsyncFunction("capabilities") {
      val context = appContext.reactContext ?: throw IllegalStateException("앱을 다시 열어 주세요.")
      mapOf("ocr" to true, "nfc" to (NfcAdapter.getDefaultAdapter(context)?.isEnabled == true),
        "voice" to (Build.VERSION.SDK_INT >= 31 && SpeechRecognizer.isOnDeviceRecognitionAvailable(context)))
    }
    AsyncFunction("recognizeImage") { uri: String, language: String, promise: Promise ->
      try {
        require(language == "ja" || language == "ko")
        val parsed = Uri.parse(uri)
        require(parsed.scheme == "file" || parsed.scheme == "content")
        val context = appContext.reactContext ?: throw IllegalStateException()
        val recognizer = if (language == "ko") TextRecognition.getClient(KoreanTextRecognizerOptions.Builder().build())
          else TextRecognition.getClient(JapaneseTextRecognizerOptions.Builder().build())
        val image = InputImage.fromFilePath(context, parsed)
        recognizer.process(image).addOnSuccessListener { promise.resolve(it.text) }
          .addOnFailureListener { promise.reject("OCR", "사진에서 글자를 읽지 못했어요.", it) }
          .addOnCompleteListener { recognizer.close() }
      } catch (e: Exception) { promise.reject("OCR", "사진과 선택 언어를 확인해 주세요.", e) }
    }
    AsyncFunction("listen") { language: String, promise: Promise -> main.post {
      val context = appContext.reactContext
      if (voicePromise != null) { promise.reject("BUSY", "이미 듣고 있어요.", null); return@post }
      if (context == null || Build.VERSION.SDK_INT < 31 || !SpeechRecognizer.isOnDeviceRecognitionAvailable(context)) {
        promise.reject("UNAVAILABLE", "이 기기에서는 오프라인 음성 인식을 지원하지 않아요.", null); return@post
      }
      if (language !in listOf("ko", "ja") || context.checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
        promise.reject("PERMISSION", "마이크 권한과 언어를 확인해 주세요.", null); return@post
      }
      voicePromise = promise
      try {
        speech = SpeechRecognizer.createOnDeviceSpeechRecognizer(context)
        speech!!.setRecognitionListener(object : RecognitionListener {
          override fun onReadyForSpeech(params: Bundle?) {}
          override fun onBeginningOfSpeech() {}
          override fun onRmsChanged(rmsdB: Float) {}
          override fun onBufferReceived(buffer: ByteArray?) {}
          override fun onEndOfSpeech() {}
          override fun onPartialResults(results: Bundle?) {}
          override fun onEvent(eventType: Int, params: Bundle?) {}
          override fun onError(error: Int) { if (voicePromise === promise) finishVoice(null, "음성을 인식하지 못했어요. 기기의 한국어·일본어 음성팩과 마이크를 확인해 주세요. ($error)") }
          override fun onResults(results: Bundle?) {
            if (voicePromise !== promise) return
            val text = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull()
            finishVoice(text, if (text.isNullOrBlank()) "인식한 말이 없어요." else null)
          }
        })
        speech!!.startListening(Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
          putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
          putExtra(RecognizerIntent.EXTRA_LANGUAGE, if (language == "ko") "ko-KR" else "ja-JP")
          putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true)
          putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
        })
        main.postDelayed(voiceTimeout, 45000)
      } catch (e: Exception) { finishVoice(null, "기기 내 음성 인식을 시작하지 못했어요.") }
    }; Unit }
    AsyncFunction("stopListening") { main.post { speech?.stopListening() }; Unit }
    AsyncFunction("cancel") { main.post { cancelAll() }; Unit }
    AsyncFunction("scanCard") { promise: Promise -> main.post {
      if (cardPromise != null) { promise.reject("BUSY", "이미 카드를 읽고 있어요.", null); return@post }
      val activity = appContext.currentActivity
      val adapter = activity?.let { NfcAdapter.getDefaultAdapter(it) }
      if (activity == null || adapter?.isEnabled != true) {
        promise.reject("NFC", "NFC를 켜고 실물 교통카드를 준비해 주세요.", null); return@post
      }
      cardPromise = promise
      readerActivity = activity
      reading.set(false)
      try {
        adapter.enableReaderMode(activity, { tag ->
          if (cardPromise === promise && reading.compareAndSet(false, true)) {
            val tech = NfcF.get(tag)
            try {
              require(tech != null)
              tech.connect()
              tech.timeout = 3000
              val poll = tech.transceive(byteArrayOf(6, 0, 0, 3, 0, 0))
              require(poll.size >= 18 && poll[1].toInt() == 1)
              val id = poll.copyOfRange(2, 10)
              val blocks = ArrayList<List<Int>>()
              for (index in 0 until 20) {
                val command = byteArrayOf(16, 6) + id + byteArrayOf(1, 0x0f, 0x09, 1, 0x80.toByte(), index.toByte())
                val response = tech.transceive(command)
                require(response.size >= 29 && response[1].toInt() == 7 && response.copyOfRange(2,10).contentEquals(id)
                  && response[10].toInt() == 0 && response[11].toInt() == 0 && response[12].toInt() == 1)
                blocks.add(response.copyOfRange(13,29).map { it.toInt() and 255 })
              }
              val result = mapOf("id" to id.joinToString("") { "%02x".format(it.toInt() and 255) }, "blocks" to blocks)
              main.post { if (cardPromise === promise) finishCard(result, null) }
            } catch (e: Exception) {
              main.post { if (cardPromise === promise) finishCard(null, "카드를 움직이지 말고 다시 시도해 주세요. FeliCa 실물 교통카드만 지원해요.") }
            } finally { try { tech?.close() } catch (_: Exception) {} }
          }
        }, NfcAdapter.FLAG_READER_NFC_F or NfcAdapter.FLAG_READER_SKIP_NDEF_CHECK, null)
        main.postDelayed(cardTimeout, 60000)
      } catch (e: Exception) { finishCard(null, "NFC 읽기를 시작하지 못했어요.") }
    }; Unit }
    OnActivityEntersBackground { main.post { cancelAll() } }
    OnDestroy { main.post { cancelAll() } }
  }
  private fun finishVoice(text: String?, error: String?) {
    val promise = voicePromise ?: return
    voicePromise = null
    main.removeCallbacks(voiceTimeout)
    speech?.cancel(); speech?.destroy(); speech = null
    if (error == null) promise.resolve(text) else promise.reject("VOICE", error, null)
  }
  private fun finishCard(result: Any?, error: String?) {
    val promise = cardPromise ?: return
    cardPromise = null
    main.removeCallbacks(cardTimeout)
    readerActivity?.let { try { NfcAdapter.getDefaultAdapter(it)?.disableReaderMode(it) } catch (_: Exception) {} }
    readerActivity = null
    if (error == null) promise.resolve(result) else promise.reject("NFC", error, null)
  }
  private fun cancelAll() {
    finishVoice(null, "음성 인식을 취소했어요.")
    finishCard(null, "카드 읽기를 취소했어요.")
  }
}
