# Release status / 릴리스 현황

Last checked: **2026-11-16 (KST)** · Source commit: [`457bf4cd4099dcb832ae51e55f27730f037d300c`](https://github.com/homesweetlove/Subject-Japan/commit/457bf4cd4099dcb832ae51e55f27730f037d300c)

## Current downloadable build / 현재 설치 파일

- **Android ARM64 test APK:** [Subject-Japan-android-test-arm64.apk](https://github.com/homesweetlove/Subject-Japan/releases/download/android-test-43784286541/Subject-Japan-android-test-arm64.apk)
- **Release and installation notes:** [android-test-43784286541](https://github.com/homesweetlove/Subject-Japan/releases/tag/android-test-43784286541)
- **SHA-256 file:** [SHA256SUMS.txt](https://github.com/homesweetlove/Subject-Japan/releases/download/android-test-43784286541/SHA256SUMS.txt)
- **Package:** `com.subjectjapan.app.preview`, installed name *Subject Japan Test*.
- **Signing:** Expo template test signing. This is a standalone APK (no development server required), **not** a production-signed or Play Store release.

Download the APK, verify the checksum if desired, then install it on a compatible ARM64 Android device. Depending on Android settings, installation from the chosen download source may require explicit user permission. First-time free-form translation requires an explicit model download over Wi-Fi.

## CI evidence / 자동 검사 근거

| Workflow | Status (2026-11-16) | Scope |
| --- | --- | --- |
| [Quality](https://github.com/homesweetlove/Subject-Japan/actions/runs/43784286549) | Passed | TypeScript, unit tests, Expo Doctor, JS bundles and browser E2E |
| [Native builds](https://github.com/homesweetlove/Subject-Japan/actions/runs/43784286531) | Passed | Android compilation and unsigned iOS **simulator** compilation |
| [Android test APK](https://github.com/homesweetlove/Subject-Japan/actions/runs/43784286541) | Passed | Standalone ARM64 test APK build, package/signature checks and prerelease upload |

No physical-device validation, signed iPhone build, NFC entitlement acceptance or final store submission is implied by these results. The [device checklist](device-validation.md) tracks remaining checks.

## Before a production release / 정식 출시 전

1. Verify Korean↔Japanese offline model downloads, OCR, microphone, NFC/FeliCa (including cards with fewer than 20 history records), notifications and backup/restore on actual supported devices.
2. Use a **private and persistent release signing key** (or appropriate store-managed signing); never commit keys or passwords. The test-signed preview has a separate package identifier and is not a production update.
3. Review bundled third-party licenses/attributions, official travel-information dates and device permissions.
4. Publish a versioned production build only after passing the relevant checks.

The Android test APK workflow is **manual** or runs when its own workflow configuration changes; source changes alone do not automatically refresh the APK release. When a new test build succeeds, update the direct README download link and this status document. Preserve older releases as historical test builds rather than silently replacing them.
