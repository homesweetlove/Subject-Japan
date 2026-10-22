Pod::Spec.new do |s|
  s.name = 'SubjectTravel'
  s.version = '1.0.0'
  s.summary = 'Local OCR, speech recognition and FeliCa for Subject Japan'
  s.description = s.summary
  s.author = 'Subject Japan'
  s.homepage = 'https://github.com/homesweetlove/Subject-Japan'
  s.platforms = { :ios => '16.4' }
  s.source = { git: 'https://github.com/homesweetlove/Subject-Japan.git' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks = 'Vision', 'Speech', 'AVFoundation', 'CoreNFC', 'ImageIO'
  s.source_files = '**/*.swift'
end
