# FitLife — fitness app for Android

[![Download latest Android APK](https://img.shields.io/badge/Download-Latest%20Android%20APK-347a55?style=for-the-badge)](https://github.com/tanish975/FitLife/releases/latest/download/FitLife.apk)
[![Latest release](https://img.shields.io/github/v/release/tanish975/FitLife?label=Latest%20release&color=347a55)](https://github.com/tanish975/FitLife/releases/latest)

Fitness, nutrition and progress in one local-first app. Log workouts and meals, track water and mood, and customize the interface with natural solid-color palettes. The Android app supports Android **8.0 and newer**.

## Install on Android

1. Open the [latest release](https://github.com/tanish975/FitLife/releases/latest) on your Android phone and download **FitLife.apk**.
2. Open the downloaded file. If Android asks, allow your browser to install apps from that source, then confirm **Install**.
3. Open FitLife and sign in with Google. The first sign-in needs an internet connection. Existing unclaimed activity on the device is kept and merged into the first Google account. Profile details are optional.

To update later, download the new APK and confirm **Update** over the existing app. Do **not** uninstall first: uninstalling can erase locally stored fitness data. The app can check GitHub for new releases on launch; automatic checks can be disabled and manual checks are available in **Settings → App updates**. Android requires your approval to install an update; updates are not silent.

[All versions and release notes](https://github.com/tanish975/FitLife/releases) · [Standalone HTML download](https://github.com/tanish975/FitLife/releases/latest/download/FitLife-App.html)

> **Current limitations:** Google sign-in, production cloud access, sensors, Health Connect, reminders and the Android wrapper have not yet been verified on a physical phone. Cloud sync covers meals, workouts, weights, moods, step observations, favorite meals and weekly plans when properly configured; it is not end-to-end encrypted. Use encrypted manual backups as well. Calorie estimates are not medical advice. The browser/standalone build cannot perform the required native Android Google sign-in; old browser data does not automatically transfer to Android.

Short, skippable guides appear when you first visit Home and each other area. You can review them later in **Settings → Review app tips**. FitLife uses short, purposeful transitions; **Settings → Reduce motion** makes them immediate and **Larger text** improves readability.

## For maintainers

The new mobile app lives in [`mobile/`](mobile/README.md). Every successful push to `main` runs tests and publishes a versioned GitHub Release, provided the signing secrets are configured. **Back up the signing key securely and never commit it.** See [mobile/RELEASING.md](mobile/RELEASING.md) for setup, versioning, key safety and troubleshooting.

## Previous project, preserved

The existing Prime React project remains at the repository root and is unchanged. Its previous README follows:

---

# Prime - Personal Health & Consistency Coach

Prime is a premium personal fitness assistant built with React. It helps users track their health vitals, nutrition, and workouts with a modern, AI-inspired interface.

## ✨ Features
- **Smart Dashboard**: Comprehensive view of health metrics.
- **Health Profile**: BMI/BMR calculation and AI suggestions.
- **Calorie Tracker**: Log meals and track daily intake.
- **Workout Planner**: Context-aware exercise recommendations and progress tracking.

## 🚀 Quick Start
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the application:
   ```bash
   npm start
   ```

## 📖 Documentation
Detailed documentation including technology stack, directory structure, and features can be found in [DOCUMENTATION.md](./DOCUMENTATION.md).

## 🛠️ Build
To create a production build:
```bash
npm run build
```
