import { RefObject, useEffect, useRef } from 'react';

/** Focus a dialog, contain Tab, and let Android Back/Escape close it. */
export function useAccessibleDialog(open: boolean, root: RefObject<HTMLElement>, onClose: () => void) {
  const closeRef = useRef(onClose); closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const el = root.current;
    const timer = window.setTimeout(() => (el?.querySelector<HTMLElement>('[data-dialog-focus]') || el)?.focus(), 30);
    const back = (event: Event) => { if (!event.defaultPrevented) { event.preventDefault(); closeRef.current(); } };
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); return; }
      if (event.key !== 'Tab' || !el) return;
      const list = [...el.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')].filter(x => x.getClientRects().length > 0);
      if (!list.length) { event.preventDefault(); el.focus(); return; }
      const first = list[0], last = list[list.length - 1];
      if (event.shiftKey && (document.activeElement === first || !el.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !el.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('fitlife-back', back); document.addEventListener('keydown', key);
    return () => { window.clearTimeout(timer); window.removeEventListener('fitlife-back', back); document.removeEventListener('keydown', key); if (previous?.isConnected) previous.focus(); };
  }, [open, root]);
}
