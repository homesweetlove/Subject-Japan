package expo.modules.subjecttranslator

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import com.google.mlkit.common.model.RemoteModelManager
import com.google.mlkit.common.model.DownloadConditions
import com.google.mlkit.nl.translate.TranslateLanguage
import com.google.mlkit.nl.translate.TranslateRemoteModel
import com.google.mlkit.nl.translate.Translation
import com.google.mlkit.nl.translate.Translator
import com.google.mlkit.nl.translate.TranslatorOptions

class SubjectTranslatorModule : Module() {
  private val lock = Any()
  private var destroyed = false
  private val operations = mutableMapOf<Translator, Promise>()

  // Own each client until its task completes, including failures, cancellation,
  // synchronous setup errors and bridge teardown.
  private fun begin(source: String, target: String, promise: Promise): Translator? = synchronized(lock) {
    if (destroyed) {
      promise.reject("CANCELLED", "번역 요청을 취소했어요.", null)
      null
    } else {
      try {
        Translation.getClient(TranslatorOptions.Builder().setSourceLanguage(source).setTargetLanguage(target).build())
          .also { operations[it] = promise }
      } catch (error: Exception) {
        promise.reject("TRANSLATION", "기기 내 번역을 시작하지 못했어요.", error)
        null
      }
    }
  }

  private fun finish(client: Translator, action: (Promise) -> Unit) {
    val promise = synchronized(lock) { operations.remove(client) } ?: return
    try { client.close() } catch (_: Exception) {}
    action(promise)
  }

  private fun ready(models: Set<TranslateRemoteModel>): Boolean =
    models.map { it.language }.containsAll(listOf(TranslateLanguage.KOREAN, TranslateLanguage.JAPANESE))

  override fun definition() = ModuleDefinition {
    Name("SubjectTranslator")

    AsyncFunction("isReady") { promise: Promise ->
      RemoteModelManager.getInstance().getDownloadedModels(TranslateRemoteModel::class.java)
        .addOnCompleteListener { task ->
          if (task.isSuccessful) promise.resolve(ready(task.result))
          else promise.reject("MODEL_STATUS", "번역팩 상태를 확인하지 못했어요.", task.exception)
        }
    }

    AsyncFunction("prepare") { promise: Promise ->
      val client = begin(TranslateLanguage.KOREAN, TranslateLanguage.JAPANESE, promise)
      if (client != null) {
        try {
          client.downloadModelIfNeeded(DownloadConditions.Builder().requireWifi().build())
            .addOnCompleteListener { task -> finish(client) {
              if (task.isSuccessful) it.resolve(null)
              else it.reject("MODEL_DOWNLOAD", "Wi-Fi와 저장 공간을 확인해 주세요.", task.exception)
            } }
        } catch (error: Exception) {
          finish(client) { it.reject("MODEL_DOWNLOAD", "Wi-Fi와 저장 공간을 확인해 주세요.", error) }
        }
      }
    }

    AsyncFunction("translate") { text: String, source: String, target: String, promise: Promise ->
      if (source !in listOf("ko", "ja") || target !in listOf("ko", "ja") || source == target || text.isBlank() || text.length > 2000) {
        promise.reject("INVALID_INPUT", "번역 언어 또는 입력을 확인해 주세요.", null)
      } else {
        // Never download models from a translation request or fall back to a
        // network recognizer. Check readiness inside the native bridge as well.
        RemoteModelManager.getInstance().getDownloadedModels(TranslateRemoteModel::class.java)
          .addOnCompleteListener { status ->
            if (!status.isSuccessful) {
              promise.reject("MODEL_STATUS", "번역팩 상태를 확인하지 못했어요.", status.exception)
            } else if (!ready(status.result)) {
              promise.reject("MODEL_MISSING", "먼저 한국어·일본어 번역팩을 다운로드해 주세요.", null)
            } else {
              val client = begin(source, target, promise)
              if (client != null) {
                try {
                  client.translate(text).addOnCompleteListener { task -> finish(client) {
                    if (task.isSuccessful && !task.result.isNullOrBlank()) it.resolve(task.result)
                    else it.reject("TRANSLATION", "번역 결과가 없어요. 번역팩 설치 상태를 확인해 주세요.", task.exception)
                  } }
                } catch (error: Exception) {
                  finish(client) { it.reject("TRANSLATION", "번역팩 설치 상태를 확인해 주세요.", error) }
                }
              }
            }
          }
      }
    }

    OnDestroy {
      val pending = synchronized(lock) {
        destroyed = true
        operations.toList().also { operations.clear() }
      }
      pending.forEach { (client, promise) ->
        try { client.close() } catch (_: Exception) {}
        promise.reject("CANCELLED", "번역 요청을 취소했어요.", null)
      }
    }
  }
}
