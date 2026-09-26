import { AbstractEngine } from '@babylonjs/core/Engines/abstractEngine';
import { BindLogDepth } from '@babylonjs/core/Materials/materialHelper.functions';
import { SpriteRenderer } from '@babylonjs/core/Sprites/spriteRenderer';
import type { DrawWrapper } from '@babylonjs/core/Materials/drawWrapper';
import type { Effect } from '@babylonjs/core/Materials/effect';
import type { ThinTexture } from '@babylonjs/core/Materials/Textures/thinTexture';
import type { IMatrixLike } from '@babylonjs/core/Maths/math.like';
import type { ISize } from '@babylonjs/core/Maths/math.size';
import type { ThinSprite } from '@babylonjs/core/Sprites/thinSprite';
import type { Scene } from '@babylonjs/core/scene';
import { devQuery } from '../../common/devSeams';

/**
 * A sprite pool drawn again in the same frame (the effect mask, after the
 * camera) draws the vertices the frame's first draw uploaded rather than
 * rebuilding and uploading the same bytes: they hold no camera state, and
 * every sprite mutator runs before the frame's first sprite pass.
 * Dev seam: `?maskReplay=0` keeps Babylon's own `render`.
 */

const REPLAY = devQuery('maskReplay') !== '0';

/** `renderWithReplay` copies this version's `render`; any other keeps its own. */
const BABYLON_VERSION = '7.51.1';

type CustomUpdate = (sprite: ThinSprite, baseSize: ISize) => void;

type RenderFn = (
  this: Renderer,
  sprites: ThinSprite[],
  deltaTime: number,
  viewMatrix: IMatrixLike,
  projectionMatrix: IMatrixLike,
  customSpriteUpdate?: CustomUpdate | null
) => void;

type Wrapper = DrawWrapper & { effect: Effect };

type Engine = {
  depthCullingState: {
    cull: boolean | null;
    zOffset: number;
    zOffsetUnits: number;
    depthFunc: number | null;
  };
  useReverseDepthBuffer: boolean;
  setState(
    culling: boolean,
    zOffset: number,
    force: boolean,
    reverseSide: boolean,
    cullBackFaces?: boolean,
    stencil?: undefined,
    zOffsetUnits?: number
  ): void;
  enableEffect(wrapper: Wrapper): void;
  recordVertexArrayObject(buffers: unknown, index: unknown, effect: Effect): unknown;
  bindVertexArrayObject(vao: unknown, index: unknown): void;
  bindBuffers(buffers: unknown, index: unknown, effect: Effect): void;
  setColorWrite(enable: boolean): void;
  setAlphaMode(mode: number): void;
  drawArraysType(fillMode: number, start: number, count: number, instances: number): void;
  drawElementsType(fillMode: number, start: number, count: number): void;
  unbindInstanceAttributes(): void;
  bindArrayBuffer(buffer: unknown): void;
  _resetVertexBufferBinding(): void;
};

/** What this frame's last build left in the renderer's buffer; `frame` -1 when nothing may reuse it. */
type Upload = {
  frame: number;
  count: number;
  sprites: ThinSprite[] | null;
  length: number;
  texture: ThinTexture | null;
  cellWidth: number;
  cellHeight: number;
  right: boolean;
};

export type Renderer = {
  texture: ThinTexture | null;
  cellWidth: number;
  cellHeight: number;
  blendMode: number;
  autoResetAlpha: boolean;
  disableDepthWrite: boolean;
  readonly fogEnabled: boolean;
  readonly useLogarithmicDepth: boolean;
  _shaderLanguage: number;
  _shadersLoaded: boolean;
  _drawWrapperBase: Wrapper;
  _drawWrapperDepth: Wrapper;
  _engine: Engine;
  _scene: Scene | null;
  _capacity: number;
  _useInstancing: boolean;
  _useVAO: boolean;
  _vertexData: Float32Array;
  _buffer: { update(data: Float32Array): void; getBuffer(): unknown };
  _vertexBuffers: Record<string, unknown>;
  _indexBuffer: unknown;
  _vertexArrayObject: unknown;
  _appendSpriteVertex(
    index: number,
    sprite: ThinSprite,
    offsetX: number,
    offsetY: number,
    baseSize: ISize,
    useRightHandedSystem: boolean,
    customSpriteUpdate: CustomUpdate | null
  ): void;
  _muUpload?: Upload;
};

