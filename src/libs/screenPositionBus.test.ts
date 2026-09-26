import { describe, expect, it } from 'vitest';
import {
  emitScreenPosition,
  emitScreenPositionFrameEnd,
  onAnyScreenPosition,
  onScreenPositionFrameEnd,
} from './screenPositionBus';
import type { Entity } from '../ecs/world';

describe('onScreenPositionFrameEnd', () => {
  it('runs once per pass, after the pass emits, until removed', () => {
    const calls: string[] = [];
    const entity = {} as Entity;
    const offAny = onAnyScreenPosition(() => calls.push('emit'));
    const offEnd = onScreenPositionFrameEnd(() => calls.push('end'));

    emitScreenPosition(entity, { x: 1, y: 1 });
    emitScreenPosition(entity, { x: 2, y: 2 });
    emitScreenPositionFrameEnd();
    expect(calls).toEqual(['emit', 'emit', 'end']);

    // A pass with nothing to emit still ends.
    emitScreenPositionFrameEnd();
    expect(calls).toEqual(['emit', 'emit', 'end', 'end']);

    offEnd();
    offAny();
    emitScreenPositionFrameEnd();
    expect(calls).toHaveLength(4);
  });
});
