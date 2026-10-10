import { useEffect, type RefObject } from 'react';

type Area = { contains(node: never): boolean } | null | undefined;

/** Whether `target` is inside `area`, or inside an element `selector` names. */
export function pointerInside(target: unknown, area: Area, selector?: string): boolean {
  if (!target) return false;
  if (area?.contains(target as never)) return true;
  const closest = (target as { closest?: (s: string) => unknown }).closest;
  return !!selector && typeof closest === 'function' && !!closest.call(target, selector);
}

/**
 * A tooltip must never outlive the pointer. A grid turning busy under it
 * (pointer-events: none) swallows the pointerleave, so the hover is dropped
 * then, on any move outside `area` (or `selector`), and when the window blurs.
 */
export function useHoverRelease(
  hovering: boolean,
  busy: boolean,
  release: (none: null) => void,
  area: RefObject<Element | null>,
  selector?: string
): void {
  useEffect(() => {
    if (busy) release(null);
  }, [busy, release]);

  useEffect(() => {
    if (!hovering) return;
    const onMove = (event: PointerEvent) => {
      if (!pointerInside(event.target, area.current, selector)) release(null);
    };
    const onBlur = () => release(null);
    window.addEventListener('pointermove', onMove, true);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('pointermove', onMove, true);
      window.removeEventListener('blur', onBlur);
    };
  }, [hovering, release, area, selector]);
}
