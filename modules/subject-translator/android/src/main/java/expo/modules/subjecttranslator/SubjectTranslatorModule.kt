package expo.modules.subjecttranslator

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import com.google.mlkit.common.model.RemoteModelManager
import com.google.mlkit.common.model.DownloadConditions
import com.google.mlkit.nl.translate.TranslateLanguage
import com.google.mlkit.nl.translate.TranslateRemoteModel
import com.google.mlkit.nl.translate.Translation
import com.google.mlkit.nl.translate.TranslatorOptions

class SubjectTranslatorModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("SubjectTranslator")

    AsyncFunction("isReady") { promise: Promise ->
      RemoteModelManager.getInstance().getDownloadedModels(TranslateRemoteModel::class.java)
        .addOnSuccessListener { models ->
          val languages = models.map { it.language }.toSet()
          promise.resolve(languages.containsAll(listOf(TranslateLanguage.KOREAN, TranslateLanguage.JAPANESE)))
        }
        .addOnFailureListener { promise.reject("MODEL_STATUS", "번역팩 상태를 확인하지 못했어요.", it) }
    }

    AsyncFunction("prepare") { promise: Promise ->
      val translator = Translation.getClient(TranslatorOptions.Builder()
        .setSourceLanguage(TranslateLanguage.KOREAN).setTargetLanguage(TranslateLanguage.JAPANESE).build())
      translator.downloadModelIfNeeded(DownloadConditions.Builder().requireWifi().build())
        .addOnSuccessListener { translator.close(); promise.resolve(null) }
        .addOnFailureListener { translator.close(); promise.reject("MODEL_DOWNLOAD", "Wi-Fi와 저장 공간을 확인해 주세요.", it) }
    }

    AsyncFunction("translate") { text: String, source: String, target: String, promise: Promise ->
      if (source !in listOf("ko", "ja") || target !in listOf("ko", "ja") || source == target || text.isBlank() || text.length > 2000) {
        promise.reject("INVALID_INPUT", "번역 언어 또는 입력을 확인해 주세요.", null)
      } else {
        val translator = Translation.getClient(TranslatorOptions.Builder().setSourceLanguage(source).setTargetLanguage(target).build())
        // Deliberately never starts a download or sends source text over the network.
        translator.translate(text)
          .addOnSuccessListener { translated -> translator.close(); promise.resolve(translated) }
          .addOnFailureListener { translator.close(); promise.reject("TRANSLATION", "번역팩 설치 상태를 확인해 주세요.", it) }
      }
    }
  }
}