/** Everything besides the sprites themselves that the build read. */
function replayable(
  r: Renderer,
  last: Upload | undefined,
  sprites: ThinSprite[],
  custom: CustomUpdate | null,
  frame: number,
  right: boolean
): last is Upload {
  return (
    last !== undefined &&
    last.frame === frame &&
    last.count > 0 &&
    !custom &&
    last.sprites === sprites &&
    last.length === sprites.length &&
    last.texture === r.texture &&
    last.cellWidth === r.cellWidth &&
    last.cellHeight === r.cellHeight &&
    last.right === right
  );
}

/** Babylon's build and upload (7.51.1); returns the vertex count, 0 when nothing is visible. */
function build(
  r: Renderer,
  sprites: ThinSprite[],
  deltaTime: number,
  useRightHandedSystem: boolean,
  customSpriteUpdate: CustomUpdate | null,
  frame: number
): number {
  const max = Math.min(r._capacity, sprites.length);
  let offset = 0;
  let noSprite = true;
  // A running animation steps again on every draw, so a second build differs.
  let animating = false;

  for (let index = 0; index < max; index++) {
    const sprite = sprites[index];
    if (!sprite || !sprite.isVisible) {
      continue;
    }
    noSprite = false;
    if (sprite.animationStarted) animating = true;
    sprite._animate(deltaTime);
    // Per sprite, as Babylon reads it: an animation-end callback may swap the texture.
    const baseSize = (r.texture as ThinTexture).getBaseSize();
    r._appendSpriteVertex(offset++, sprite, 0, 0, baseSize, useRightHandedSystem, customSpriteUpdate);
    if (!r._useInstancing) {
      r._appendSpriteVertex(offset++, sprite, 1, 0, baseSize, useRightHandedSystem, customSpriteUpdate);
      r._appendSpriteVertex(offset++, sprite, 1, 1, baseSize, useRightHandedSystem, customSpriteUpdate);
      r._appendSpriteVertex(offset++, sprite, 0, 1, baseSize, useRightHandedSystem, customSpriteUpdate);
    }
  }

  const upload = (r._muUpload ??= {
    frame: -1,
    count: 0,
    sprites: null,
    length: 0,
    texture: null,
    cellWidth: 0,
    cellHeight: 0,
    right: false,
  });

  if (noSprite) {
    upload.frame = -1;
    return 0;
  }

  r._buffer.update(r._vertexData);

  upload.frame = animating || customSpriteUpdate ? -1 : frame;
  upload.count = offset;
  upload.sprites = sprites;
  upload.length = sprites.length;
  upload.texture = r.texture;
  upload.cellWidth = r.cellWidth;
  upload.cellHeight = r.cellHeight;
  upload.right = useRightHandedSystem;

  return offset;
}

