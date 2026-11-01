/*
 * Circular view-transition technique adapted from Magic UI's animated theme
 * toggler (https://github.com/magicuidesign/magicui), copyright Magic UI,
 * MIT license. See public/licenses/Magic-UI-MIT.txt.
 *
 * The viewport-sized snapshots use percentage coordinates: pixels can be
 * misplaced at fractional display scales. The new snapshot starts clipped
 * even before its animation is ready, avoiding a flash of the new theme.
 */
import { applyThemeColorVariables } from './ThemeColorVariables';
import type { MotionStyle, ThemeColors, ThemeMode } from './ThemePalettes';

interface RevealRequest {
  origin?: HTMLElement | null;
  colors: ThemeColors;
  mode: ThemeMode;
  motion: MotionStyle;
  apply: () => void;
}

type ActiveReveal = { cancel: () => void; finish: () => void };

function circleFor(origin?: HTMLElement | null) {
  // These dimensions match the View Transition snapshot reference box, even
  // on desktops with a scrollbar. getBoundingClientRect is viewport-relative.
  const width = Math.max(1, window.innerWidth);
  const height = Math.max(1, window.innerHeight);
  const rect = origin?.isConnected ? origin.getBoundingClientRect() : null;
  const x = rect ? Math.max(0, Math.min(width, rect.left + rect.width / 2)) : width / 2;
  const y = rect ? Math.max(0, Math.min(height, rect.top + rect.height / 2)) : height / 2;
  const radius = Math.hypot(Math.max(x, width - x), Math.max(y, height - y)) * 1.025;
  // circle() resolves a percentage radius against hypot(width, height)/sqrt(2).
  const radiusPercent = radius / (Math.hypot(width, height) / Math.SQRT2) * 100;
  const center = `${(x / width) * 100}% ${(y / height) * 100}%`;
  return [`circle(0% at ${center})`, `circle(${radiusPercent}% at ${center})`] as const;
}

/**
 * Older Android WebViews may lack View Transitions. In that case a short-lived,
 * inert copy of the visible app is recolored with the next palette and revealed
 * with the same expanding circle. The real app is committed when it is covered.
 * This is not interactive and carries no event handlers or duplicate IDs.
 */
function createFallbackLayer(colors: ThemeColors, mode: ThemeMode, initialClip: string): HTMLElement | null {
  const source = document.getElementById('root');
  if (!source || typeof source.animate !== 'function' || !window.CSS?.supports('clip-path', initialClip)) return null;

  const clone = source.cloneNode(true) as HTMLElement;
  const originalNodes = [source, ...Array.from(source.querySelectorAll<HTMLElement>('*'))];
  const clonedNodes = [clone, ...Array.from(clone.querySelectorAll<HTMLElement>('*'))];
  const scrolled: Array<{ node: HTMLElement; left: number; top: number }> = [];

  for (let i = 0; i < originalNodes.length; i += 1) {
    const original = originalNodes[i];
    const copy = clonedNodes[i];
    copy.removeAttribute('id');
    if (copy.matches('a, button, input, textarea, select, [tabindex]')) copy.setAttribute('tabindex', '-1');
    if (original.scrollLeft || original.scrollTop) scrolled.push({ node: copy, left: original.scrollLeft, top: original.scrollTop });
    if (original instanceof HTMLInputElement && copy instanceof HTMLInputElement) {
      copy.value = original.value;
      copy.checked = original.checked;
    } else if (original instanceof HTMLTextAreaElement && copy instanceof HTMLTextAreaElement) {
      copy.value = original.value;
    } else if (original instanceof HTMLSelectElement && copy instanceof HTMLSelectElement) {
      copy.value = original.value;
    } else if (original instanceof HTMLCanvasElement && copy instanceof HTMLCanvasElement) {
      try { copy.getContext('2d')?.drawImage(original, 0, 0); } catch { /* Optional canvas copy. */ }
    }
  }

  // Preserve the viewport position of sticky headers/sidebars if the page is
  // scrolled. The placeholder keeps the copied document's flow unchanged.
  if (window.scrollY > 0) {
    for (const selector of ['.fitness-home-bar', '.desktop-navigation', '.wellness-aside']) {
      const original = source.querySelector<HTMLElement>(selector);
      if (!original || getComputedStyle(original).position !== 'sticky') continue;
      const rect = original.getBoundingClientRect();
      if (rect.bottom <= 0 || rect.top > 1 || rect.width === 0) continue;
      const index = originalNodes.indexOf(original);
      const copy = clonedNodes[index];
      if (!copy?.parentNode) continue;
      const placeholder = document.createElement('div');
      Object.assign(placeholder.style, { height: `${rect.height}px`, width: `${rect.width}px`, flexShrink: '0' });
      copy.replaceWith(placeholder);
      placeholder.appendChild(copy);
      Object.assign(copy.style, {
        position: 'fixed', top: `${rect.top}px`, left: `${rect.left}px`,
        width: `${rect.width}px`, height: `${rect.height}px`, boxSizing: 'border-box',
      });
    }
  }

  const layer = document.createElement('div');
  layer.dataset.fitlifeThemeFallback = 'true';
  layer.dataset.fitlifeTargetMode = mode;
  layer.setAttribute('aria-hidden', 'true');
  layer.setAttribute('inert', '');
  Object.assign(layer.style, {
    position: 'fixed', inset: '0', overflow: 'hidden', pointerEvents: 'none', zIndex: '2147483646',
    backgroundColor: colors.bgBase, color: colors.textPrimary, colorScheme: mode, clipPath: initialClip,
  });
  applyThemeColorVariables(layer, colors);
  Object.assign(clone.style, { position: 'absolute', top: `${-window.scrollY}px`, left: `${-window.scrollX}px`, width: '100%' });
  layer.appendChild(clone);
  document.body.appendChild(layer);
  for (const { node, left, top } of scrolled) { node.scrollLeft = left; node.scrollTop = top; }
  return layer;
}

