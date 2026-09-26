import { describe, expect, it, vi } from 'vitest';
import type { Scene } from '../libs/babylon/exports';
import { frameSnapshot } from './frameSnapshot';

const fakeScene = () => {
  const scene = { frame: 1, getFrameId: () => scene.frame };
  return scene;
};

const asScene = (scene: ReturnType<typeof fakeScene>) =>
  scene as unknown as Scene;

describe('frameSnapshot', () => {
  it('fills once per rendered frame and hands back the same object', () => {
    const scene = fakeScene();
    const value = { n: 0 };
    const fill = vi.fn((v: typeof value) => v.n++);
    const read = frameSnapshot(value, fill);

    expect(read(asScene(scene))).toBe(value);
    expect(read(asScene(scene))).toBe(value);
    expect(read(asScene(scene)).n).toBe(1);
    expect(fill).toHaveBeenCalledTimes(1);

    scene.frame++;
    expect(read(asScene(scene)).n).toBe(2);
    expect(read(asScene(scene)).n).toBe(2);
  });

  it('fills again for another scene on the same frame id', () => {
    const a = fakeScene();
    const b = fakeScene();
    const fill = vi.fn();
    const read = frameSnapshot({}, fill);

    read(asScene(a));
    read(asScene(b));
    read(asScene(b));

    expect(fill).toHaveBeenCalledTimes(2);
    expect(fill.mock.calls[1][1]).toBe(b);
  });

  it('fills on every read when it is not live', () => {
    const scene = fakeScene();
    const fill = vi.fn();
    const read = frameSnapshot({}, fill, false);

    read(asScene(scene));
    read(asScene(scene));
    read(asScene(scene));

    expect(fill).toHaveBeenCalledTimes(3);
  });

  it('fills again after a fill that threw', () => {
    const scene = fakeScene();
    let calls = 0;
    const read = frameSnapshot({}, () => {
      if (calls++ === 0) throw new Error('fill');
    });

    expect(() => read(asScene(scene))).toThrow();
    read(asScene(scene));
    read(asScene(scene));

    expect(calls).toBe(2);
  });

  it('fills on the first read of frame 0, before any render', () => {
    const scene = fakeScene();
    scene.frame = 0;
    const fill = vi.fn();

    frameSnapshot({}, fill)(asScene(scene));

    expect(fill).toHaveBeenCalledTimes(1);
  });
});
