import React, { useEffect, useRef } from 'react';

/** Keeps the primary entry action within the visible viewport, including above
 * a mobile browser's on-screen keyboard when only the visual viewport resizes. */
export const EntryActionBar: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const barRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const viewport = window.visualViewport;
    const bar = barRef.current;
    if (!viewport || !bar) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      // Android WebView with adjustResize generally resizes innerHeight too;
      // in browsers which resize only the visual viewport, lift the bar above
      // the keyboard. Never interfere with native scrolling or pinch zoom.
      const inset = Math.max(0, Math.round(window.innerHeight - viewport.height - viewport.offsetTop));
      bar.style.setProperty('--entry-keyboard-inset', `${inset}px`);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    viewport.addEventListener('resize', schedule, { passive: true });
    viewport.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    update();
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      viewport.removeEventListener('resize', schedule);
      viewport.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, []);

  return <div ref={barRef} className="entry-action-bar"><div className="entry-action-inner">{children}</div></div>;
};
