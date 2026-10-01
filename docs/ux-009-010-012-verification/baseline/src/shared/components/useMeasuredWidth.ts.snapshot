import {useLayoutEffect, useRef, useState} from 'react';

/**
 * Width of a host element, tracked through resizes. The SVG plots are sized in real pixels rather than
 * scaled with viewBox, so axis text stays the same legible size from a 320 px phone to a wide desktop.
 */
export function useMeasuredWidth(fallback = 640, minimum = 260) {
  const host = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(fallback);
  useLayoutEffect(() => {
    const el = host.current;
    if (!el) return;
    const measure = () => {
      if (el.clientWidth) setWidth(Math.max(minimum, el.clientWidth));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [minimum]);
  return [host, width] as const;
}
