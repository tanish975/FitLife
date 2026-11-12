
## What’s included — v1.0.34

- **Reduced text density across all screens** — replaced descriptive paragraphs with icons, visual badges, sparse labels, and compact typography throughout FitnessHomeScreen, DashboardScreen, WorkoutsScreen, MealsScreen, ProgressScreen, ProfileScreen, SettingsScreen, and OnboardingScreen. UI/UX-centric design, not a text-based readable manual.

## What’s included

- **Exercise library:** 221 exercises, including 130 additions across major muscle groups, stabilizers and cardio, while retaining the original 91 exercise entries, logs and favorites. Filter by target and equipment, search, and log timed holds.
- **Movement previews:** a first stage of 30 original 2D exercise-specific illustrations: 28 moving demonstrations and two still positions for holds. The remaining 191 exercises retain their written cues. Playback can be paused, includes manual positions and respects reduced-motion settings. These simplified illustrations have not been professionally reviewed for correct form and are not personalized coaching.
- **Water reminders:** schedule up to 12 selected daily times, or every one or two hours within a same-day window. Existing single-time settings keep their time and enabled status. Reminders are local to the account on that device; Android may delay or suppress them.
- **Safety and data:** the earlier Phase 0A improvements include age-appropriate nutrition guidance, more careful food and chart handling, and a sequential cloud-device-cap guard. See the source notes for scope and limitations.

## Important testing limitations

This release has not been tested on a physical Android phone or emulator. In-place update, Google sign-in, live Firebase rules, Health Connect, sensors, notification permission/delivery, reboot, Android Back and TalkBack still need real-device verification. Chromium `file:` reload tests were intermittent, including one failed GitHub Actions run; the test harness now uses a disk-backed profile, but the cause was not fully isolated. Passing simulated tests does not prove real-device data persistence. Back up before trying the update. For more detail and the starred-repository review, see `MOTION-WATER-NOTES.md` and `mobile/research/RELEVANT-STARS.md` in the source.
