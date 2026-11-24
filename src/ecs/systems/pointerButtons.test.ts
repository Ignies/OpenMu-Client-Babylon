import { describe, expect, it } from 'vitest';
import { rightButtonStuck } from './pointerButtons';

describe('rightButtonStuck', () => {
  it('is stuck when flagged held and the browser reports no right button down', () => {
    expect(rightButtonStuck(true, 0)).toBe(true);
    expect(rightButtonStuck(true, 1)).toBe(true); // only the left one is down
  });
  it('is not stuck while the right button is really down', () => {
    expect(rightButtonStuck(true, 2)).toBe(false);
    expect(rightButtonStuck(true, 3)).toBe(false);
  });
  it('is never stuck when not flagged', () => {
    expect(rightButtonStuck(false, 0)).toBe(false);
  });
});
