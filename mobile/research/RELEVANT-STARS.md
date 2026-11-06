# Starred-repository inspiration for this iteration

The user's public starred repositories were reviewed for fit rather than imported wholesale. These relevant sources informed the implementation:

- `pbakaus/impeccable`: its [onboarding guidance](https://github.com/pbakaus/impeccable/blob/main/skill/reference/onboard.md) informed short, skippable, contextual first-visit tips, real control targets, progressive disclosure, completion persistence and explicit replay in Settings; its source was not copied or added as a dependency.
- `nextlevelbuilder/ui-ux-pro-max-skill`: informed accessible guide labels, visible keyboard focus, 44px minimum guide controls, light/dark contrast, reduced-motion behavior and mobile layouts. No code was copied.
- `magicuidesign/magicui` (MIT): existing origin-based theme reveal and accessible control patterns; retained attribution is in `public/licenses/Magic-UI-MIT.txt`.
- `emilkowalski/skills` ([animate](https://github.com/emilkowalski/skills/blob/main/skills/animate/SKILL.md), [review-animations](https://github.com/emilkowalski/skills/blob/main/skills/review-animations/SKILL.md)): applied its decision sequence to the startup state indicator: use a pre-determined CSS animation instead of a JavaScript loop, animate only transform/opacity, use its ease-in-out curve, and ship reduced-motion behavior. The tab selection indicator also uses one transform, and blur is confined to the small navigation bar with solid and reduced-transparency fallbacks.
- `kylezantos/design-motion-principles` ([accessibility](https://github.com/kylezantos/design-motion-principles/blob/main/skills/design-motion-principles/references/accessibility.md), [performance](https://github.com/kylezantos/design-motion-principles/blob/main/skills/design-motion-principles/references/performance.md)): applied the static alternative for reduced motion, a small animation footprint, and transform/opacity rather than layout animation. No continuous decorative motion is left running once the brief startup screen ends.
- `juliangarnier/anime` (MIT): Anime.js 4.5.0 is now used for interruptible changes to step and nutrition counters. It starts from the displayed value, cancels on interruption/unmount, honors reduced motion and adds no perpetual animation. Its MIT notice is retained in `public/licenses/AnimeJS-MIT.txt` and the standalone HTML.
- `cloudflare/security-audit-skill` and `google/skills`: guided trust-boundary, auth, data-isolation, lifecycle and release review; the starred `google/skills` Firebase basics/Android setup references were checked alongside official Credential Manager and Firebase Auth documentation. This is not an independent security audit. Firestore rules were exercised in an isolated local emulator.
- `microsoft/playwright-mcp` and `vercel-labs/agent-browser`: browser-driven regression mindset. Playwright directly tests UI, persistence, CSP and offline behavior.
- `google/artemis`: assessed for real Android automation; it requires an Android device/emulator unavailable in this workspace, so no device test is claimed.
- `shiaho777/web-to-app` and existing Android project context: keep the asset origin and package stable; use the system picker for user-selected files. Actual Android picker testing remains outstanding.
- `supabase/supabase`: considered as a no-cost account option, but phone login still requires an SMS provider, and switching backend would not remove Google OAuth or user data isolation requirements. It was not added merely because it was starred.

The dumbbell mark and lifting kettlebell loader are original, lightweight SVG/CSS; exercise photography remains balanced between men and women. The loader replaces the earlier runner, remains legible without animation, and does not prolong startup. The small blurred navigation layer, transform-only selection, reduced-motion fallback, and simulated Back/nutrition tests apply the relevant motion, UI and testing guidance without importing a large animation library. No gradient combination was introduced. Other starred repositories not relevant to the above requirements were intentionally not bundled.

## Current simplification and personal features

- `pbakaus/impeccable` distill/clarify/onboard references informed the smaller first view, the collapsible secondary material, clear permission states and progressive workout/meal details; no code was copied.
- `nextlevelbuilder/ui-ux-pro-max-skill` informed labeled step sources, focus containment, minimum touch targets, legible scales and reduced-motion behavior; the larger-text setting and phone-width browser regressions are not a substitute for real TalkBack testing.
- `microsoft/playwright-mcp` / `vercel-labs/agent-browser` informed dedicated UI regression flows for new account-bound steps, guided sets, local-reminder bridge messages, backup restore, offline recovery, account switching and no-double-counting; native APIs are deliberately mocked in these browser tests.
- `cloudflare/security-audit-skill` and `google/skills` informed the device/account trust boundary, Health Connect binding, backup and sync-failure review. No claim of an independent security audit or production-rule verification is made.
- `google/artemis` remains a candidate for subsequent real-device automation. No physical Android device or emulator was available for this iteration.

Android step and notification behavior was implemented from the official Android sensor, Health Connect and AlarmManager APIs, rather than copying a starred app or requiring a paid service. The Android source is compiled locally; on-device permission, lifecycle and background behavior remain outstanding checks.

## Motion pass

- `pbakaus/impeccable` [animate guidance](https://github.com/pbakaus/impeccable/blob/main/.claude/skills/impeccable/reference/animate.md) informed a fitness-specific focal moment (the short step-history reveal) and responsive feedback instead of repeated scroll choreography. A very small route arrival and moving tab indicator preserve continuity; sheets use portals so route motion cannot trap a fixed overlay beneath the navigation.
- `emilkowalski/skills` [animate](https://github.com/emilkowalski/skills/blob/main/skills/animate/SKILL.md) and [review-animations](https://github.com/emilkowalski/skills/blob/main/skills/review-animations/SKILL.md) informed bounded timings, transform/opacity for sheet and state entrances, interruption-friendly progress fills, and immediate keyboard navigation. Full-screen theme switching retains the specifically requested origin-based reveal.
- `kylezantos/design-motion-principles` [accessibility](https://github.com/kylezantos/design-motion-principles/blob/main/skills/design-motion-principles/references/accessibility.md) and [performance](https://github.com/kylezantos/design-motion-principles/blob/main/skills/design-motion-principles/references/performance.md) informed the static reduced-motion path, short delays, limited paint work and no persistent layer hints. The formerly looping empty-state pulse is static.
- `magicuidesign/magicui` remains the attributed basis for the existing theme reveal; `juliangarnier/anime` is used for real, cancellable counter interpolation. CSS handles the small fixed interactions without adding another animation framework. No gradients or copied Magic UI components were introduced in this pass.
- `nextlevelbuilder/ui-ux-pro-max-skill`, `microsoft/playwright-mcp` and `vercel-labs/agent-browser` informed the accessible switch, focus/Back checks, interruption and small-screen browser tests. These are simulated and cannot establish real-device fluidity, Android permission behavior or TalkBack usability.

Step ring/rest-ring stroke transitions repaint small, bounded SVG areas when their values change; fixed CSS transforms are used for the wider progress bars. The app motion override and the WebView's exposed operating-system preference independently suppress movement. Android WebView versions, low-end frame rates, TalkBack and phone gestures have not been verified on hardware.


## Phase 0A: safety and trust fixes

- `pbakaus/impeccable` informed point-of-use age, portion and missing-data explanations, plus the skippable updated guides. No code from the repository was imported.
- `blader/humanizer` informed concise, concrete user-facing warnings: the cap explains what stopped and how to make a backup, without promising recovery or deletion.
- `actualbudget/actual` informed the local-first preservation principle: pause at capacity instead of removing a potentially unique snapshot; no Actual code or service was incorporated.
- `cloudflare/security-audit-skill` informed explicit trust boundaries, offline fictional fixtures and cautious wording about client-only safeguards. This is focused implementation testing, not an independent security audit.
- `microsoft/playwright-mcp` inspired browser-driven regression checks. Existing pinned Playwright is used directly for age, food, chart, account-data and device-cap tests; Android and Firebase are simulated in those tests, not represented as real devices.
- Existing `juliangarnier/anime` and attributed `magicuidesign/magicui` behavior was preserved; no additional animation package, gradient, service, API key or paid feature was added. Other stars were evaluated for the earlier review but were not bundled where they did not address these fixes.

## Exercise expansion

- `pbakaus/impeccable` informed progressive discovery: keep the familiar broad muscle groups, then add a target filter and a clearly labeled New filter rather than replacing the workout screen or forcing an upfront flow.
- `nextlevelbuilder/ui-ux-pro-max-skill` informed labeled controls, 44px interactions, solid colors, readable safety cues and narrow-screen checks. No code was copied and no gradient was added.
- `microsoft/playwright-mcp` inspired fictional-data browser tests of discovery, real equipment labels, favorites, timed logs and simulated cloud persistence. The existing pinned Playwright is used directly; this is not a real Android test.
- `cloudflare/security-audit-skill` informed the compatibility review: retain original exercise IDs and broad persisted groups, verify old logs and backups, and use an optional seconds tag for new holds. This is not an independent security audit.
- `google/artemis` remains relevant for future physical-Android tests; no hardware was available here. No starred repository was added merely because it was starred, and no new dependency or paid service was introduced.

## Illustrated movement previews and water schedules

The 284-star snapshot was reviewed again for this task, not blindly imported. The first batch has 28 moving, original SVG illustrations and two still positions for holds; unillustrated exercises do not get a generic substitute. This is a staged implementation, not a claim that all 221 movements have a professional-quality demo.

- `juliangarnier/anime` is **actually used** to interpolate the pose progress at a capped 30 frames per second. Playback is cancellable, pausable, stops when its card is out of view or the page is hidden, and is disabled by the OS or in-app reduced-motion setting. Its existing MIT notice remains bundled; no added service or asset license is needed.
- `theatre-js/theatre` was examined for its keyframe/timeline design approach, which informed explicitly authored start/end poses and repeatable movement phases. Its editor is AGPL and its core is Apache 2.0. Bundling a second animation runtime/editor would add weight without supplying correct exercise content, so it was not imported.
- `svgdotjs/svg.js`, `opentoonz/opentoonz`, `synfig/synfig`, `pencil2d/pencil`, and `blender/blender` were considered as authoring or SVG tooling. This batch instead uses original inline vector figures and the existing Anime.js runtime, avoiding redundant animation engines, large desktop editors, gradients and new network dependencies. These tools do not themselves provide medically validated poses.
- `freemocap/freemocap`, `open-mmlab/mmpose`, `facebookresearch/VideoPose3D`, `zju3dv/EasyMocap`, `CMU-Perceptual-Computing-Lab/openpose`, and `shubham-goel/4D-Humans` can analyze human movement but require source recordings, model/license checks and careful consent; they do not provide reviewed clips for FitLife, so no camera, tracking or model telemetry was added.
- `emilkowalski/skills` and `kylezantos/design-motion-principles` informed reduced-motion/manual-position alternatives, bounded frame rate, interruptible playback and pausing offscreen. `nextlevelbuilder/ui-ux-pro-max-skill` and `pbakaus/impeccable` informed accessible labels, 44px controls and the compact reminder form.
- `microsoft/playwright-mcp` informed offline browser-driven tests for migration, permission denial, account isolation, responsive widths, playback controls and guided previews. The pinned Playwright package runs directly; bridge behavior is simulated.
- `cloudflare/security-audit-skill` and `google/skills` informed native input validation, account checks, stale-alarm suppression, cancellation, battery and reboot/time-change review. This is not an independent security audit. Official Android AlarmManager documentation informed scheduling; the free device-local alarms are deliberately inexact.
- `google/artemis` remains appropriate for a future real-phone pass. This environment has no physical phone or Android emulator, so notification, background, UI and sign-in behavior on hardware cannot be asserted.

Potential third-party exercise GIF sources with separate Gym Visual rights were not imported: an MIT code/data label alone does not grant rights to their media. A CC BY-SA frame library was also assessed, but its sample frames were inconsistent and the imagery did not match this iteration's requirements; no third-party exercise art was bundled.
