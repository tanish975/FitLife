# FitLife design notes

## Fitness-first direction

FitLife is a local-first fitness application, not a social-feed clone. The home screen prioritizes the day's calorie estimate, quick workout and meal logging, training, nutrition, hydration, mood, rule-based guidance and recent activity. Optional dashboard sections follow the user's widget settings. All surfaces use the five natural solid-color palettes; there are no gradients. Generated training imagery balances men and women, including a mixed-gender pair and one individual of each gender.

## Research from the public starred repositories

The public stars at `github.com/tanish975` were reviewed and saved under `research/`. Guidance was adapted rather than indiscriminately adding packages:

- [UI/UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) — fitness-dashboard hierarchy, contrast, responsive layout and touch targets.
- [Impeccable](https://github.com/pbakaus/impeccable) — task-first design, clear states, restraint and testing real renders.
- [Magic UI](https://github.com/magicuidesign/magicui) — its MIT-licensed theme toggler informed a circular, percentage-coordinate View Transition from the activated control. FitLife also includes a clipped, recolored DOM fallback for older WebViews; if neither animation API is available it switches instantly. The license is in `public/licenses/Magic-UI-MIT.txt` and embedded in the standalone app.
- [Design Motion Principles](https://github.com/kylezantos/design-motion-principles) and [Emil's Skills](https://github.com/emilkowalski/skills) — purposeful motion, reduced-motion support, safe areas and preserving zoom.
- [Agent Browser](https://github.com/vercel-labs/agent-browser) and [Playwright MCP](https://github.com/microsoft/playwright-mcp) — browser QA principles; the existing Playwright tests provide the equivalent checks without a redundant dependency.
- [Cloudflare Security Audit Skill](https://github.com/cloudflare/security-audit-skill) — privacy and security considerations. This is not a full security audit.
- [Web-to-App](https://github.com/shiaho777/web-to-app) — Android WebView, GitHub Releases update-check, source-based build and Android CI patterns. FitLife implements its own small wrapper and does not import the project as a dependency.
- [Komi Store](https://github.com/komi-store/komi-store) — update compatibility checks and signing-fingerprint validation informed the fixed release signer guard.
- [SmartTube](https://github.com/yuliskov/SmartTube) — optional in-app update checks and user-controlled installation informed the GitHub release update flow.
- [GitHub MCP Server](https://github.com/github/github-mcp-server) — considered for repository publishing; the GitHub connector is not supported here, so device authorization or manual upload is required.
- [ARTEMIS](https://github.com/google/artemis) — considered for device-level Android testing; no Android device, ADB or emulator is available in this workspace, so it could not be run.
- [Anime.js](https://github.com/juliangarnier/anime) — considered for motion; the View Transitions and Web Animations APIs implement the requested reveal without adding a second animation engine.
- [Awesome Claude Design](https://github.com/VoltAgent/awesome-claude-design) — informed keeping a practical design-token and rationale record in `DESIGN.md`.

## Limitations

The app includes explicitly labelled sample data. Firebase authentication, cloud synchronization and real social data are not connected. Sign-in is a local demo; do not enter sensitive credentials. Suggestions are local rules, not generative AI or medical advice. Calorie and nutrition targets are estimates.

The Android releases retain the prior local signing key to allow compatible updates; keep a secure offline backup and never publish the private key. Its certificate differs from an older historical APK's key, so Android cannot install it as an in-place update of that earlier package. Uninstalling the earlier package may erase locally stored data. The APK was not physically tested on an Android device.
