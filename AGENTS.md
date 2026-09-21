# Subject Japan contributor notes

- This app uses Expo SDK 57. Consult https://docs.expo.dev/versions/v57.0.0/ for version-specific APIs.
- Keep translation UI independent of the provider. Add native code in `modules/`, never generated `android/` or `ios/` directories.
- Profile, sizes, history and favorites stay local. Do not introduce uploads, analytics or cloud translation fallback without explicit product requirements.
- Do not commit secrets, credentials, certificates, `.env` files or generated build output.
- After code changes run `npm run typecheck`, `npm test`, and the relevant build/E2E checks. Native module changes require Android/iOS compilation and device verification.
- Do not present unsupported translation, NFC, camera, voice or coupon features as working.
