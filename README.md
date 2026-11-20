[![English](https://img.shields.io/badge/README-English-24292f?style=for-the-badge)](./README.md) [![한국어](https://img.shields.io/badge/README-%ED%95%9C%EA%B5%AD%EC%96%B4-24292f?style=for-the-badge)](./README.ko.md)

# SUBJECT:JAPAN

[![Download Android test APK](https://img.shields.io/badge/Android-Download%20APK-2EA44F?style=for-the-badge&logo=android&logoColor=white)](https://github.com/homesweetlove/Subject-Japan/releases/download/android-test-43793915298/Subject-Japan-android-test-arm64.apk) [![View releases](https://img.shields.io/badge/GitHub-All%20Releases-24292F?style=for-the-badge&logo=github&logoColor=white)](https://github.com/homesweetlove/Subject-Japan/releases)

> **Latest Android test APK (November 16, 2026):** ARM64-only standalone preview built from commit `7aca1c8`. Download the APK above and install it on a compatible Android device. This is **test-signed**, not a production/Play Store release; real-device translation, camera, microphone and NFC validation is still required. No iPhone installable package is provided. [Release details and SHA-256](docs/release-status.md).

## User problem and motivation

Finding a shopping phrase and typing the same clothing sizes repeatedly is difficult during a conversation in a Japanese store. This app keeps sizes and authored phrases available locally, including when connectivity is poor. The central flow is **save sizes → choose a shopping phrase → show Japanese → favorite it for reuse after restart**. Free-text translation requires a dedicated native build and downloaded on-device models.

The architecture keeps shared React Native screens/domain logic behind provider interfaces with local Swift/Kotlin modules. Android Room and iOS AsyncStorage share the existing v1 JSON contract. Local phrase packs favor predictable offline behavior; general translation adds model downloads and device-specific constraints. This pass stays on Expo SDK 57 compatible patches rather than introducing a major SDK migration.

**Verification update (November 16, 2026):** The latest `main` Quality workflow passed at `7dbbe4a`, Android/iOS simulator native builds passed at `4c45919`, and the latest standalone ARM64 test APK was built successfully from `7aca1c8`. The later `main` commit changes only an E2E test assertion, not app runtime code. Earlier billing/runner limitations described in the [October 22 audit](docs/quality-audit.md) are historical. Automated checks are **not physical-device acceptance tests**; see [current release status](docs/release-status.md) and the [device checklist](docs/device-validation.md).

**2026-11-05 fact refresh:** emergency numbers (JNTO hotline 050-3816-2787, Korean embassy and consulate after-hours lines, new Yokohama and Kobe consulates), transit pass prices (Tokyo Subway Ticket ¥1,000/¥1,500/¥2,000, Osaka Amazing Pass ¥3,500), taxi tariffs (Tokyo 2026-04-20, Osaka 2025-11-05, Fukuoka), ATM and travel-card notes, coupon end dates, the 2026 power-bank rule and the ¥3,000 departure tax were re-checked against official sources.

A Japan travel utility app for Korean travelers, targeting both Android and iPhone. Its first feature is **shopping phrases that remember your translations and personal sizes**.

## Implementation and verification status

The feature list below describes **implemented source code and supported UI paths**, not a claim that every feature has passed physical-device testing. Android and iOS native bridges exist for ML Kit translation, camera OCR, offline speech recognition and FeliCa reading; their runtime support depends on the device, OS, model availability, permissions and app signing. Expo Go and web support a reduced feature set.

**Still required before calling the iPhone version production-ready:** a signed iPhone build, bidirectional offline-translation checks, camera and microphone tests, Apple NFC Tag Reading entitlement verification, genuine Suica/PASMO/ICOCA scans (including cards with fewer than 20 usable records), and notification tests. The November 16 CI did compile Android and an iOS simulator app, but signed iPhone distribution and physical-device checks remain outstanding. See [native validation checklist](docs/device-validation.md).

## Features implemented in source

- Today (Home): current Japan time, current temperature + 3-day forecast for the selected city (Japan Meteorological Agency/JMA, free for commercial use with attribution), next-schedule and airport-last-train countdowns, exchange rate and transit-card balance, plus shortcuts to translation, emergency SOS, restaurant cards, and coupons
- Local last-train / schedule notifications (native app): notifications 30 minutes before and at the saved last-train departure time, and 30 minutes / 1 hour / 2 hours before an itinerary item. These are scheduled locally on the device with no server or push token, and reservation numbers, notes, and addresses are intentionally omitted from lock-screen notifications

- Camera/photo translation: Japanese/Korean OCR → edit → on-device translation (photos are not uploaded)
- Voice conversation: on-device speech recognition → original-text confirmation → translation → system TTS, with bidirectional conversation history
- Read physical Suica/PASMO/ICOCA cards by NFC, keep the latest balance and up to 20 transaction records, manage names for up to 20 cards, and show KRW conversion
- Card wallet: scan static QR codes and barcodes from photos or the camera, or enter a membership number or HTTPS link. Up to 40 cards stay on the device. Static codes do not replace dynamic QR codes or merchant authentication
- Optional Japan shopping size estimates alongside original profile sizes; always verify actual brand sizing
- On-demand coupon-source freshness checks from an external status service; coupons remain browsable offline, and status does not guarantee redemption
- PAY & finance helpers:
  - Optional reference exchange-rate refresh (off by default; refreshes rates older than 6 hours when PAY opens), manual exchange rate, JPY↔KRW conversions from entered/fetched rates
  - Sequential discount / tax-free / later-refund / fee / cashback calculator
  - New tax-free guide (refund method from 2026-11-01): old vs new comparison, hand-drawn shop → customs kiosk → refund illustrations, airport order, cases with no refund, Japanese phrases to show staff, Japan Tourism Agency, JNTO and Japan Customs (Korean) links
  - Per departure airport: customs kiosk locations, cash refund machines and official guides (Kansai, Haneda, Narita, Chubu, Fukuoka, New Chitose, Naha), a link to Narita's official live security waiting times, and an "arrive by" estimate from flight time, receipt count, busy hours and holidays (no airport publishes customs kiosk queues)
  - Shop refund methods (only what shops announced, with check dates), a "do not open in Japan" mark on consumable receipts, and a Today card with refunds due and the nearest 90-day deadline
  - Tax-free receipts & customs-limit tracker: per-receipt method (old/new) and tax rate (10%/8%), expected refund, 90-day deadline and refund status, same-store same-day ¥5,000 (tax-excluded) check, and Korea's $800 entry allowance with alcohol (2 L / $400 total; the 2-bottle rule ended on 2025-03-21), tobacco (200), and perfume (100 ml), using the fetched dollar rate, plus a rough entry-tax estimate above $800 (20% general rate, 30% self-declaration discount up to 200,000 won, 40% penalty if undeclared)
  - Coin-wallet optimizer: calculates a smart cash payment combination that minimizes received coins
  - Android-only on-device OCR suggests yen amounts from price tags and receipts; users choose candidates explicitly and no receipt is saved automatically
  - Warikan (split-bill) calculator: per-person JPY/KRW share plus rounding up/down to the nearest ¥100
  - Japan ATM fee & travel-card withdrawal guide for Travelog, Travel Wallet, and Toss
  - Korea/Japan clothing & shoe-size comparison table (Korean mm/size ↔ Japanese cm/size ↔ US/EU)
- 20 TRIP utilities:
  - Directions, taxis and train status: enter a destination once → Google Maps transit/walking directions, Uber opened with the drop-off filled in (Uber shows its fare estimate), a Japanese destination card for taxi drivers, quick picks from itinerary places and the departure airport, live Kanto/Kansai and JR West service status
  - Today: Japanese public holidays (2026–2027) today or tomorrow, JMA earthquakes of intensity 3+ in the last 24 hours (automatic once a weather city is chosen, otherwise on tap)
  - Spending log (yen, category, cash/card, memo) with daily, total and category sums and won conversion; departure entered once with a Today countdown, airport arrival target and reminders the evening before and an hour before airport arrival
  - Essential restaurant phrases and order cards such as “no wasabi,” with full-screen card mode
  - Otoshi (お通し / table charge) calculator by party size and guidance on whether refusal is possible
  - Japanese sentence generator and display card for food allergies and disliked ingredients
  - Ramen preference builder that generates an order sheet for noodle firmness, soup richness, garlic amount, etc.
  - Transit-pass vs Suica/IC break-even calculator for passes such as Tokyo Subway 24/48/72-hour tickets and Osaka Amazing Pass
  - Shinkansen oversized-baggage guidance for luggage over 160 cm requiring advance reservation, including penalty guidance
  - Tokyo & Osaka subway line symbol/color reference with major stops
  - Japan taxi fare estimator with 20% late-night surcharge and automatic-door etiquette
  - Japan street-waste sorting guide, including vending-machine recycling-bin cautions
  - Onsen/sento bathing etiquette and tattoo-policy guidance
  - Shrine/temple temizuya hand-washing and 2 bows / 2 claps / 1 bow worship sequence
  - Hotel/ryokan etiquette, yukata collar direction (left side over right), and Japanese luggage-storage phrases
  - 100V voltage compatibility checker for universal-voltage vs 220V-only devices such as hair dryers
  - Visit Japan Web (VJW) registration checklist and offline screenshot tips
  - Emergency guide for eSIM/roaming data failures in Japan
  - JSON backup of personal trip data (clipboard automatically cleared after 1 minute) with validation before restore
  - Emergency SOS & support guide: one-tap police (110), ambulance/fire (119), #7119, Korean consular call center, embassy/consulate emergency contacts, full-screen emergency Japanese cards, and earthquake-response guidance
  - Shopping & packing checklist with drugstore/Don Quijote recommendations and quick view of saved top/bottom/shoe sizes
  - Airport last-train timer & real-time JST clock for six airports across Tokyo, Osaka, Fukuoka, Sapporo, and Nagoya, synchronized to Japan Standard Time (UTC+9)
  - Up to 200 itinerary/reservation/note entries with completion, edit/delete, and map links
  - J-pop/local-concert ticketing guide covering overseas applications, lottery/first-come sales, payment deadlines, ticket pickup, entry checklist, and Japanese help phrases

**Last-train times are not collected automatically.** This is a countdown for times you verify from the official timetable and enter manually. It does not reflect real-time suspensions/delays or decide whether you can catch a flight. In the native app, enabling notifications schedules local notifications 30 minutes before and at the saved station departure time (Android power saving can delay them by a few minutes). See [Travel feature design and sources](docs/travel.md).

Example: save top size `44` → Size/Stock → “Do you also have this in size 44?” → `この商品の44サイズはありますか？`

The coupon catalog includes Bic Camera/Kojima, Edion, Sugi Pharmacy, Satsudora, Hankyu Guest/VIP, Mitsukoshi Isetan, and six existing benefits. It does not attempt to cover every foreign-visitor coupon in Japan or guarantee real-time updates. General consumer app coupons may require meeting Japanese service registration/issuance conditions. Actual coupon codes/QRs open from official websites/apps; the app stores Korean summaries of conditions. See [sources and update policy](docs/coupons.md).

**There is no account server or login.** The current sign-up experience is only local profile onboarding. Even if authentication is added later, size and translation history should not be uploaded to an account without separate consent. Because sizing differs by brand and country, sizes are not automatically converted. Include units where necessary, such as `24 cm` or `28 inch`.

## Technology

React Native + Expo SDK 57 + TypeScript. Shared UI/domain code is combined with Expo local modules that bridge Swift/Kotlin native APIs. The project is not designed around Expo Go only because camera, voice, and NFC need native support. Minimum iOS target is currently 16.4; Android target follows Expo SDK defaults.

| Runtime | Support |
| --- | --- |
| Dedicated Android/iOS build | General-text on-device translation + all local features |
| Expo Go | Built-in phrase packs, sizes, coupons, last-train tools, guides (AsyncStorage) |
| Web | Built-in phrase packs, sizes, coupons, last-train tools, guides (browser storage) |

The web/Expo Go builds do not pretend arbitrary text was translated when that feature is unavailable. They show guidance to use the dedicated app instead.

## Run

### Download Android Test APK

Download the [November 16 Android test APK](https://github.com/homesweetlove/Subject-Japan/releases/download/android-test-43793915298/Subject-Japan-android-test-arm64.apk) from [GitHub Releases](https://github.com/homesweetlove/Subject-Japan/releases). It targets ARM64 Android devices and runs without a development server or Expo Go. The installed app name is **Subject Japan Test**. The first time you use free-form translation, connect to Wi-Fi to download the translation models.

The test-only package `com.subjectjapan.app.preview` keeps its data separate from the production app. The APK uses Expo template test signing and is not a Play Store distribution. Signing key files are not stored in the repository or release. Future test APKs can also be generated from GitHub Actions using **Android test APK → Run workflow**; the workflow verifies bundle inclusion, signature, and package ID, then publishes the APK and SHA-256 to a GitHub prerelease.

Use Node.js 22.13 or newer (validated with Node 24) and npm.

```sh
npm ci
npm run web          # browser preview
npm start            # Expo development server
npm run android      # Android SDK/JDK environment: native build and run
npm run ios          # macOS + Xcode + CocoaPods: native build and run
```

Native-module changes require a rebuild. Android Studio/emulator or USB device is needed for Android, and an iOS simulator/device is needed for iOS. Deploying to a physical iOS device requires Apple signing.

### Installing Translation Models

1. Open the translation screen in the dedicated native app.
2. Connect to Wi-Fi and tap `Download`. Korean and Japanese models are each tens of megabytes and the first install may take some time.
3. After the app shows `Offline translation ready`, use free-form translation.
4. Once installed, the models work without internet. Built-in travel phrases do not require model installation.

Model downloads are triggered only by an explicit button and are not allowed over cellular data. ML Kit may use English as an intermediate language for non-English pairs such as Korean↔Japanese, so translation quality has limits. Before release, real travel phrases should be reviewed with native Japanese speakers.

No API key, Firebase project, or paid translation API is required. Apple Translation is also under consideration, but ML Kit is currently used for consistent Android/iOS behavior and OS support. A future cloud provider can be added through a `TranslationProvider` implementation; its keys should be kept on a separate server and never embedded in the app.

### EAS Build (Optional)

`eas.json` contains development/preview/production profiles. Run these only in an environment where Expo account/project linkage and signing information are prepared. No account identifiers or certificates are stored in this repository.

```sh
npx eas-cli build --platform android --profile preview
npx eas-cli build --platform ios --profile development
```

## Project Structure

```text
App.tsx                           app shell, tabs, profile entry, serialized state changes
src/domain/models.ts              language/profile/translation/stored-data types
src/features/translation/         translation UI, input validation, provider contract, platform adapters
src/features/phrases/             bidirectional phrase packs by situation, local size substitution
src/features/profile/             first-run onboarding and user page
src/features/coupons/             official-benefit catalog, filters/date checks, list/detail screens
src/features/trip/                airport routes, JST countdowns, itinerary/reservation management
src/features/cards/               FeliCa record validation/parsing, multi-card management
src/features/membership/          local membership codes and barcode rendering
src/features/pay/                 exchange-rate/discount/tax-free/refund/cashback calculations
src/features/tools/               OCR/voice/NFC native adapters
src/features/guides/              concert/guest-VIP guidance, packing checklist
src/storage/                      versioned local storage, validation, history/favorite policy, backup restore
src/ui/                           design system: theme tokens (plain white/blue palette), shared ScreenHeader/SubNav/Card/Button
modules/subject-translator/       ML Kit Swift/Kotlin Expo module
modules/subject-local-store/      Android Room local DB and Expo bridge
modules/subject-travel/           Android ML Kit / Apple Vision OCR, speech recognition, NFC
tests/                            provider-boundary/size/storage unit tests
e2e/                              real browser user-flow tests
.github/workflows/                quality checks and Android/iOS native compilation
docs/                             privacy and extension plans
```

The flow is UI → `translateText` → `TranslationProvider` → native adapter. Built-in phrase packs are handled locally before any external provider call. Providers receive only the sentence and language pair, not the profile object. Size phrases are also handled with local templates.

`android/` and `ios/` are excluded from Git because they are generated by `expo prebuild`. Native changes must live in `modules/` or Expo config plugins.

## Validation

```sh
npm run typecheck
npm test
npx expo-doctor
npm run build:bundles             # Android/iOS JS bundles and web output
npx playwright install chromium
npm run test:e2e                  # after build:bundles or build:web
```

`expo export` does not replace Swift/Kotlin compilation. The GitHub Actions Native builds workflow compiles an Android debug APK and an iOS simulator app. Native iOS compilation cannot be performed locally on Windows. Real model download, airplane-mode translation, and device clipboard behavior are checked separately with the [device validation checklist](docs/device-validation.md).

The **Native builds** workflow checks Android/iOS compilation (its debug Android APK needs a development server). The separate **Android test APK** workflow builds and publishes a standalone, test-signed ARM64 APK with a checksum; it is not a production-signed release. For future changes to app code, trigger that workflow again and update the README download link after the new release succeeds. [Release guidance](docs/release-status.md).

Quality checks run for every code change; native compilation runs for module/plugin/app-config/dependency changes. If CI workflows themselves change or full native revalidation is required, run Native builds manually.

## Privacy and Security

Profiles, sizes, history, transit cards, exchange rates, itineraries, benefits, last-train entries, and checklists are stored only on the device. Android dedicated builds use a Room 2.8.5 database and automatically migrate validated existing AsyncStorage data. iOS, Expo Go, and web use AsyncStorage implementations of the same storage contract. There is no self-hosted server, login, advertising, or analytics SDK. Android backup and iOS AsyncStorage backup are disabled. The storage layer is not an encrypted vault, so do not use it for passwords or payment information. See [privacy design](docs/privacy.md) and [third-party notices](THIRD_PARTY_NOTICES.md).

`.env*`, certificates, keystores, and platform-service configuration are excluded by `.gitignore`. Expo `EXPO_PUBLIC_*` values are public bundle values and must not contain secrets.

The build tool `xcode` indirectly depends on `uuid`; the project pins CommonJS-compatible `uuid` 11.1.1 to address security advisory GHSA-w5hq-g745-h8pq. CI verifies the v4 calls and project generation used by `xcode`. Remove the override when the upstream package resolves it.

## License

Project-authored source code is available under the [MIT License](LICENSE), copyright © 2026 homesweetlove. Dependencies, third-party content and official information sources retain their own terms; see [Third-party notices](THIRD_PARTY_NOTICES.md).

## Next Steps / External Dependencies

Existing features are connected across five tabs (cards and coupons share one). Hardware/external-data dependencies include:

- NFC: read-only physical FeliCa cards. Reading/recharging/paying with the same phone's Wallet card is not supported. iPhone distribution signing requires the NFC Tag Reading capability. A station-name database is not included.
- Photos: Android uses bundled ML Kit Japanese/Korean OCR; iOS uses Vision. Handwriting, vertical text, and tiny receipt text can be recognized incorrectly, so users can edit before translation.
- Voice: Android 12+ and an on-device recognition service are required; iOS requires language-specific `supportsOnDeviceRecognition`. If unavailable, the app does not fall back to server recognition. TTS uses the device system voice service.
- Politeness: 23 prewritten phrase-pack entries provide three expression levels. ML Kit free-form translation has no tone-control API, so arbitrary politeness conversion is not supported.
- Nearby coupons: candidates come from stores registered in OpenStreetMap. With user consent, searches send coordinates rounded to about 100 m to Overpass and do not guarantee coupon eligibility at a branch. Complete coupon collection/automatic refresh is not provided.
- Last train: verified-time manual-entry model. Real-time operation and automatic last-train search require a separate timetable provider. Native-app local notifications work while the app is closed; web/browser does not support them.
- Payments: reference calculations only and do not guarantee store authorization or card-billing amounts. The app explains the November 1, 2026 refund method with Japan Tourism Agency sources; refund methods, fees and timing depend on each shop or refund company.

Feature usage, limitations, and official sources are documented in [device feature guidance](docs/device-features.md).
See [architecture/extension plan](docs/architecture.md) for detailed design.

Official references: [Expo local modules](https://docs.expo.dev/modules/get-started/), [ML Kit translation](https://developers.google.com/ml-kit/language/translation), [Android](https://developers.google.com/ml-kit/language/translation/android), [iOS](https://developers.google.com/ml-kit/language/translation/ios).

