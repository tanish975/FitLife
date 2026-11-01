# FitLife design system

## Direction

A task-first, local-first fitness companion. The dashboard helps a person log movement and meals, check their own progress and adjust their settings. It is not a social feed. Lead with useful actions and honest state, not engagement metrics or decorative content. Demo data is labelled; estimates and local rule-based suggestions are never presented as clinical advice or generative AI.

## Color and typography

- Five nature-inspired palette pairs, implemented in `src/domain/ThemePalettes.ts`: Matcha & Oat, Coastal Eucalyptus, Terracotta & Olive, Nordic Fjord & Birch, and Kyoto Cedar & Moss. Each has Daylight and Nightfall variants.
- Use solid `--bg-*`, `--text-*` and `--accent-*` tokens. **Never add gradients.** Pair readable text tokens with their matching surfaces; interactive text and muted labels should meet 4.5:1 contrast.
- Inter for body and Poppins for headings, both self-hosted. Prioritize plain language, comfortable reading and clear numerical labels.

## Layout and components

- Mobile-first five-tab navigation: Home, Meals, Workouts, Progress and Profile. On wider screens, use a side rail and optional daily-summary aside.
- Dashboard order: greeting and overview, workout and meal actions, training, nutrition, hydration, focus categories, mood, rule-based guidance and recent activity. Honor widget visibility settings.
- Use `--radius-card` and `--radius-btn` so the shape preference is respected. Density changes the home spacing and the root text scale. Inputs are at least 16px on mobile; primary controls target 44px or more.
- Illustrations and training photography should be workout-focused and balance representation of men and women. Avoid visual effects that compete with the task.

## Interaction and accessibility

- Use brief, purposeful transitions. Honor both the in-app Minimal setting and the OS reduced-motion preference. Never disable browser zoom.
- Provide keyboard focus, names and selected/checked states. Use appropriate dialog semantics and an escape/close action.
- Confirm destructive local-data operations. Avoid invented social counts, fake authentication, false precision or unsupported health claims.
- Test on narrow and wide viewports, in both themes, across all palettes, and after logging, reload and offline use.
