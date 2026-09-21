import ExpoModulesCore
import MLKitTranslate
import MLKitCommon

public class SubjectTranslatorModule: Module {
  public func definition() -> ModuleDefinition {
    Name("SubjectTranslator")

    AsyncFunction("isReady") { () -> Bool in
      let models = ModelManager.modelManager().downloadedTranslateModels
      return models.contains { $0.language == .korean } && models.contains { $0.language == .japanese }
    }

    AsyncFunction("prepare") { (promise: Promise) in
      let translator = Translator.translator(options: TranslatorOptions(sourceLanguage: .korean, targetLanguage: .japanese))
      let conditions = ModelDownloadConditions(allowsCellularAccess: false, allowsBackgroundDownloading: true)
      translator.downloadModelIfNeeded(with: conditions) { [translator] error in
        _ = translator // Retain the translator until its asynchronous work completes.
        if let error = error { promise.reject("MODEL_DOWNLOAD", "Wi-Fi와 저장 공간을 확인해 주세요.", error) }
        else { promise.resolve(nil) }
      }
    }

    AsyncFunction("translate") { (text: String, source: String, target: String, promise: Promise) in
      guard ["ko", "ja"].contains(source), ["ko", "ja"].contains(target), source != target,
            !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, text.utf16.count <= 2000 else {
        promise.reject("INVALID_INPUT", "번역 언어 또는 입력을 확인해 주세요.")
        return
      }
      let options = TranslatorOptions(sourceLanguage: source == "ko" ? .korean : .japanese,
                                      targetLanguage: target == "ko" ? .korean : .japanese)
      let translator = Translator.translator(options: options)
      translator.translate(text) { [translator] translated, error in
        _ = translator
        if let error = error { promise.reject("TRANSLATION", "번역팩 설치 상태를 확인해 주세요.", error) }
        else if let translated = translated { promise.resolve(translated) }
        else { promise.reject("TRANSLATION", "번역 결과가 없어요.") }
      }
    }
  }
}
