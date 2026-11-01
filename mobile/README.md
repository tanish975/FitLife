# FitLife mobile app

Fitness-first, local-first workout and meal logging, progress, hydration, mood, customizable solid-color themes and an Android WebView app. See `DESIGN.md` and `DESIGN_NOTES.md` for the design and starred-repository research.

## Install and update

Download [FitLife.apk from the latest GitHub Release](https://github.com/tanish975/FitLife/releases/latest/download/FitLife.apk) or visit the [release page](https://github.com/tanish975/FitLife/releases/latest). Android 8.0+ is required. Open the downloaded APK and confirm installation. Android may ask you to allow your browser to install apps from that source.

When a newer version is available, the Android app can notify you on launch. You can also check in **Settings → App updates** and turn automatic checks off. Updates are not silently installed: download the new APK and confirm the update. Install over the existing app rather than uninstalling to retain local data. APKs signed with a different certificate cannot update this one in place.

`FitLife-App.html` in Releases is a self-contained offline web build. Its data is separate from the Android app. A PWA install or shareable QR requires a hosted HTTPS version.

## Local data and limitations

The opening screen offers a quick demo with labelled sample activity, or a local profile and onboarding. This is not real authentication: emails are not verified and Firebase/cloud synchronization is not connected. Data stays on the device where storage is available and is not synchronized or backed up. Rule-based guidance is not generative AI or medical advice; nutrition and calorie targets are estimates. Suggested workout loads begin at zero or the user's own previous entry. The Android wrapper has not yet been tested on a physical device.

## Develop, build, release

```sh
npm ci
npm run dev                         # port 3000
npm run test:native                # local JVM update-parser tests
npm run build:standalone           # writes ../FitLife-App.html
ANDROID_HOME=/path/to/android-sdk bash scripts/build-apk.sh
npm run build                      # refreshes the production PWA
```

With a production preview running, `npm run test:qa`, `npm run test:theme`, `npm run test:updates`, `npm run test:standalone`, and `npm run test:offline` check fitness flows, the circular theme reveal, native update controls, standalone sandbox, and offline PWA behavior. Playwright/Chromium may need `npx playwright install --with-deps chromium` first. `FITLIFE_URL` and `FITLIFE_PROD_URL` choose the preview URL.

Each push to the repository's main branch can produce a signed GitHub Release once the signing secrets are configured. See [RELEASING.md](RELEASING.md) **before distributing**: it explains the signing-key backup, GitHub secrets, version numbers, privacy and update behavior. Never publish the private signing key.

### Theme reveal

Daylight/Nightfall changes expand from the selected control across the screen, using View Transitions where supported and a clipped, recolored snapshot on older WebViews with Web Animations and clip-path. If neither is supported, or reduced motion is requested in the app or OS, the switch is immediate. Based in part on the MIT-licensed Magic UI theme toggler; see `public/licenses/Magic-UI-MIT.txt`.
