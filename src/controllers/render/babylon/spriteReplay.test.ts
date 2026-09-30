import { describe, expect, it } from 'vitest';
import { SpriteRenderer } from '@babylonjs/core/Sprites/spriteRenderer';
import type { IMatrixLike } from '@babylonjs/core/Maths/math.like';
import { ThinSprite } from '@babylonjs/core/Sprites/thinSprite';
import { installSpriteReplay, renderWithReplay, type Renderer } from './spriteReplay';

/**
 * Babylon's own `render` and the replay run side by side on the same fake
 * engine: the first draw of a frame must match call for call, and a second
 * draw in that frame must be Babylon's minus the upload, drawing the same
 * bytes.
 */

type RenderFn = (
  this: Renderer,
  sprites: ThinSprite[],
  deltaTime: number,
  viewMatrix: unknown,
  projectionMatrix: unknown,
  customSpriteUpdate?: ((sprite: ThinSprite) => void) | null
) => void;

const babylonRender = SpriteRenderer.prototype.render as unknown as RenderFn;

const VIEW = { m: [] } as unknown as IMatrixLike;
const PROJECTION = { m: [] } as unknown as IMatrixLike;

type Rig = {
  renderer: Renderer;
  sprites: ThinSprite[];
  log: string[];
  appends: () => number;
  setFrame: (frame: number) => void;
  draw: (custom?: ((sprite: ThinSprite) => void) | null) => void;
};

function makeSprites(n: number): ThinSprite[] {
  const sprites: ThinSprite[] = [];
  for (let i = 0; i < n; i++) {
    const sprite = new ThinSprite();
    sprite.position = { x: i, y: i * 2, z: i * 3 };
    sprite.width = 1 + i;
    sprite.height = 2 + i;
    sprite.angle = i / 10;
    sprite.color = { r: 0.5, g: 0.25, b: i / 8, a: 1 };
    sprite.cellIndex = i % 4;
    sprites.push(sprite);
  }
  return sprites;
}

function makeRig(
  mode: 'babylon' | 'replay',
  { instancing = true, shaderLanguage = 0, count = 5 } = {}
): Rig {
  const log: string[] = [];
  let frame = 1;
  let gpu = new Float32Array(0);
  const glBuffer = { name: 'sprites' };
  const size = instancing ? 16 : 18;
  const capacity = 16;

  const dump = (floats: number) => Array.from(gpu.subarray(0, floats)).join();

  const engine = {
    depthCullingState: { cull: false, zOffset: 0, zOffsetUnits: 0, depthFunc: null },
    useReverseDepthBuffer: false,
    setState: (...a: unknown[]) => log.push(`setState:${a.join()}`),
    enableEffect: (w: unknown) => log.push(`enableEffect:${w === base ? 'base' : 'depth'}`),
    recordVertexArrayObject: () => (log.push('recordVAO'), { vao: true }),
    bindVertexArrayObject: () => log.push('bindVAO'),
    bindBuffers: () => log.push('bindBuffers'),
    setColorWrite: (e: boolean) => log.push(`colorWrite:${e}`),
    setAlphaMode: (m: number) => log.push(`alpha:${m}`),
    drawArraysType: (m: number, s: number, c: number, n: number) =>
      log.push(`drawArrays:${m},${s},${c},${n}|${dump(n * size)}`),
    drawElementsType: (m: number, s: number, c: number) =>
      log.push(`drawElements:${m},${s},${c}|${dump((c / 6) * 4 * size)}`),
    unbindInstanceAttributes: () => log.push('unbindInstances'),
    bindArrayBuffer: (b: unknown) => log.push(`bindArrayBuffer:${b === glBuffer ? 'sprites' : b}`),
    _resetVertexBufferBinding: () => log.push('resetVertexBinding'),
  };

  const effect = {
    isReady: () => true,
    setTexture: (n: string) => log.push(`texture:${n}`),
    setMatrix: (n: string, m: unknown) => log.push(`matrix:${n}:${m === VIEW || m === PROJECTION}`),
    setFloat4: (n: string) => log.push(`float4:${n}`),
    setColor3: (n: string) => log.push(`color3:${n}`),
    setBool: (n: string, v: boolean) => log.push(`bool:${n}:${v}`),
  };
  const base = { effect, defines: null };
  const depth = { effect, defines: null };

  const scene = {
    getFrameId: () => frame,
    useRightHandedSystem: false,
    fogEnabled: false,
    fogMode: 0,
    getEngine: () => engine,
  };

  const renderer = Object.create(SpriteRenderer.prototype) as Renderer & Record<string, unknown>;
  Object.assign(renderer, {
    blendMode: 1,
    autoResetAlpha: true,
    disableDepthWrite: false,
    cellWidth: 64,
    cellHeight: 64,
    texture: { isReady: () => true, getBaseSize: () => ({ width: 256, height: 256 }) },
    _fogEnabled: true,
    _useLogarithmicDepth: false,
    _shaderLanguage: shaderLanguage,
    _shadersLoaded: true,
    _drawWrapperBase: base,
    _drawWrapperDepth: depth,
    _engine: engine,
    _scene: scene,
    _capacity: capacity,
    _epsilon: 0.01,
    _useInstancing: instancing,
    _useVAO: true,
    _vertexBufferSize: size,
    _vertexData: new Float32Array(capacity * size * (instancing ? 1 : 4)),
    _buffer: {
      update(data: Float32Array) {
        engine.bindArrayBuffer(glBuffer);
        gpu = data.slice();
        log.push('bufferSubData');
        engine._resetVertexBufferBinding();
      },
      getBuffer: () => glBuffer,
    },
    _vertexBuffers: {},
    _indexBuffer: instancing ? undefined : { index: true },
  });

  let appended = 0;
  const append = (SpriteRenderer.prototype as unknown as Record<string, (...a: unknown[]) => void>)
    ._appendSpriteVertex;
  renderer._appendSpriteVertex = function (this: Renderer, ...args: unknown[]) {
    appended++;
    append.apply(this, args);
  } as Renderer['_appendSpriteVertex'];

  const sprites = makeSprites(count);

  return {
    renderer,
    sprites,
    log,
    appends: () => appended,
    setFrame: next => {
      frame = next;
    },
    draw: (custom = null) => {
      if (mode === 'babylon') {
        babylonRender.call(renderer, sprites, 16, VIEW, PROJECTION, custom);
      } else {
        renderWithReplay.call(renderer, babylonRender as never, sprites, 16, VIEW, PROJECTION, custom);
      }
    },
  };
}

