import { With } from 'miniplex';
import './style.less';
import { useRef, type PointerEvent } from 'react';
import { Entity } from '../../../ecs/world';
import { usePositionOnScreen } from '../../../hooks';

type Props = {
  entity: With<Entity, 'transform' | 'screenPosition'>;
  text: string;
  /** CSS colour of the text (item tier tints); default white. */
  colour?: string;
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
        className="text"
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
