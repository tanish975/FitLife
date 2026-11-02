import { useEffect } from 'react';

/** Keep keyboard-triggered navigation immediate. Pointer input can use the
 * same spatial cues without changing focus or delaying an action. */
export function useInputModality() {
  useEffect(() => {
    const root = document.documentElement;
    const keyboard = (event: KeyboardEvent) => {
      if (!event.metaKey && !event.ctrlKey && !event.altKey) root.dataset.fitlifeInput = 'keyboard';
    };
    const pointer = () => { root.dataset.fitlifeInput = 'pointer'; };
    // Remember how a details element was opened until it closes. Do not
    // re-enable its entrance just because the next interaction is a touch.
    const toggle = (event: Event) => {
      const details = event.target;
      if (!(details instanceof HTMLDetailsElement)) return;
      if (details.open && root.dataset.fitlifeInput === 'keyboard') details.dataset.fitlifeMotionInstant = 'true';
      else delete details.dataset.fitlifeMotionInstant;
    };
    document.addEventListener('toggle', toggle, true);
    document.addEventListener('keydown', keyboard, true);
    document.addEventListener('pointerdown', pointer, true);
    // Older WebViews may not dispatch Pointer Events.
    document.addEventListener('touchstart', pointer, { capture: true, passive: true });
    document.addEventListener('mousedown', pointer, true);
    return () => {
      document.removeEventListener('toggle', toggle, true);
      document.removeEventListener('keydown', keyboard, true);
      document.removeEventListener('pointerdown', pointer, true);
      document.removeEventListener('touchstart', pointer, true);
      document.removeEventListener('mousedown', pointer, true);
      delete root.dataset.fitlifeInput;
    };
  }, []);
}
