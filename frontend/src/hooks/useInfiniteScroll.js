'use client';

import { useEffect, useRef } from 'react';

/**
 * Calls `onIntersect` when the sentinel element scrolls into view.
 * Attach `sentinelRef` to a div at the bottom of your list.
 */
export function useInfiniteScroll(onIntersect, enabled = true) {
  const sentinelRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onIntersect();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [onIntersect, enabled]);

  return sentinelRef;
}
