/**
 * Measures an element's content width with a ResizeObserver so purely presentational charts can thin their axes responsively. Returns null until the observer reports the first size; environments without ResizeObserver (jsdom without a stub) stay at null.
 */

import { useCallback, useEffect, useRef, useState } from "react";

export const useMeasuredWidth = (): [React.RefCallback<HTMLElement>, number | null] => {
  const [width, setWidth] = useState<number | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);

  const ref = useCallback((element: HTMLElement | null) => {
    observerRef.current?.disconnect();
    if (element === null) {
      return;
    }
    if (typeof ResizeObserver === "undefined") {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
      }
    });
    observer.observe(element);
    observerRef.current = observer;
  }, []);

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  return [ref, width];
};
