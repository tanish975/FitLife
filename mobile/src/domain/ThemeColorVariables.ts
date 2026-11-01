import type { ThemeColors } from './ThemePalettes';

// The same solid-color tokens are used by the live app and the older-WebView
// fallback layer. Keeping one map prevents the two appearances drifting apart.
const COLOR_VARIABLES: ReadonlyArray<readonly [string, keyof ThemeColors]> = [
  ['--bg-outer', 'bgOuter'],
  ['--bg-base', 'bgBase'],
  ['--bg-card', 'bgCard'],
  ['--bg-hero', 'bgHero'],
  ['--bg-recessed', 'bgRecessed'],
  ['--border-subtle', 'borderSubtle'],
  ['--border-strong', 'borderStrong'],
  ['--text-primary', 'textPrimary'],
  ['--text-secondary', 'textSecondary'],
  ['--text-muted', 'textMuted'],
  ['--text-on-accent', 'textOnAccent'],
  ['--accent-primary', 'accentPrimary'],
  ['--accent-primary-hover', 'accentPrimaryHover'],
  ['--accent-primary-text', 'accentPrimaryText'],
  ['--accent-primary-soft', 'accentPrimarySoft'],
  ['--accent-secondary', 'accentSecondary'],
  ['--accent-secondary-text', 'accentSecondaryText'],
  ['--accent-secondary-soft', 'accentSecondarySoft'],
  ['--accent-warm', 'accentWarm'],
  ['--accent-warm-text', 'accentWarmText'],
  ['--accent-warm-soft', 'accentWarmSoft'],
  ['--accent-cool', 'accentCool'],
  ['--accent-cool-text', 'accentCoolText'],
  ['--accent-cool-soft', 'accentCoolSoft'],
];

export function applyThemeColorVariables(element: HTMLElement, colors: ThemeColors) {
  for (const [variable, key] of COLOR_VARIABLES) element.style.setProperty(variable, colors[key]);
}
