import { useEffect, useState } from 'react';

/** Do not mount desktop-only trees on phones, where they still cost CPU even
 * when CSS hides them. The media query responds to rotation and resizing. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window === 'undefined' || !window.matchMedia || window.matchMedia(query).matches
  );
  useEffect(() => {
    const media = window.matchMedia?.(query);
    if (!media) return;
    const update = () => setMatches(media.matches);
    update();
    if (media.addEventListener) media.addEventListener('change', update);
    else media.addListener(update);
    return () => {
      if (media.removeEventListener) media.removeEventListener('change', update);
      else media.removeListener(update);
    };
  }, [query]);
  return matches;
}
