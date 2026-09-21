Pod::Spec.new do |s|
  s.name           = 'SubjectTranslator'
  s.version        = '1.0.0'
  s.summary        = 'Subject Japan on-device Korean/Japanese translation'
  s.description   = 'Local Expo bridge to Google ML Kit. No translation API credentials.'
  s.author         = 'Subject Japan'
  s.homepage       = 'https://github.com/homesweetlove/Subject-Japan'
  s.platforms      = {
    :ios => '16.4'
  }
  s.source         = { git: 'https://github.com/homesweetlove/Subject-Japan.git' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.dependency 'GoogleMLKit/Translate', '8.0.0'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
