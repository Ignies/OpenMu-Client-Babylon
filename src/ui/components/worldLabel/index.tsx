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
};

export const WorldLabel = ({
  entity,
  text,
  colour,
  className,
  onPointerDown,
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
      >
        {text}
      </div>
    </div>
  );
};
