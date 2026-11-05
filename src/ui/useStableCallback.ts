import { useCallback, useLayoutEffect, useRef } from "react";

/**
 * A function whose identity never changes but always runs the latest
 * version. Lets memoized list rows skip re-rendering while a form above
 * them is being typed into.
 */
export function useStableCallback<A extends unknown[], R>(
  fn: (...args: A) => R,
): (...args: A) => R {
  const latest = useRef(fn);
  useLayoutEffect(() => {
    latest.current = fn;
  });
  return useCallback((...args: A) => latest.current(...args), []);
}