/** Both rigs draw; returns each one's calls for that draw. */
function drawBoth(a: Rig, b: Rig, custom: ((sprite: ThinSprite) => void) | null = null) {
  a.log.length = 0;
  b.log.length = 0;
  a.draw(custom);
  b.draw(custom);
  return { babylon: [...a.log], replay: [...b.log] };
}

const withoutUpload = (log: string[]) => log.filter(entry => entry !== 'bufferSubData');

describe('renderWithReplay', () => {
  it('matches Babylon on the first draw and drops only the upload on the second', () => {
    const a = makeRig('babylon');
    const b = makeRig('replay');

    const first = drawBoth(a, b);
    expect(first.replay).toEqual(first.babylon);
    expect(first.babylon).toContain('bufferSubData');

    const builds = b.appends();
    const second = drawBoth(a, b);
    expect(second.babylon).toContain('bufferSubData');
    expect(second.replay).toEqual(withoutUpload(second.babylon));
    expect(b.appends()).toBe(builds);
  });

  it('replays the indexed path with the same element count', () => {
    const a = makeRig('babylon', { instancing: false });
    const b = makeRig('replay', { instancing: false });

    drawBoth(a, b);
    const second = drawBoth(a, b);

    expect(second.replay).toEqual(withoutUpload(second.babylon));
    expect(second.replay.some(entry => entry.startsWith('drawElements:0,0,30|'))).toBe(true);
  });

  it('rebuilds on a new frame', () => {
    const a = makeRig('babylon');
    const b = makeRig('replay');
    drawBoth(a, b);

    for (const rig of [a, b]) {
      rig.setFrame(2);
      rig.sprites[1].position = { x: 40, y: 50, z: 60 };
    }

    const next = drawBoth(a, b);
    expect(next.replay).toEqual(next.babylon);
    expect(next.replay).toContain('bufferSubData');
  });

  it('rebuilds when a sprite is running an animation', () => {
    const a = makeRig('babylon');
    const b = makeRig('replay');
    for (const rig of [a, b]) rig.sprites[2].playAnimation(0, 3, true, 10, null);

    drawBoth(a, b);
    const second = drawBoth(a, b);

    expect(second.replay).toEqual(second.babylon);
    expect(second.replay).toContain('bufferSubData');
    expect(b.sprites[2].cellIndex).toBe(a.sprites[2].cellIndex);
  });

  it('rebuilds when the list changed length between the draws', () => {
    const a = makeRig('babylon');
    const b = makeRig('replay');
    drawBoth(a, b);

    for (const rig of [a, b]) rig.sprites.push(makeSprites(7)[6]);

    const second = drawBoth(a, b);
    expect(second.replay).toEqual(second.babylon);
    expect(second.replay.some(entry => entry.startsWith('drawArrays:7,0,4,6|'))).toBe(true);
  });

  it('rebuilds under a custom update', () => {
    const a = makeRig('babylon');
    const b = makeRig('replay');
    const custom = (sprite: ThinSprite) => {
      sprite._xOffset = 0;
      sprite._yOffset = 0;
      sprite._xSize = 64;
      sprite._ySize = 64;
    };

    drawBoth(a, b, custom);
    const second = drawBoth(a, b, custom);

    expect(second.replay).toEqual(second.babylon);
    expect(second.replay).toContain('bufferSubData');
  });

  it('draws nothing when nothing is visible, like Babylon', () => {
    const a = makeRig('babylon');
    const b = makeRig('replay');
    for (const rig of [a, b]) for (const sprite of rig.sprites) sprite.isVisible = false;

    const first = drawBoth(a, b);
    const second = drawBoth(a, b);

    expect(first.replay).toEqual([]);
    expect(first.babylon).toEqual([]);
    expect(second.replay).toEqual(second.babylon);
  });

  it('leaves WGSL renderers to Babylon', () => {
    const b = makeRig('replay', { shaderLanguage: 1 });
    let calls = 0;
    const original = function () {
      calls++;
    };

    renderWithReplay.call(b.renderer, original, b.sprites, 16, VIEW, PROJECTION);

    expect(calls).toBe(1);
    expect(b.log).toEqual([]);
  });
});

describe('installSpriteReplay', () => {
  it('wraps Babylon 7.51.1 render once', () => {
    installSpriteReplay();
    const patched = SpriteRenderer.prototype.render;
    installSpriteReplay();

    expect(patched).not.toBe(babylonRender);
    expect(SpriteRenderer.prototype.render).toBe(patched);
  });
});
