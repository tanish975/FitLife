# FitLife Phase 0A — historical local candidate

> Historical note for the earlier 1.0.12 candidate. Its standalone HTML hash describes that earlier build, not the movement/water build in this source tree. See MOTION-WATER-NOTES.md for the current candidate and version policy.

This is an **unpublished test candidate** based on FitLife v1.0.11, commit `0892673f9f92b007f3cf9d2e275a4c089e14189d`. It does not change the published GitHub release or production Firebase settings.

## Android candidate

- File: `FitLife-Phase0A-v1.0.12-candidate.apk`, Android versionCode 12, package `com.tanish.fitlife`, minimum Android 8.
- APK SHA-256: `daafbcee0f15efb00a9532ff9ebf5066e267d10c98a9dedc78804b3dcce6bffa`.
- Signing certificate SHA-256: `970fd3f43b63eea65d7c58d1d30c610330c0deb309fb8a4e68dbd5360ba66e93`, matching the published v1.0.11 certificate.
- The APK contains the same standalone app as `FitLife-App.html`, SHA-256 `3a2482d007f02936b26c2cfb022c81bae05bfd9c3f941689726d48ec6ce2c458`.
- VersionCode 12 is reserved for this historical candidate. The later candidates reserve 13 and 14 as well; see the current version policy in `MOTION-WATER-NOTES.md`. This describes the earlier candidate; consult the current workflow for the version policy.

**Before trying it on a phone:** create an encrypted backup from FitLife Settings and keep its passphrase safe. Install over an existing FitLife installation signed with the same certificate; do **not** uninstall to force an update, because uninstalling can erase local data. Some much older builds had a different signer and cannot be updated in place with this key. An actual install-over-update has not been tested on a phone.

## Changes

- Adult-derived calorie and macro targets, target-based coaching and weight-loss goal choices are withheld for profiles under 18. Existing saved goals and activity are retained; a saved weight-loss goal is not applied to a minor's workout template. Adults still see estimates after entering their profile.
- Adult BMI categories and adult reference ranges are withheld below age 20. A numerical BMI may still be displayed as a screening measure; no child BMI assessment is implied.
- Generic dahi, plain idlis, ambiguous oats, unspecified eggs or grilled chicken, and other unclear food matches require user-entered nutrition rather than silently mapping to a different recipe or an assumed portion. More specific entries such as “2 boiled eggs” or “150g grilled chicken breast” can still use approximate catalog values. Built-in catalog values remain approximate, and per-item sources have not yet been established. Existing logged meal values are not recalculated.
- Weight change is labeled since the first logged entry, with both dates. A single check-in is not presented as a trend. Multiple same-day check-ins are kept, with the latest plotted; editing another profile field no longer replaces an existing check-in.
- Food charts distinguish an unlogged day from a deliberately logged zero, use calendar-date spacing, label the current target as a present-day reference rather than a historical target, and include keyboard-accessible data tables. Home also identifies days with no food logs as not logged.
- A new installation pauses before creating an 11th cloud snapshot when 10 already exist. No existing snapshot is deleted or merged in that stopped case, and local data is kept; the message points to encrypted backup. This is a sequential **client-side guard**, not an atomic server quota: concurrent new installations or older clients could still exceed the cap. Safe device retirement remains future work.
- Contextual guides and offline regression tests are updated. Relevant starred repositories informed local-first preservation, clear copy, progressive disclosure and browser testing; no new paid service or dependency was added.

## Verification

The signed APK was built locally, then checked for package, version, minimum SDK, APK signature and matching embedded HTML. The full existing browser/feature/security/guide/personal/accessibility/motion QA passed, as did the new age/food/chart/device-cap regressions, simulated cloud/account-isolation checks, theme/update/standalone/offline checks, JVM native test doubles and the checked-in Firestore rules against a **local** emulator.

These checks do **not** establish real Android WebView, Google sign-in, install-over-update, phone sensors, Health Connect, notification, TalkBack or production Firebase behavior. The production Firestore rules were not inspected or changed. The app's normal cloud sync is not end-to-end encrypted. No cloud-account deletion or device-retirement flow was added.

## Source

The companion source ZIP contains the complete project and the new `npm run test:phase0` tests, without signing keys, installed dependencies or generated build directories. `mobile/research/RELEVANT-STARS.md` explains how relevant starred repositories informed this phase. The original dirty local repository was not reset or overwritten.
