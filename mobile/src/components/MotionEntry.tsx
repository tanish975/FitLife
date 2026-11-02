import React, { useRef } from 'react';

/** Freeze the input modality for this one entrance. Reading a live global
 * keyboard selector in CSS would restart already-mounted animations when the
 * user touches the screen, potentially changing overlay stacking mid-tap. */
export const MotionEntry = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(function MotionEntry(
  { className = '', children, ...props }, ref,
) {
  const keyboardEntrance = useRef(document.documentElement.dataset.fitlifeInput === 'keyboard').current;
  return <div {...props} ref={ref} className={`${className}${keyboardEntrance ? ' motion-instant' : ''}`}>{children}</div>;
});
