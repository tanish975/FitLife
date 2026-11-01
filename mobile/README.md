# FitLife mobile app

Fitness-first, local-first workout and meal logging, progress, hydration, mood, workout-day goals, favorites, a wall-clock rest timer, customizable solid-color themes and an Android WebView app. See `DESIGN.md` and `DESIGN_NOTES.md` for the design and starred-repository research.

## Install and update

Download [FitLife.apk from the latest GitHub Release](https://github.com/tanish975/FitLife/releases/latest/download/FitLife.apk) or visit the [release page](https://github.com/tanish975/FitLife/releases/latest). Android 8.0+ is required. Open the downloaded APK and confirm installation. Android may ask you to allow your browser to install apps from that source.

When a newer version is available, the Android app can notify you on launch. You can also check in **Settings → App updates** and turn automatic checks off. Updates are not silently installed: download the new APK and confirm the update. Install over the existing app rather than uninstalling to retain local data. APKs signed with a different certificate cannot update this one in place.

`FitLife-App.html` in Releases is a self-contained offline web build. Its data is separate from the Android app. A PWA install or shareable QR requires a hosted HTTPS version.

## Accounts, local data and limitations

The source includes native Android Google sign-in and local-first cloud sync for meals, workouts, weights and moods. The first account claims existing personal device activity; other accounts remain separate. Production requires owner-reviewed, deployed Firestore rules and a real-device sign-in test; see [FIREBASE-SETUP.md](FIREBASE-SETUP.md). The browser/PWA and local-profile email entry are not verified accounts and remain local-only. Genuine phone SMS sign-in is not included under the no-payment choice.

Profile/preferences and today's water are per-device recovery copies rather than concurrently merged values. The rest timer is device-local and does not alert in the background. Cloud data is not end-to-end encrypted; local device/browser data can also be included in device backups. Sync pauses if offline or over its documented size/device limits, so retain encrypted manual backups. A forgotten backup passphrase cannot be recovered. Rule-based guidance is not generative AI or medical advice, and nutrition targets are estimates. The new Android sign-in and document picker have not yet been tested on a physical device.

## Develop, build, release

```sh
npm ci
npm run dev                         # port 3000
npm run test:native                 # local JVM update/backup-transfer tests
npm run test:cloud                  # merge/isolation and simulated native bridge
npm run build:standalone           # writes ../FitLife-App.html
ANDROID_HOME=/path/to/android-sdk bash scripts/build-apk.sh
npm run build                      # refreshes the production PWA
```

With a production preview running, `npm run test:qa` (including new feature, bridge simulation and CSP checks), `npm run test:theme`, `npm run test:updates`, `npm run test:standalone`, and `npm run test:offline` check fitness flows, the circular theme reveal, native update controls, standalone sandbox, and offline PWA behavior. Playwright/Chromium may need `npx playwright install --with-deps chromium` first. `FITLIFE_URL` and `FITLIFE_PROD_URL` choose the preview URL.

Each push to the repository's main branch can produce a signed GitHub Release once the signing secrets are configured. See [RELEASING.md](RELEASING.md) **before distributing**: it explains the signing-key backup, GitHub secrets, version numbers, privacy and update behavior. Never publish the private signing key.

### Theme reveal

Daylight/Nightfall changes expand from the selected control across the screen, using View Transitions where supported and a clipped, recolored snapshot on older WebViews with Web Animations and clip-path. If neither is supported, or reduced motion is requested in the app or OS, the switch is immediate. Based in part on the MIT-licensed Magic UI theme toggler; see `public/licenses/Magic-UI-MIT.txt`.

## Current security and account status

The optional encrypted backup uses AES-256-GCM with a unique salt and IV, and a key derived on-device with PBKDF2-SHA-256 (600,000 iterations). Your normal app database is **not** encrypted by this feature. The Android document picker can save/open only the file you select; only the encrypted envelope crosses the WebView bridge. Backup functionality has been browser-tested and its native bridge protocol simulated, but the actual Android picker has not been tested on a physical phone or emulator. See [SECURITY.md](SECURITY.md) for cloud privacy, account isolation, deployment prerequisites, deletion limits and testing status.
