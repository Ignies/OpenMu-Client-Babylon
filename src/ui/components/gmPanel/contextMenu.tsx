import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

/** Room kept between a menu and the window's edge, px. */
const EDGE = 8;

export type MenuPoint = { left: number; top: number };

/**
 * A right-click menu's shell: placed at the click, kept inside the window,
 * and closed by a press anywhere else or by Escape - which it takes before
 * the panel does, so Escape closes the menu and not the whole panel. The
 * click that closes it does nothing else: on the map it would warp the game
 * master to wherever they clicked to dismiss it.
 */
export function ContextMenu({
  at,
  onClose,
  children,
}: {
  at: MenuPoint;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState(at);

  // Flipped left or up when it would run off the window.
  useLayoutEffect(() => {
    const box = ref.current?.getBoundingClientRect();
    if (!box) return;
    const left = at.left + box.width + EDGE > window.innerWidth ? at.left - box.width : at.left;
    const top =
      at.top + box.height + EDGE > window.innerHeight
        ? Math.max(EDGE, window.innerHeight - box.height - EDGE)
        : at.top;
    setPlace({ left: Math.max(EDGE, left), top });
  }, [at]);

  useEffect(() => {
    const eat = (event: MouseEvent) => {
      event.stopPropagation();
      event.preventDefault();
    };
    const press = (event: PointerEvent) => {
      if (ref.current?.contains(event.target as Node)) return;
      // The click this press becomes is the menu's, not whatever is under it.
      // Dropped once the press is over, so a drag does not eat a later click.
      window.addEventListener('click', eat, { capture: true, once: true });
      window.addEventListener(
        'pointerup',
        () => setTimeout(() => window.removeEventListener('click', eat, true), 0),
        { capture: true, once: true }
      );
      onClose();
    };
    const key = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopImmediatePropagation();
      event.preventDefault();
      onClose();
    };
    window.addEventListener('pointerdown', press, true);
    window.addEventListener('keydown', key, true);
    return () => {
      window.removeEventListener('pointerdown', press, true);
      window.removeEventListener('keydown', key, true);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="gm-menu"
      role="menu"
      style={{ left: place.left, top: place.top }}
      onContextMenu={event => event.preventDefault()}
    >
      {children}
    </div>
  );
}
