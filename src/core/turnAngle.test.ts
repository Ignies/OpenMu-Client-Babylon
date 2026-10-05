import { describe, expect, it } from 'vitest';
import { convertDirectionToAngle, rotationByteOf } from './turnAngle';

describe('direction bytes', () => {
  it('turn into a yaw and back to the same byte', () => {
    for (let direction = 0; direction < 8; direction++) {
      expect(rotationByteOf(convertDirectionToAngle(direction))).toBe(direction);
    }
  });

  it('put direction 1 at yaw 0', () => {
    expect(convertDirectionToAngle(1)).toBe(0);
  });
});
