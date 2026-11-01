# Firebase setup for FitLife

The Android project configuration targets `fitlife-b038b` / `com.tanish.fitlife`. Google sign-in needs an enabled Google provider, the release-signing SHA-1 registered in Firebase, a web OAuth client and an up-to-date `android/google-services.json`. Those public configuration checks passed during development; an actual Android sign-in has not yet been tested.

## Before using cloud sync

1. Confirm the project is on the no-cost Spark plan and a Cloud Firestore database exists. Free quotas apply; do not enable billing or a paid SMS provider unless you explicitly choose to.
2. Review [`firestore.rules`](firestore.rules). These rules deny client access to every other path; if the database is shared with other applications, merge access policies instead of replacing them blindly.
3. A Firebase project owner can open **Firestore Database → Rules**, paste the reviewed rules and click **Publish**. The rules file passed a local emulator, but publishing and actual authenticated access must still be verified. No service-account keys, passwords, one-time codes, or signing keys should be pasted into chat.
4. Install a release APK over the existing, identically signed FitLife app. In **Settings → Google account & cloud sync**, sign in and confirm the status says activity synced. Test two accounts and an offline/reconnect scenario on a real phone before relying on sync. Android will ask for installation/update confirmation.

Only the first account on a device claims its unclaimed local activity; later accounts are isolated. Meals, workouts, weights and moods merge; profile/preferences/today's water are per-device recovery copies rather than concurrent merged values. See [SECURITY.md](SECURITY.md) for limits, privacy, deletion behavior and backup guidance. The web/PWA build remains local-only. Real phone SMS authentication is not included in the free plan used here.
