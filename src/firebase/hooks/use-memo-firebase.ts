"use client";
import { useMemo, DependencyList } from "react";

/**
 * A custom hook that works like `useMemo`, but it also "tags" the memoized
 * value with a `__memo` property. This allows other hooks, like `useCollection`
 * and `useDoc`, to verify that the Firestore query or reference they receive
 *is
 * properly memoized, preventing potential infinite loops.
 * @param factory The function to compute the value.
 * @param deps The dependency array.
 * @return The memoized value.
 */
export function useMemoFirebase<T>(factory: () => T, deps: DependencyList | undefined): T {
  const memoizedValue = useMemo(() => {
    const value = factory();
    if (value && typeof value === "object") {
      // "Tag" the object with a non-enumerable property.
      Object.defineProperty(value, "__memo", {
        value: true,
        writable: false,
        enumerable: false,
        configurable: false,
      });
    }
    return value;
  }, deps ?? []);

  return memoizedValue;
}
