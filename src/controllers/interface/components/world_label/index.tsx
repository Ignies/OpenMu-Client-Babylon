import { With } from 'miniplex';
import './style.less';
import { useRef, type PointerEvent } from 'react';
import { Entity } from '@/ecs/world';
import { usePositionOnScreen } from '@/controllers/interface/hooks';

type Props = {
  entity: With<Entity, 'transform' | 'screenPosition'>;
  text: string;
  /** CSS colour of the text (item tier tints); default white. */
  colour?: string;
  /** The bold face (jewels, set items). */
  bold?: boolean;
  /** The set item's blue box instead of the black one (ZzzInventory.cpp:6634-6637). */
  setItem?: boolean;
  /** Extra class on the label root (`drop` makes it clickable). */
  className?: string;
  onPointerDown?: (ev: PointerEvent<HTMLDivElement>) => void;
  /**
   * The label sits over the canvas, so a cursor resting on it stops the scene
   * hearing pointer moves: hover has to be read off the element itself.
   */
  onPointerEnter?: (ev: PointerEvent<HTMLDivElement>) => void;
  onPointerLeave?: (ev: PointerEvent<HTMLDivElement>) => void;
};

export const WorldLabel = ({
  entity,
  text,
  colour,
  bold,
  setItem,
  className,
  onPointerDown,
  onPointerEnter,
  onPointerLeave,
}: Props) => {
  const elementRef = useRef<HTMLDivElement>(null);

  usePositionOnScreen(entity, elementRef, 0, 0);

  return (
    <div
      ref={elementRef}
      className={className ? `world-label ${className}` : 'world-label'}
    >
      <div
        className={`text${bold ? ' bold' : ''}${setItem ? ' set-item' : ''}`}
        style={colour ? { color: colour } : undefined}
        onPointerDown={onPointerDown}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
      >
        {text}
      </div>
    </div>
  );
};
