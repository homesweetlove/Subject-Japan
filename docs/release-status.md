# Release status / 릴리스 현황

Last checked: **2026-11-25 (KST)** · APK source: [`86371de`](https://github.com/homesweetlove/Subject-Japan/commit/86371de69c237ba62e520d1fc64dfa5c80745a6f)

## Project and field validation / 프로젝트 및 현지 테스트

Core implementation is complete. The developer completed hands-on testing during a trip to Japan on November 21–23, 2026, then refined coupon refresh handling on November 24. This records developer-reported field testing, not a feature-by-feature device matrix or production certification.

주요 기능 구현과 개발자의 일본 현지 실사용 테스트(11월 21~23일)를 완료했습니다. 11월 24일 쿠폰 갱신 로직을 보완했습니다. 현지 테스트는 개발자 실사용 보고이며, 기능별 실기기 결과표나 정식 배포 인증을 의미하지 않습니다.

## Current downloadable build / 현재 설치 파일

- **Android ARM64 test APK:** [Subject-Japan-android-test-arm64.apk](https://github.com/homesweetlove/Subject-Japan/releases/download/android-test-45324759232/Subject-Japan-android-test-arm64.apk)
- **Release and installation notes:** [android-test-45324759232](https://github.com/homesweetlove/Subject-Japan/releases/tag/android-test-45324759232)
- **SHA-256 file:** [SHA256SUMS.txt](https://github.com/homesweetlove/Subject-Japan/releases/download/android-test-45324759232/SHA256SUMS.txt)
- **Package:** `com.subjectjapan.app.preview`, installed name *Subject Japan Test*.
- **Signing:** Expo template test signing. Standalone APK; no development server required. Not a production-signed or Play Store release.

Install on a compatible ARM64 Android device. Android may require permission to install from the selected download source. Free-form translation requires an explicit first-time model download over Wi-Fi. A signed iPhone installable package is not available.

## CI evidence / 자동 검사 근거

| Workflow | Status | Scope |
| --- | --- | --- |
| [Quality (Nov 24)](https://github.com/homesweetlove/Subject-Japan/actions/runs/45324829664) | Partial / failed | At `32b6703`: typecheck and unit tests passed; Expo Doctor failed; bundles and browser E2E skipped |
| [Android test APK (Nov 24)](https://github.com/homesweetlove/Subject-Japan/actions/runs/45324759232) | Passed | Standalone ARM64 test APK from `86371de` |
| [Screen pictures (Nov 24)](https://github.com/homesweetlove/Subject-Japan/actions/runs/45324759087) | Passed | Browser screen capture |
| [Quality (Nov 20)](https://github.com/homesweetlove/Subject-Japan/actions/runs/44662392567) | Passed | Earlier full quality workflow at `95a215a` |
| [Native builds (Nov 20)](https://github.com/homesweetlove/Subject-Japan/actions/runs/44662392535) | Passed | Android and iOS simulator compilation at `95a215a` |

The subsequent two commits after the packaged source add coupon tests. The latest Quality run is not green. No signed iPhone validation or store submission is implied. See the [device checklist](device-validation.md) for individual device checks.

## Maintenance / 유지보수

- Resolve or revalidate the latest Expo Doctor failure and rerun the complete Quality workflow.
- Keep coupon conditions and official source links current; eligibility and redemption depend on the merchant.
- For production distribution, use persistent private release signing and verify the relevant physical-device, permission, and store requirements.
- For new APKs, update README links and this document after successful build. Preserve older prereleases as historical test builds.