/** One controller per app; a later tap interrupts the previous reveal. */
export function createThemeRevealController() {
  let active: ActiveReveal | null = null;
  let removeMotionListener = () => {};
  const root = document.documentElement;

  const stopWatchingMotion = () => {
    removeMotionListener();
    removeMotionListener = () => {};
  };
  const watchMotion = (query: MediaQueryList | undefined) => {
    if (!query) return;
    const onChange = (event: MediaQueryListEvent) => { if (event.matches) finish(); };
    if (query.addEventListener) query.addEventListener('change', onChange);
    else query.addListener(onChange);
    removeMotionListener = () => {
      if (query.removeEventListener) query.removeEventListener('change', onChange);
      else query.removeListener(onChange);
    };
  };

  const clearRoot = () => {
    delete root.dataset.fitlifeThemeReveal;
    root.style.removeProperty('--fitlife-theme-reveal-duration');
    root.style.removeProperty('--fitlife-theme-reveal-start');
  };

  const cancel = () => {
    stopWatchingMotion();
    const previous = active;
    active = null;
    previous?.cancel();
  };

  const finish = () => {
    stopWatchingMotion();
    const previous = active;
    active = null;
    previous?.finish();
  };

  const run = ({ origin, colors, mode, motion, apply }: RevealRequest) => {
    cancel();
    const systemMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (motion === 'reduced' || systemMotion?.matches || document.hidden) {
      apply();
      return;
    }

    const duration = motion === 'gentle' ? 420 : 620;
    const [from, to] = circleFor(origin);
    root.dataset.fitlifeThemeReveal = 'active';
    root.style.setProperty('--fitlife-theme-reveal-duration', `${duration}ms`);
    root.style.setProperty('--fitlife-theme-reveal-start', from);

    // A snapshot transition runs the actual React update between its old and
    // new captures. Store.apply uses flushSync and a layout effect for tokens.
    if (typeof document.startViewTransition === 'function') {
      let cancelled = false;
      let applied = false;
      let animation: Animation | null = null;
      let transition: ViewTransition;
      const update = () => {
        if (cancelled || applied) return;
        applied = true;
        apply();
      };
      try {
        transition = document.startViewTransition(update);
      } catch {
        // If the API exists but cannot start, use the fallback below.
        clearRoot();
        if (applied) return;
        root.dataset.fitlifeThemeReveal = 'active';
        root.style.setProperty('--fitlife-theme-reveal-duration', `${duration}ms`);
        root.style.setProperty('--fitlife-theme-reveal-start', from);
        transition = null as unknown as ViewTransition;
      }
      if (transition) {
        const thisReveal: ActiveReveal = {
          cancel: () => {
            cancelled = true;
            transition.skipTransition();
            animation?.cancel();
            clearRoot();
          },
          finish: () => {
            update();
            transition.skipTransition();
            animation?.cancel();
            clearRoot();
          },
        };
        active = thisReveal;
        watchMotion(systemMotion);
        transition.ready.then(() => {
          if (active !== thisReveal || cancelled) return;
          try {
            animation = root.animate(
              { clipPath: [from, to] },
              { duration, easing: 'cubic-bezier(0.4, 0, 0.6, 1)', fill: 'forwards', pseudoElement: '::view-transition-new(root)' }
            );
            animation.finished.catch(() => {});
          } catch {
            // Some engines expose the API without pseudo-element animation.
            transition.skipTransition();
          }
        }).catch(() => {});
        transition.finished.then(() => {
          if (active !== thisReveal) return;
          active = null;
          stopWatchingMotion();
          clearRoot();
        }, () => {
          if (active !== thisReveal) return;
          active = null;
          stopWatchingMotion();
          clearRoot();
        });
        return;
      }
    }

    // A color-token-aware clone provides the same spatial reveal on older
    // WebViews; fall back to an immediate change if clip-path/WAAPI is absent.
    let layer: HTMLElement | null = null;
    try { layer = createFallbackLayer(colors, mode, from); } catch { /* Low-memory or unsupported DOM. */ }
    if (!layer) {
      clearRoot();
      apply();
      return;
    }
    let animation: Animation;
    try {
      animation = layer.animate({ clipPath: [from, to] }, { duration, easing: 'cubic-bezier(0.4, 0, 0.6, 1)', fill: 'forwards' });
    } catch {
      layer.remove();
      clearRoot();
      apply();
      return;
    }
    const fallbackLayer = layer;
    let done = false;
    const dispose = (commit: boolean) => {
      if (done) return;
      done = true;
      window.removeEventListener('resize', complete);
      document.removeEventListener('visibilitychange', onVisibility);
      if (commit) apply();
      animation.cancel();
      fallbackLayer.remove();
      clearRoot();
    };
    const thisReveal: ActiveReveal = { cancel: () => dispose(false), finish: () => dispose(true) };
    const complete = () => {
      if (active !== thisReveal) return;
      active = null;
      stopWatchingMotion();
      dispose(true);
    };
    const onVisibility = () => { if (document.hidden) complete(); };
    active = thisReveal;
    watchMotion(systemMotion);
    window.addEventListener('resize', complete);
    document.addEventListener('visibilitychange', onVisibility);
    animation.finished.then(complete, () => {});
  };

  return { run, cancel, finish };
}