/** `SpriteRenderer.render` (7.51.1), with the build skipped when this frame already made it. */
export function renderWithReplay(
  this: Renderer,
  original: RenderFn,
  sprites: ThinSprite[],
  deltaTime: number,
  viewMatrix: IMatrixLike,
  projectionMatrix: IMatrixLike,
  customSpriteUpdate: CustomUpdate | null = null
): void {
  const scene = this._scene;

  if (this._shaderLanguage !== 0 || !scene) {
    return original.call(this, sprites, deltaTime, viewMatrix, projectionMatrix, customSpriteUpdate);
  }

  if (!this._shadersLoaded || !this.texture || !this.texture.isReady() || !sprites.length) {
    return;
  }
  const drawWrapper = this._drawWrapperBase;
  const drawWrapperDepth = this._drawWrapperDepth;
  const shouldRenderFog = this.fogEnabled && scene.fogEnabled && scene.fogMode !== 0;
  const effect = drawWrapper.effect;
  if (!effect.isReady()) {
    return;
  }
  const engine = this._engine;
  const useRightHandedSystem = !!scene.useRightHandedSystem;
  const frame = scene.getFrameId();

  let offset: number;
  const last = this._muUpload;

  if (replayable(this, last, sprites, customSpriteUpdate, frame, useRightHandedSystem)) {
    offset = last.count;
    // The upload's binds without its bufferSubData: the draw starts from the same engine state.
    engine.bindArrayBuffer(this._buffer.getBuffer());
    engine._resetVertexBufferBinding();
  } else {
    offset = build(this, sprites, deltaTime, useRightHandedSystem, customSpriteUpdate, frame);
    if (offset === 0) {
      return;
    }
  }

  const culling = !!engine.depthCullingState.cull;
  const zOffset = engine.depthCullingState.zOffset;
  const zOffsetUnits = engine.depthCullingState.zOffsetUnits;
  engine.setState(culling, zOffset, false, false, undefined, undefined, zOffsetUnits);
  engine.enableEffect(drawWrapper);
  effect.setTexture('diffuseSampler', this.texture);
  effect.setMatrix('view', viewMatrix);
  effect.setMatrix('projection', projectionMatrix);
  if (shouldRenderFog) {
    effect.setFloat4('vFogInfos', scene.fogMode, scene.fogStart, scene.fogEnd, scene.fogDensity);
    effect.setColor3('vFogColor', scene.fogColor);
  }
  if (this.useLogarithmicDepth) {
    BindLogDepth(drawWrapper.defines, effect, scene);
  }
  if (this._useVAO) {
    if (!this._vertexArrayObject) {
      this._vertexArrayObject = engine.recordVertexArrayObject(this._vertexBuffers, this._indexBuffer, effect);
    }
    engine.bindVertexArrayObject(this._vertexArrayObject, this._indexBuffer);
  } else {
    engine.bindBuffers(this._vertexBuffers, this._indexBuffer, effect);
  }
  engine.depthCullingState.depthFunc = engine.useReverseDepthBuffer ? 518 : 515;
  if (!this.disableDepthWrite) {
    effect.setBool('alphaTest', true);
    engine.setColorWrite(false);
    engine.enableEffect(drawWrapperDepth);
    if (this._useInstancing) {
      engine.drawArraysType(7, 0, 4, offset);
    } else {
      engine.drawElementsType(0, 0, (offset / 4) * 6);
    }
    engine.enableEffect(drawWrapper);
    engine.setColorWrite(true);
    effect.setBool('alphaTest', false);
  }
  engine.setAlphaMode(this.blendMode);
  if (this._useInstancing) {
    engine.drawArraysType(7, 0, 4, offset);
  } else {
    engine.drawElementsType(0, 0, (offset / 4) * 6);
  }
  if (this.autoResetAlpha) {
    engine.setAlphaMode(0);
  }
  if (useRightHandedSystem) {
    scene.getEngine().setState(culling, zOffset, false, true, undefined, undefined, zOffsetUnits);
  }
  engine.unbindInstanceAttributes();
}

let installed = false;

/** Idempotent; installed with the sprite decode, before any manager exists. */
export function installSpriteReplay(): void {
  if (installed || !REPLAY || AbstractEngine.Version !== BABYLON_VERSION) return;
  installed = true;

  const proto = SpriteRenderer.prototype as unknown as { render: RenderFn };
  const original = proto.render;

  proto.render = function (this: Renderer, sprites, deltaTime, viewMatrix, projectionMatrix, customSpriteUpdate) {
    renderWithReplay.call(this, original, sprites, deltaTime, viewMatrix, projectionMatrix, customSpriteUpdate);
  };
}
