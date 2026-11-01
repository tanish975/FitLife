import { useEffect, useState } from 'react';
import { useFitLife } from '../data/FitLifeStore';

/** Respects both the in-app motion setting and the operating-system preference. */
export function useReducedMotion() {
  const { settings } = useFitLife();
  const [systemReduced, setSystemReduced] = useState(() =>
    typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  );
  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!query) return;
    const update = () => setSystemReduced(query.matches);
    if (query.addEventListener) query.addEventListener('change', update);
    else query.addListener(update);
    return () => { if (query.removeEventListener) query.removeEventListener('change', update); else query.removeListener(update); };
  }, []);
  return settings.motionStyle === 'reduced' || systemReduced;
}
