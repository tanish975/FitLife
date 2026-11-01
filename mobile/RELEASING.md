# FitLife releases and Android updates

## How the release flow works

1. Changes to `mobile/` are committed and pushed to the **main** branch of `tanish975/FitLife`.
2. The **Build and release FitLife Android** GitHub Actions workflow builds from source, checks the signing certificate, runs the tests, and publishes a GitHub Release with `FitLife.apk`, `FitLife-App.html`, and `SHA256SUMS.txt`.
3. Users download the APK from [the latest release](https://github.com/tanish975/FitLife/releases/latest). The built-in Android update check can notify them about newer releases; they choose whether to open GitHub, download the APK, and confirm installation.

Android does **not** silently install APKs. Users must approve the update and, if Android asks, allow the browser to install apps. They should install **over** the existing FitLife installation; uninstalling can erase local fitness data.

Every successful push to `main` (including documentation changes) creates a new stable release. The GitHub Actions page shows build failures; a failed build does not replace the previous release. A manually triggered workflow from the main branch also creates a new release. Jobs are serialized; if multiple commits queue up, GitHub may replace older pending runs with the newest one.

## Version numbers

The workflow uses `versionCode = github.run_number + 2`, `versionName = 1.0.<versionCode>`, and tag `v<versionName>`. The current locally shared APK is versionCode 2, so the first workflow release is normally `v1.0.3` / versionCode 3 and can be detected as an update to it. The Android updater compares the numeric versionCode encoded in the final tag component and accepts only a stable release with a fully uploaded, non-empty `FitLife.apk`.

Do not delete or rename the workflow without planning how to keep the versionCode increasing. The monotonicity guard checks all published stable tags that follow the FitLife version format, and fails closed if it cannot query GitHub. If an APK was released under another tag format or outside GitHub, compare its versionCode yourself. Adjust the offset (`+ 2`) in the workflow so its **next** run code is higher than every previously distributed APK. Rerunning a successful release does not replace an existing tag; push another commit instead.

## Keep the signing key safe

Android requires the **same application ID and signing certificate** for updates. This project uses package `com.tanish.fitlife` and verifies the SHA-256 certificate in `android/signing-cert.sha256`. The two existing private-key files are not committed to Git and must never appear in a public repository or release:

- `mobile/.signing/development-key.pk8` — private PKCS#8 key. **Secret; never publish.**
- `mobile/.signing/development-cert.pem` — certificate.

Although originally generated for local development, this existing key is retained to allow the previously shared FitLife APK to update in place. Its security depends on keeping the private key confidential. Make a separate, secure offline backup before relying on releases. GitHub Actions secrets cannot be read back after saving; losing the key prevents in-place updates to installations signed with it. Changing the key means older installations generally must be uninstalled, which may erase their local data.

### One-time GitHub setup

In the repository, open **Settings → Secrets and variables → Actions → New repository secret** and create these repository secrets:

- `FITLIFE_SIGNING_KEY_PK8_BASE64` — base64 of the exact PKCS#8 private-key file.
- `FITLIFE_SIGNING_CERT_PEM_BASE64` — base64 of its PEM certificate.

On your own trusted computer, with the files in `mobile/.signing/`, you can produce each single-line value using:

```sh
base64 < mobile/.signing/development-key.pk8 | tr -d '\n'   # SECRET: paste only into GitHub Secrets
base64 < mobile/.signing/development-cert.pem | tr -d '\n'
```

Do not paste the private key into a commit, issue, pull request, chat, workflow log, or release. Give repository write/admin access only to trusted people: anyone able to change a release workflow can potentially misuse release secrets. The workflow fails if secrets are missing or the certificate does not match the expected fingerprint. Its temporary key files are removed at the end of the signing step.

### Offline backup on your own trusted machine

For example, create an encrypted archive and choose a long, unique passphrase. Keep both the encrypted file and the passphrase somewhere safe and separate:

```sh
tar -C mobile/.signing -cf - development-key.pk8 development-cert.pem | \
  openssl enc -aes-256-cbc -salt -pbkdf2 -iter 600000 -out FitLife-signing-backup.enc
```

Restore with `openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 -in FitLife-signing-backup.enc | tar -xvf -`, then verify the certificate fingerprint with `openssl x509 -in development-cert.pem -noout -fingerprint -sha256`. Do not commit the backup or its passphrase.

## Local release build

Install Java 17, Node 20, Android SDK platform 35 and build-tools 36.0.0. The checked-in Gradle 9.3.1 wrapper verifies the distribution SHA-256. With the key in `.signing/`:

```sh
cd mobile
npm ci
npm run test:native
npm run build:standalone
npm run test:cloud
FITLIFE_VERSION_CODE=2 FITLIFE_VERSION_NAME=1.0.2 bash scripts/build-apk.sh
npm run build
```

`ANDROID_HOME` should point to the Android SDK. Alternatively set `ANDROID_BUILD_TOOLS_DIR` explicitly. Firebase Android configuration is public; signing keys remain private. Outputs are `../FitLife.apk` and `../FitLife-App.html`; they are generated and not committed. The build does not generate a replacement signing key automatically. Before distributing, choose a versionCode greater than every existing release.

The release workflow runs `npm run test:qa` against the production preview; it also runs `test:mobile`, `test:features`, and `test:security` as part of that command. Locally, start `npx vite preview --host 127.0.0.1 --port 4173` in a separate terminal and run either command from `mobile/`. The mobile checks cover optional profile-editor and Google-entry button hit targets, phone-sized layouts, simulated keyboard resizing, touch scrolling, rapid tab switching, the simulated Android Back bridge, reviewed nutrition, BMI positions, search, logging, reduced motion, and resizing in Chromium. The first-visit guide checks use a clearly marked simulated native bridge on the file: standalone; production HTTP has no bypass. This is emulation, not a substitute for testing Google sign-in, the signed APK and its keyboard on an actual phone.

## Privacy and scope

The Android app checks GitHub Releases at launch at most once every six hours by default. The request shares ordinary network metadata (including IP address) with GitHub but **does not include fitness or profile data**. Users can disable automatic checks or manually check under Settings → App updates. An initial Google sign-in requires connectivity; a valid saved native session can potentially restore offline. The standalone HTML and PWA do not perform Android APK update checks.

This source includes local-first Android Google authentication and activity sync, but owner-reviewed Firestore rules must be deployed and tested on a real device before relying on cloud data. The browser cannot perform the required native sign-in; phone SMS sign-in is not included. FitLife stores fitness data locally and it may be lost if the app is uninstalled or device storage is cleared. Android or browser backups may also include local app data depending on device settings. An optional, passphrase-encrypted manual backup is available in Settings; losing its passphrase makes that file unrecoverable. The native Android document picker and backup flow have not been tested on a physical phone or emulator. Nutrition calculations are estimates and the app is not medical advice. The Android wrapper has been built and signature-verified locally, and CI is configured to repeat those checks. Physical-device installation has not yet been verified.
