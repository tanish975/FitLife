# FitLife movement previews & water schedules

This source builds on the Phase 0A and exercise-expansion candidates; existing original exercise IDs, logs and favorites are retained. It has not been tested on a physical phone. For an actual public build's version, source commit and SHA-256, use the corresponding GitHub Release and its `SHA256SUMS.txt`.

## Android and the earlier local candidate

- Package `com.tanish.fitlife`; Android 8.0+. The release workflow verifies the APK version, expected signing certificate and embedded standalone HTML.
- The earlier, locally shared `FitLife-Motion-Water-v1.0.14-candidate.apk` used versionName `1.0.14`, versionCode `14` and SHA-256 `a1d31197721a3535e0881611a555f1788440a3c764cdc1b32e44901fdfa8608e`. Its embedded standalone HTML SHA-256 was `db87425060f53e2b54684eceb70c40e9b5949ebe2bc69c884e6bc808091e11b3`. These hashes describe that historical candidate, not a later CI build.
- Before testing, create an encrypted backup in FitLife and keep its passphrase safe. Install the APK **over** the existing compatible signed app; do not uninstall or clear app data. The actual in-place upgrade is not tested on hardware. Older APKs signed with another key cannot be updated in place.
- Local candidates used codes 12, 13 and 14. The release workflow reserves those values; public builds use code **15 or higher**. See `mobile/RELEASING.md` for version and signing policy.

## Illustrated movements: first stage

- The 221-exercise catalog is preserved. **30 specific exercises** now have original 2D previews: **28 moving illustrations and two still illustrations for isometric holds**. See `FitLife-Motion-Exercise-List.md` for the exact coverage. Remaining exercises continue to show their written cues and a clear “preview coming later” message rather than an unrelated illustration.
- The figure has start/movement position controls and a play/pause button. The guided session includes a collapsible preview when its current exercise has one. Motion pauses when the card is offscreen or the page is hidden. Reduced-motion settings disable autoplay and offer manual positions.
- These are simplified illustrations authored for FitLife; **they have not been professionally reviewed for exercise technique** and are not individualized coaching or medical advice. People differ in mobility and fitness. Stop for pain and consult a qualified professional when appropriate. Higher-risk loaded work benefits from supervision and appropriate safeties. Expert review on real devices is recommended before broad distribution.
- All artwork is embedded and works offline; it introduces no camera, motion-capture model, external GIF service, new paid feature or third-party exercise-art license. Two original character styles are used equally across the 30 previews; prior balanced photography is retained. All new surfaces use solid colors.

## Water reminders

- **Settings → Reminders → Water** offers up to 12 different daily times, or every one/two hours inside an editable same-day start/end window. A preset fills 11:00, 15:00 and 19:00; it does not turn reminders on by itself.
- A legacy one-time water reminder is read as one specific time, retaining its enabled status. An upgrade does **not** turn on extra notifications. Changes require an explicit save/turn-on action. Turning water off keeps the last saved schedule rather than unsaved edits.
- Workout reminders remain separate. Notification permission is requested only when enabling an alert. Schedules are local to the signed-in account on this phone, are cancelled on sign-out, and are restored on sign-in/boot/time-zone or clock changes where Android permits. They do not sync to other devices and are not in the encrypted backup.
- The implementation uses one next **inexact** local Android alarm, no paid push/SMS service or exact-alarm permission. Android can delay or prevent delivery because of Doze, notification settings, force-stop, power-off or manufacturer restrictions. Missed slots are not replayed; water alerts over an hour late, after an interval window, or on a different local day are skipped. Times are approximate, not guaranteed.

## Verification and remaining work

- The Android code compiled and the release APK passed package, version, signer and embedded-HTML checks.
- Browser and unit regressions passed for the earlier Phase 0A changes, all 91 originals and 130 additions, exercise discovery/logging, cloud and account simulations, accessible layouts and theme behavior. New tests cover exact animation mappings, 30 bounded pose sequences, hold handling, reduced motion, play/pause, offscreen suspension, guided previews, legacy water migration, hourly/two-hour/multiple-time schedules, validation, double taps, denied permission and account isolation. JVM tests cover native schedule calculations, old-record migration, DST, stale alerts and account-partitioned ledger writes.
- Chromium `file:` offline and exercise-reload checks were intermittent: a GitHub Actions run and a local run observed the account-owner key missing **before application startup**, even after the actual account write was observed. The restart suites now use temporary, disk-backed Chromium profiles and assert the account slot before app startup; the QA helper carries only fake bridge keys, never FitLife data. Repeated runs passed with this harness, but the original intermittent mechanism was not isolated. This does **not** establish real WebView durability; review on actual Android remains essential.
- No real device/emulator was available. Real notification permission, delivery timing, reboot, clock/time-zone changes, Doze/force-stop, Android Back/TalkBack, Google sign-in, deployed Firebase rules, in-place upgrade and professional movement-form review remain unverified.

## Source and builds

GitHub source archives contain source, not private signing keys or generated build products. Regenerate the Git-ignored standalone HTML with `cd mobile && npm ci && npm run build:standalone`. The earlier local candidate's companion patch was against v1.0.11 commit `0892673f9f92b007f3cf9d2e275a4c089e14189d`. Never add private signing material to source control.

## References and starred repositories

Implementation and fit decisions for the user's starred projects are recorded in `mobile/research/RELEVANT-STARS.md`. The existing MIT-licensed Anime.js package is used for cancellable pose playback; other candidate animation/mocap projects were assessed rather than added without need or a proper asset/consent basis.

Exercise-form references informed the simplified cues, including [ACE's bodyweight squat](https://www.acefitness.org/resources/everyone/exercise-library/135/bodyweight-squat/) and [UCLH's home strength guidance](https://www.uclh.nhs.uk/patients-and-visitors/patient-information-pages/home-exercises-improve-strength-and-balance-following-hospital-admission). The illustrations are original and are not copies of those sources. Android scheduling limitations follow [Android's alarm guidance](https://developer.android.com/develop/background-work/services/alarms) and [exact-alarm changes](https://developer.android.com/about/versions/14/changes/schedule-exact-alarms).
