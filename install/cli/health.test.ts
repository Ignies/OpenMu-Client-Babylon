import { describe, expect, it } from 'vitest';
import { anyOpen, firstOpen } from './health';
import { GAME_PORTS } from './stack';

describe('health checks', () => {
  it('counts the game server up on either OpenMU port range', () => {
    expect(GAME_PORTS).toEqual([45901, 55901]);
    expect(anyOpen('openmu-startup', GAME_PORTS)).toBe(
      '(nc -z -w 3 openmu-startup 45901 || nc -z -w 3 openmu-startup 55901) && echo 1 || echo 0'
    );
  });

  it('names the first game port that answers', () => {
    expect(firstOpen('openmu-startup', GAME_PORTS)).toBe(
      'for p in 45901 55901; do nc -z -w 3 openmu-startup $p && echo $p && break; done'
    );
  });
});
