> Historical v1.0.13 exercise-expansion notes. This source now also contains the later local motion/water candidate; see `MOTION-WATER-NOTES.md`.

# FitLife exercise expansion — local candidate

This builds on the unpublished Phase 0A candidate and includes its safety fixes. It is not a GitHub release and does not change production Firebase.

## Candidate and installation

- `FitLife-Exercises-v1.0.13-candidate.apk`: package `com.tanish.fitlife`, Android versionCode 13 / versionName 1.0.13, Android 8+.
- APK SHA-256: `ca185f6adfe3f49e7f0d3caff43dffea5ce045a93f4b2a52c5ff62989e987b64`.
- The signer matches published v1.0.11 and the prior local v1.0.12 candidate: certificate SHA-256 `970fd3f43b63eea65d7c58d1d30c610330c0deb309fb8a4e68dbd5360ba66e93`.
- Embedded standalone HTML SHA-256: `aa6eccef90f6967abb0b81eb1ace5ffa36bbe04facd6e1a093e3894fd1373475`.
- **Before trying it:** create an encrypted backup in FitLife Settings and keep the passphrase safe. Install over the compatible existing app; **do not uninstall** to force installation, as that can erase local data. An actual in-place update has not been tested on a phone. Incompatible older signers cannot be upgraded in place with this key.
- At the time, versionCodes 12 and 13 were reserved for local candidates. The later movement/water candidate also reserved 14; the release workflow refuses codes 14 or lower. See `MOTION-WATER-NOTES.md` for the latest version policy.

## What changed

- The original **91 exercises** remain unchanged, including their IDs and names. **130 additional entries** bring the library to **221**. `FitLife-Exercise-List.md` is a browsable index of existing and new movements.
- New choices cover neck and traps; deltoids and rotator cuff; chest and back; biceps, triceps and forearms; abs; quadriceps, hamstrings, glutes, calves and shins; hip stabilizers; running/jogging and indoor/outdoor cycling. Repeated terms such as “wall angels” and “push-up plus” search the existing equivalent instead of duplicating it.
- Use **New**, **Target**, **Equipment** and search to discover the additions. Equipment-free means no wall, bench, band, pull-up bar, towel, backpack, bike or machine. These are shown under their actual support/equipment instead; balance support may still be optional for some otherwise equipment-free exercises.
- Added a **Home back & posture** guided session. It is a flexible sequence, not a medical prescription. Earlier sessions remain available.
- New timed holds record seconds per set. Historical repetitions remain unchanged. The optional seconds tag is designed to survive existing cloud/backup formats; an older app version may display a new timed entry's value as repetitions, so update other devices when possible.
- New strength movements do not invent a calorie-burn estimate without a measured duration. Cardio minutes use the app's existing very rough generic estimate, not a measurement.
- High-skill or higher-risk entries have cautions; direct loaded neck work and complex spinal movements advise qualified supervision. A minor's exercise sheet recommends qualified adult supervision and avoiding maximal lifts. These cues are general information, not personal medical advice.
- The reference's unsecured towel/sheet/door-handle rows and tree pull-ups were not added as improvised setups. Use a suitably secure bar or purpose-made anchor. The triceps dip uses a stable bench rather than a rolling chair; bands and wall-supported movements are not labeled equipment-free.

## Verification and limits

The original 91 catalog records were compared field-for-field with the previous candidate. Automated tests covered new exercise names/IDs, target and equipment filters, search aliases, safety labels, editable seconds/minutes, legacy workout and favorite preservation, encrypted backup round-trips, and local simulated cloud persistence. The existing complete browser, mobile-layout, feature, security, guide, accessibility, motion, Phase 0A, cloud, theme, update, standalone, offline and JVM-native-double suites passed.

The APK was locally built and verified for its package, version, Android minimum, signing certificate and matching embedded HTML. Chromium and simulated bridges are not a physical Android phone, real Google sign-in, deployed Firebase, Health Connect, TalkBack, an exercise technique review by a clinician, or an actual install-over-update test. No public commit, push, release, paid service, billing, or production Firebase change was made.

## Exercise-safety references

The descriptions were written for FitLife rather than copied from a repository. For general guidance, an NHS neck-exercise leaflet recommends gentle hand-resisted holds and stopping or seeking advice if symptoms such as dizziness, tingling or weakness occur [1](https://yourhealth.leicestershospitals.nhs.uk/library/csi/therapies/physiotherapy/1258-a-guide-for-people-with-neck-pain/file). The American Academy of Pediatrics emphasizes supervision, technique, gradual progression and avoiding maximum lifts in youth training [2](https://www.healthychildren.org/English/healthy-living/sports/Pages/Strength-Training.aspx). The app does not diagnose or determine whether a movement is suitable for an individual.
