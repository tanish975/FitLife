# Starred-repository inspiration for this iteration

The user's public starred repositories were reviewed for fit rather than imported wholesale. These relevant sources informed the implementation:

- `magicuidesign/magicui` (MIT): existing origin-based theme reveal and accessible control patterns; retained attribution is in `public/licenses/Magic-UI-MIT.txt`.
- `emilkowalski/skills`: restrained mobile motion, touch feedback, viewport/safe-area handling and compositor-friendly transforms. The selection indicator uses one transform, and blur is confined to the small navigation bar with solid and reduced-transparency fallbacks.
- `kylezantos/design-motion-principles`: purposeful transitions rather than decorative motion; reduced-motion settings and system preference are honored.
- `juliangarnier/anime` (MIT): motion inspiration. No animation dependency or copied source was added for effects that are adequately handled by CSS.
- `cloudflare/security-audit-skill` and `google/skills`: guided trust-boundary, auth, data-isolation, lifecycle and release review; the starred `google/skills` Firebase basics/Android setup references were checked alongside official Credential Manager and Firebase Auth documentation. This is not an independent security audit. Firestore rules were exercised in an isolated local emulator.
- `microsoft/playwright-mcp` and `vercel-labs/agent-browser`: browser-driven regression mindset. Playwright directly tests UI, persistence, CSP and offline behavior.
- `google/artemis`: assessed for real Android automation; it requires an Android device/emulator unavailable in this workspace, so no device test is claimed.
- `shiaho777/web-to-app` and existing Android project context: keep the asset origin and package stable; use the system picker for user-selected files. Actual Android picker testing remains outstanding.
- `supabase/supabase`: considered as a no-cost account option, but phone login still requires an SMS provider, and switching backend would not remove Google OAuth or user data isolation requirements. It was not added merely because it was starred.

The logo is an original two-solid-color FitLife mark; exercise photography remains balanced between men and women. No gradient combination was introduced. Other starred repositories not relevant to the above requirements were intentionally not bundled.
