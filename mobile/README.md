# FitLife mobile app

Fitness-first, local-first workout and meal logging, steps, hydration, mood, weekly plans, optional local reminders, encrypted backup and natural solid-color themes in an Android app. See `DESIGN.md` and `DESIGN_NOTES.md` for the design and starred-repository research.

## Install and update

Download [FitLife.apk from the latest GitHub Release](https://github.com/tanish975/FitLife/releases/latest/download/FitLife.apk) or visit the [release page](https://github.com/tanish975/FitLife/releases/latest). Android 8.0+ is required. Open the downloaded APK and confirm installation. Android may ask you to allow your browser to install apps from that source.

When a newer version is available, the Android app can notify you on launch. You can also check in **Settings → App updates** and turn automatic checks off. Updates are not silently installed: download the new APK and confirm the update. Install over the existing app rather than uninstalling to retain local data. APKs signed with a different certificate cannot update this one in place.

`FitLife-App.html` in Releases is a self-contained build, but this version requires native Android Google sign-in and cannot enter a new account in a browser or PWA. Previously saved browser data is separate from Android and is not automatically transferred; export an encrypted backup from the older version before upgrading if you need it. A PWA install or shareable QR requires a hosted HTTPS version.

## Workouts, meals and navigation

The exercise catalog contains 221 movements: 91 retained originals plus 130 additions. Seventy-four require no equipment, and seven session ideas can be run in guided mode with cues and a rest countdown. Filter by target and equipment, save favorites, log work, and see your last session. Thirty specific exercises now have original illustrated previews (28 moving, two static holds), also available in guided sessions where applicable. They are simplified, not professionally verified or a substitute for personal coaching; other exercises retain written cues and do not receive generic mismatched animations. Reduced motion uses manual positions. New timed holds log seconds; older clients may label those as reps. New strength additions leave energy unestimated, while cardio estimates are generic. These figures are not measured expenditure or medical advice.

The small built-in food catalog is an approximation, not a complete or brand-verified database. Meals record the amount eaten, calories, protein, carbohydrate, fat and fiber; sugar, sodium and a source/note can be supplied optionally. Unknown values are not zero: unknown or ambiguous quick-add foods require the user to enter their nutrition details before saving. Catalog entries can be reviewed and edited. Favorite real meals and use “Log again” to review a proportionally adjusted portion before saving. Vitamins, most minerals and allergens are not tracked, so do not rely on the app for allergy safety or complete nutrition. Food values vary with brand, recipe and preparation; consult a reliable label or source.

The Android Back bridge closes an open sheet or confirmation, returns through screens and recently selected tabs, and exits from Home. The WebView/React boundary is covered by simulated tests, but system gestures and keyboard behavior still need verification on a physical Android device. Saved legacy appearance preferences remain readable; navigation is always frosted glass where supported, with a solid/reduced-transparency fallback.

## Steps and reminders

From **Home → Daily steps**, optionally connect Health Connect, start the phone sensor, or use both. Physical activity permission and an ongoing foreground service are needed for the phone sensor; the hardware may be absent, Android may hide the service notification if notifications are blocked, and interrupted tracking may undercount. Health Connect may need installation and grants only step-reading access. Health Connect aggregates its sources; FitLife selects one observation for a day and **never adds overlapping phone/Health Connect or device totals**. Readings are estimates, not a guarantee of complete or clinically accurate steps.

Health Connect reflects data from the whole Android user profile, potentially including other apps. To reduce cross-account exposure, the first FitLife account that connects it is bound to that Android profile; a later FitLife account must use the phone sensor or a separate Android profile. For any given day the account must stay connected from local midnight to the reading; the first day can therefore have no Health Connect reading. Uninstalling/clearing app data removes the local binding. Daily step observations sync to the FitLife account only while the app is open and sync succeeds; source history is subject to the cloud size/device limits below.

**Settings → Reminders** can schedule one daily workout alert and water alerts at up to twelve distinct times, every hour, or every two hours within a chosen same-day window. An existing single daily water reminder keeps its time and enabled status on upgrade. Reminders use free, on-device inexact Android alarms, not a paid push/SMS service; notification permission is needed, and battery restrictions or a force-stopped app can delay or prevent delivery. Missed water slots are not replayed; an alert more than an hour late, or outside its interval window, is skipped. Sign-out cancels active alarms; preferences are account-partitioned on this phone and restored when that account signs in again. Reminder settings and an in-progress guided session are not synced or included in the encrypted backup. **Settings → Larger text** increases text size and **Reduce motion** makes transitions immediate. The app also respects the device's reduced-motion preference when exposed by WebView.

## Accounts, local data and limitations

The Android app requires Google sign-in before Home; the initial sign-in needs an internet connection. Firebase may restore a valid existing native session while offline. The first Google account claims and merges existing unclaimed personal activity on that device; other accounts remain separate. Untouched sample history is not treated as a new user’s data; existing local sample rows are kept on device but excluded from cloud sync. Production requires owner-reviewed, deployed Firestore rules and a real-device sign-in test; see [FIREBASE-SETUP.md](FIREBASE-SETUP.md). The browser/PWA cannot perform this native sign-in. Genuine phone SMS sign-in is not included under the no-payment choice.

Short, skippable guides appear on each area’s first visit, starting with Home. They introduce step sources, guided workouts, weekly plans, favorite/repeated meals, sync and backup, reminders, larger text and reduced motion. Use Next to browse, Skip to dismiss, or Show me to jump to a feature; **Settings → Review app tips** reopens any guide on request. Guide completion is stored per account and union-synced when cloud access works. If another device is offline or has not synced yet, a tip can reappear there. Existing users who have visited an area are not forced through its guide again. Profile setup is optional; BMI, calorie targets and weight-based estimates are withheld until the required real inputs are provided.

Profile, most preferences and today's water are per-device recovery copies rather than concurrently merged values. On a new device, choices made locally while the first cloud read is pending take precedence over an older recovery copy; untouched fields can still be recovered. Daily step observations, favorite meals, weekly plan slots and guide completion merge between devices; step observations are selected, never summed. The rest timer is device-local and does not alert in the background. Cloud data is not end-to-end encrypted; local device/browser data can also be included in device backups. Sync pauses if offline or over its documented size/device limits, so retain encrypted manual backups. A forgotten backup passphrase cannot be recovered. Rule-based guidance is not generative AI or medical advice, and nutrition targets are estimates. Google sign-in, cloud sync, the document picker, phone sensor, Health Connect, notifications, TalkBack and Android Back have not yet been verified on a physical device.

## Develop, build, release

```sh
npm ci
npm run dev                         # port 3000
npm run test:native                 # JVM release/backup/step tests (Android test doubles)
npm run test:cloud                  # merge/isolation and simulated native bridge
npm run test:guides                 # Google entry and contextual guides (simulated native bridge)
npm run test:personal               # step/guided/plan/reminder/sync simulation
npm run test:accessibility          # automated axe, keyboard focus and horizontal fit
npm run test:motion                 # motion, interruption, reduced-motion and focus (simulated)
npm run test:nutrition              # food, navigation and mobile regressions (preview required)
npm run build:standalone           # writes ../FitLife-App.html
ANDROID_HOME=/path/to/android-sdk bash scripts/build-apk.sh
npm run build                      # refreshes the production PWA
```

With a production preview running, `npm run test:qa` (including guides, feature, bridge simulation and CSP checks), `npm run test:theme`, `npm run test:updates`, `npm run test:standalone`, and `npm run test:offline` check fitness flows, the circular theme reveal, native update controls, standalone sandbox, and offline PWA behavior. Playwright/Chromium may need `npx playwright install --with-deps chromium` first. `FITLIFE_URL` and `FITLIFE_PROD_URL` choose the web preview URL; native-session tests use the built file: standalone and an explicitly simulated bridge (`FITLIFE_NATIVE_URL` can override it). Motion/recovery persistence tests use a disk-backed Chromium profile, because an in-memory `file:` context intermittently started a reload with completely empty storage before app scripts executed. They never repopulate FitLife data, and neither setup proves Android WebView persistence.

Each push to the repository's main branch can produce a signed GitHub Release once the signing secrets are configured. See [RELEASING.md](RELEASING.md) **before distributing**: it explains the signing-key backup, GitHub secrets, version numbers, privacy and update behavior. Never publish the private signing key.

### Motion and theme reveal

Short transitions signal navigation, pressed controls, sheet openings, step history and guided workout phases. Progress fills use interruptible transforms; step and nutrition counters interpolate actual changes with the MIT-licensed Anime.js engine and render their initial values immediately. Keyboard navigation and sheet actions are kept immediate. No ongoing decorative animation runs after loading. Settings and the device preference can reduce motion, while labels and control states stay visible without it. Real Android WebView performance and TalkBack behavior still require on-device testing.

Daylight/Nightfall changes expand from the selected control across the screen, using View Transitions where supported and a clipped, recolored snapshot on older WebViews with Web Animations and clip-path. If neither is supported, or reduced motion is requested in the app or OS, the switch is immediate. Based in part on the MIT-licensed Magic UI theme toggler. Notices are in `public/licenses/Magic-UI-MIT.txt`, `public/licenses/AnimeJS-MIT.txt` and the standalone HTML.

## Current security and account status

The optional encrypted backup uses AES-256-GCM with a unique salt and IV, and a key derived on-device with PBKDF2-SHA-256 (600,000 iterations). Your normal app database is **not** encrypted by this feature. The Android document picker can save/open only the file you select; only the encrypted envelope crosses the WebView bridge. Backup functionality has been browser-tested and its native bridge protocol simulated, but the actual Android picker has not been tested on a physical phone or emulator. See [SECURITY.md](SECURITY.md) for cloud privacy, account isolation, deployment prerequisites, deletion limits and testing status.
