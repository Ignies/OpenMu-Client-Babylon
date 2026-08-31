import './style.less';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Store } from '../../../store';
import { loadInterfaceSprite, type MuSprite } from '../../../libs/mu/sprites';
import {
  CURSOR_FILES,
  CURSOR_FRAME_SIZE,
  CURSOR_HOTSPOT,
  CURSOR_SIZE,
  talkCursorFrame,
  type CursorKind,
} from './cursors';

type Sprites = Record<CursorKind, MuSprite>;

function isOverUI(target: EventTarget | null): boolean {
  return !(target instanceof HTMLCanvasElement);
}

export const GameCursor = () => {
  const ref = useRef<HTMLDivElement>(null);

  const [sprites, setSprites] = useState<Sprites | null>(null);
  const [kind, setKind] = useState<CursorKind>('normal');
  const [frame, setFrame] = useState(() => talkCursorFrame(0));

  const pointer = useRef({ x: 0, y: 0, pressed: false, overUI: true });

  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const files = Object.entries(CURSOR_FILES) as [CursorKind, string][];

    Promise.all(
      files.map(([cursor, file]) =>
        loadInterfaceSprite(file).then(sprite => [cursor, sprite] as const)
      )
    ).then(
      loaded => {
        if (!cancelled) {
          setSprites(Object.fromEntries(loaded) as Sprites);
        }
      },
      err => console.error('Could not load the cursors:', err)
    );

    return () => {
      cancelled = true;
    };
  }, []);

  const applyTransform = () => {
    const el = ref.current;
    if (!el) return;

    const { x, y } = pointer.current;

    el.style.transform = `translate3d(${x - CURSOR_HOTSPOT}px, ${
      y - CURSOR_HOTSPOT
    }px, 0)`;
  };

  useLayoutEffect(applyTransform);

  useEffect(() => {
    const onMove = (ev: PointerEvent) => {
      pointer.current.x = ev.clientX;
      pointer.current.y = ev.clientY;
      pointer.current.overUI = isOverUI(ev.target);

      applyTransform();
      setVisible(true);
    };

    const onDown = (ev: PointerEvent) => {
      if (ev.button !== 0) return;
      pointer.current.pressed = true;
      pointer.current.overUI = isOverUI(ev.target);
    };

    const onUp = (ev: PointerEvent) => {
      if (ev.button !== 0) return;
      pointer.current.pressed = false;
    };

    const onRelease = () => {
      pointer.current.pressed = false;
    };

    const onOut = (ev: PointerEvent) => {
      if (ev.relatedTarget) return;
      setVisible(false);
    };

    window.addEventListener('pointermove', onMove, true);
    window.addEventListener('pointerdown', onDown, true);
    window.addEventListener('pointerup', onUp, true);
    window.addEventListener('pointercancel', onRelease, true);
    window.addEventListener('pointerout', onOut, true);
    window.addEventListener('blur', onRelease);

    return () => {
      window.removeEventListener('pointermove', onMove, true);
      window.removeEventListener('pointerdown', onDown, true);
      window.removeEventListener('pointerup', onUp, true);
      window.removeEventListener('pointercancel', onRelease, true);
      window.removeEventListener('pointerout', onOut, true);
      window.removeEventListener('blur', onRelease);
    };
  }, []);

  useEffect(() => {
    if (!sprites || !visible) return;

    document.body.classList.add('mu-cursor-hidden');

    return () => document.body.classList.remove('mu-cursor-hidden');
  }, [!!sprites, visible]);

  useEffect(() => {
    let raf = 0;

    const tick = () => {
      const { pressed, overUI } = pointer.current;

      const hover = overUI ? null : Store.world?.cursorHover ?? null;

      let next: CursorKind;

      if (Store.repairMode) {
        // CURSOR_REPAIR: the hammer stays up, over the UI too, until the
        // repair mode is left.
        next = 'repair';
      } else if (hover) {
        next = hover;
      } else if (!pressed) {
        next = 'normal';
      } else if (!overUI && Store.world?.cursorBlocked) {
        next = 'dontMove';
      } else {
        next = 'push';
      }

      setKind(previous => (previous === next ? previous : next));

      if (next === 'talk') {
        const now = talkCursorFrame(performance.now());

        setFrame(previous =>
          previous.x === now.x && previous.y === now.y ? previous : now
        );
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf);
  }, []);

  if (!sprites || !visible) return null;

  const sprite = sprites[kind];
  const scale = CURSOR_SIZE / CURSOR_FRAME_SIZE;

  const animated = kind === 'talk';

  return (
    <div
      ref={ref}
      className="mu-cursor"
      style={{
        width: CURSOR_SIZE,
        height: CURSOR_SIZE,
        backgroundImage: `url(${sprite.url})`,
        backgroundSize: `${sprite.width * scale}px ${sprite.height * scale}px`,
        backgroundPosition: animated
          ? `-${frame.x * CURSOR_SIZE}px -${frame.y * CURSOR_SIZE}px`
          : '0 0',
      }}
    />
  );
};
