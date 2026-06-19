import { useCallback, useEffect, useRef } from 'react';

export function useInfiniteScroll({ onLoadMore, hasMore, isLoading, rootRef }) {
  const observerRef = useRef(null);

  const onLoadMoreRef = useRef(onLoadMore);
  useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
  }, [onLoadMore]);

  const setRef = useCallback(
    (node) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      if (!node) return;
      if (isLoading || !hasMore) return;

      observerRef.current = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (entry?.isIntersecting) {
            onLoadMoreRef.current?.();
          }
        },
        {
          root: rootRef?.current ?? null,
          rootMargin: '120px',
          threshold: 0,
        }
      );
      observerRef.current.observe(node);
    },
    [isLoading, hasMore, rootRef]
  );

  useEffect(() => {
    return () => observerRef.current?.disconnect();
  }, []);

  return setRef;
}
