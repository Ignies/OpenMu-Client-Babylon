import {
  type MutableRefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { Entity } from '../ecs/world';
import type { IVector2Like } from '../libs/babylon/exports';
import { onScreenPosition } from '../libs/screenPositionBus';

export function useRenderId() {
  const [renderId, incRenderId] = useState(() => 0);

  const refresh = useMemo(() => () => incRenderId(val => ++val), []);

  return { renderId, refresh } as const;
}

const TOO_FAR = `translate(-10000px, -10000px)`;

export function usePositionOnScreen(
  e: Entity,
  ref: MutableRefObject<HTMLElement | null>,
  offsetX: number = 0,
  offsetY: number = 0,
  preprocessScreenPosition?: (resultPoint: { x: number; y: number }) => void
) {
  const fontSize = 1;

  offsetX *= fontSize;
  offsetY *= fontSize;

  const preprocessorRef = useRef(preprocessScreenPosition);

  preprocessorRef.current = preprocessScreenPosition;

  useEffect(() => {
    let outOfScreen = true;

    const element = ref.current;
    if (element != null) {
      element.style.transform = TOO_FAR;
    }

    const point = {
      x: 0,
      y: 0,
    };

    const handler = (screenPosition: IVector2Like) => {
      const element = ref.current;
      if (element == null) return;

      const lngSqrt =
        screenPosition.x * screenPosition.x +
        screenPosition.y * screenPosition.y;

      if (lngSqrt < 0.1) {
        if (!outOfScreen) {
          element.style.transform = TOO_FAR;
          outOfScreen = true;
        }
        return;
      }

      outOfScreen = false;

      const x = Math.floor(screenPosition.x + offsetX);
      const y = Math.floor(screenPosition.y + offsetY);

      point.x = x;
      point.y = y;

      if (preprocessorRef.current != null) {
        preprocessorRef.current(point);
      }

      element.style.transform = `translate(${point.x}px, ${point.y}px)`;
    };

    return onScreenPosition(e, handler);
  }, [e, ref, preprocessorRef]);
}
