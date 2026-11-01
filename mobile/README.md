# FitLife mobile app

Fitness-first, local-first workout and meal logging, progress, hydration, mood, workout-day goals, favorites, a wall-clock rest timer, customizable solid-color themes and an Android WebView app. See `DESIGN.md` and `DESIGN_NOTES.md` for the design and starred-repository research.

## Install and update

Download [FitLife.apk from the latest GitHub Release](https://github.com/tanish975/FitLife/releases/latest/download/FitLife.apk) or visit the [release page](https://github.com/tanish975/FitLife/releases/latest). Android 8.0+ is required. Open the downloaded APK and confirm installation. Android may ask you to allow your browser to install apps from that source.

When a newer version is available, the Android app can notify you on launch. You can also check in **Settings → App updates** and turn automatic checks off. Updates are not silently installed: download the new APK and confirm the update. Install over the existing app rather than uninstalling to retain local data. APKs signed with a different certificate cannot update this one in place.

`FitLife-App.html` in Releases is a self-contained build, but this version requires native Android Google sign-in and cannot enter a new account in a browser or PWA. Previously saved browser data is separate from Android and is not automatically transferred; export an encrypted backup from the older version before upgrading if you need it. A PWA install or shareable QR requires a hosted HTTPS version.

## Workouts, meals and navigation

The exercise catalog contains 90 individual movements across eight muscle groups, including 30 additional at-home movements that need no equipment. The home shortcut shows all 39 bodyweight choices; three home and three other optional session ideas are curated lists, not timed coaching. Filter by equipment, save favorites, adjust sets/rest/load, and see your last recorded session. For timed cardio the energy estimate uses a generic MET assumption, weight and duration (including resting energy); other exercise estimates are rough placeholders. These figures are not measured expenditure or medical advice.

The small built-in food catalog is an approximation, not a complete or brand-verified database. Meals record the amount eaten, calories, protein, carbohydrate, fat and fiber; sugar, sodium and a source/note can be supplied optionally. Unknown values are not zero: unknown or ambiguous quick-add foods require the user to enter their nutrition details before saving. Catalog entries can be reviewed and edited. Vitamins, most minerals and allergens are not tracked, so do not rely on the app for allergy safety or complete nutrition. Food values vary with brand, recipe and preparation; consult a reliable label or source.

The Android Back bridge closes an open sheet or confirmation, returns through screens and recently selected tabs, and exits from Home. The WebView/React boundary is covered by simulated tests, but system gestures and keyboard behavior still need verification on a physical Android device. Saved legacy appearance preferences remain readable; navigation is always frosted glass where supported, with a solid/reduced-transparency fallback.

## Accounts, local data and limitations

The Android app requires Google sign-in before Home; the initial sign-in needs an internet connection. Firebase may restore a valid existing native session while offline. The first Google account claims and merges existing unclaimed personal activity on that device; other accounts remain separate. Untouched sample history is not treated as a new user’s data; existing local sample rows are kept on device but excluded from cloud sync. Production requires owner-reviewed, deployed Firestore rules and a real-device sign-in test; see [FIREBASE-SETUP.md](FIREBASE-SETUP.md). The browser/PWA cannot perform this native sign-in. Genuine phone SMS sign-in is not included under the no-payment choice.

Short, skippable guides appear on each area’s first visit, starting with Home; **Settings → Review app tips** reopens them only on request. Guide completion is stored per account and union-synced when cloud access works. If another device is offline or has not synced yet, a tip can reappear there. Existing pre-guide profiles are not forced through the new-user tips. Profile setup is optional; BMI, calorie targets and weight-based estimates are withheld until the required real inputs are provided.

Profile/preferences and today's water are per-device recovery copies rather than concurrently merged values (guide completion is the exception). The rest timer is device-local and does not alert in the background. Cloud data is not end-to-end encrypted; local device/browser data can also be included in device backups. Sync pauses if offline or over its documented size/device limits, so retain encrypted manual backups. A forgotten backup passphrase cannot be recovered. Rule-based guidance is not generative AI or medical advice, and nutrition targets are estimates. The new Android sign-in and document picker have not yet been tested on a physical device.

## Develop, build, release

```sh
npm ci
npm run dev                         # port 3000
npm run test:native                 # local JVM update/backup-transfer tests
npm run test:cloud                  # merge/isolation and simulated native bridge
npm run test:guides                 # Google entry and contextual guides (simulated native bridge)
npm run test:nutrition              # food, navigation and mobile regressions (preview required)
npm run build:standalone           # writes ../FitLife-App.html
ANDROID_HOME=/path/to/android-sdk bash scripts/build-apk.sh
npm run build                      # refreshes the production PWA
```

With a production preview running, `npm run test:qa` (including guides, feature, bridge simulation and CSP checks), `npm run test:theme`, `npm run test:updates`, `npm run test:standalone`, and `npm run test:offline` check fitness flows, the circular theme reveal, native update controls, standalone sandbox, and offline PWA behavior. Playwright/Chromium may need `npx playwright install --with-deps chromium` first. `FITLIFE_URL` and `FITLIFE_PROD_URL` choose the web preview URL; native-session tests use the built file: standalone and an explicitly simulated bridge (`FITLIFE_NATIVE_URL` can override it).

Each push to the repository's main branch can produce a signed GitHub Release once the signing secrets are configured. See [RELEASING.md](RELEASING.md) **before distributing**: it explains the signing-key backup, GitHub secrets, version numbers, privacy and update behavior. Never publish the private signing key.

### Theme reveal

Daylight/Nightfall changes expand from the selected control across the screen, using View Transitions where supported and a clipped, recolored snapshot on older WebViews with Web Animations and clip-path. If neither is supported, or reduced motion is requested in the app or OS, the switch is immediate. Based in part on the MIT-licensed Magic UI theme toggler; see `public/licenses/Magic-UI-MIT.txt`.

## Current security and account status

The optional encrypted backup uses AES-256-GCM with a unique salt and IV, and a key derived on-device with PBKDF2-SHA-256 (600,000 iterations). Your normal app database is **not** encrypted by this feature. The Android document picker can save/open only the file you select; only the encrypted envelope crosses the WebView bridge. Backup functionality has been browser-tested and its native bridge protocol simulated, but the actual Android picker has not been tested on a physical phone or emulator. See [SECURITY.md](SECURITY.md) for cloud privacy, account isolation, deployment prerequisites, deletion limits and testing status.
