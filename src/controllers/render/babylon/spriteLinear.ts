import { DrawWrapper } from '@babylonjs/core/Materials/drawWrapper';
import { SpriteRenderer } from '@babylonjs/core/Sprites/spriteRenderer';
import { ShaderStore } from '@babylonjs/core/Engines/shaderStore';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import type { Effect } from '@babylonjs/core/Materials/effect';
import type { Scene } from '@babylonjs/core/scene';
import { linearBufferActive } from '../../lighting/lightModel';
import { installSpriteReplay } from './spriteReplay';

/**
 * Sprites decode their texel into the linear buffer like every material;
 * Babylon's sprite shader never does. Off on Classic.
 */

const UNIFORM = 'muLinear';
const DEFINE = 'MU_LINEAR';

type Renderer = {
  _isDisposed: boolean;
  _shadersLoaded: boolean;
  _drawWrapperBase: DrawWrapper;
  _drawWrapperDepth: DrawWrapper;
  _engine: { createEffect: (...args: unknown[]) => Effect };
  _useInstancing: boolean;
  _pixelPerfect: boolean;
  _fogEnabled: boolean;
  _useLogarithmicDepth: boolean;
  _shaderLanguage: number;
  _scene: Scene | null;
};

let installed = false;

function patchShaderText(): void {
  const store = ShaderStore.ShadersStore;
  const text = store.spritesPixelShader;

  if (!text || text.includes(DEFINE)) return;

  store.spritesPixelShader = text
    .replace(
      'uniform bool alphaTest;',
      `uniform bool alphaTest;\n#ifdef ${DEFINE}\nuniform float ${UNIFORM};\n#endif\n`
    )
    .replace(
      'color*=vColor;',
      `color*=vColor;\n#ifdef ${DEFINE}\nif (${UNIFORM}>0.5) {color.rgb=pow(max(color.rgb,vec3(0.0)),vec3(2.2));}\n#endif\n`
    );
}

/**
 * `SpriteRenderer._createEffects` (7.51.1), with the uniform and the define.
 * WGSL renderers keep Babylon's own path.
 */
function createEffects(this: Renderer, original: (this: Renderer) => void): void {
  if (this._shaderLanguage !== 0) return original.call(this);
  if (this._isDisposed || !this._shadersLoaded) return;

  patchShaderText();

  this._drawWrapperBase?.dispose();
  this._drawWrapperDepth?.dispose();
  this._drawWrapperBase = new DrawWrapper(this._engine as never);
  this._drawWrapperDepth = new DrawWrapper(this._engine as never, false);
  if (this._drawWrapperBase.drawContext) {
    this._drawWrapperBase.drawContext.useInstancing = this._useInstancing;
  }
  if (this._drawWrapperDepth.drawContext) {
    this._drawWrapperDepth.drawContext.useInstancing = this._useInstancing;
  }

  let defines = `#define ${DEFINE}\n`;
  if (this._pixelPerfect) defines += '#define PIXEL_PERFECT\n';
  const scene = this._scene;
  if (scene && scene.fogEnabled && scene.fogMode !== 0 && this._fogEnabled) {
    defines += '#define FOG\n';
  }
  if (this._useLogarithmicDepth) defines += '#define LOGARITHMICDEPTH\n';

  const effect = this._engine.createEffect(
    'sprites',
    [VertexBuffer.PositionKind, 'options', 'offsets', 'inverts', 'cellInfo', VertexBuffer.ColorKind],
    ['view', 'projection', 'textureInfos', 'alphaTest', 'vFogInfos', 'vFogColor', 'logarithmicDepthConstant', UNIFORM],
    ['diffuseSampler'],
    defines,
    undefined,
    undefined,
    undefined,
    undefined,
    this._shaderLanguage
  );

  effect.onBindObservable.add(e => {
    e.setFloat(UNIFORM, scene && linearBufferActive(scene) ? 1 : 0);
  });

  this._drawWrapperBase.effect = effect;
  this._drawWrapperDepth.effect = effect;
  (effect as unknown as { _refCount: number })._refCount++;
  this._drawWrapperDepth.materialContext = this._drawWrapperBase.materialContext;
}

/**
 * Idempotent; the first sprite user calls it before its manager is built.
 * The same-frame vertex reuse (`spriteReplay.ts`) goes in with it.
 */
export function installSpriteLinearDecode(): void {
  if (installed) return;
  installed = true;

  installSpriteReplay();

  const proto = SpriteRenderer.prototype as unknown as Renderer & {
    _createEffects: (this: Renderer) => void;
  };
  const original = proto._createEffects;

  proto._createEffects = function (this: Renderer) {
    createEffects.call(this, original);
  };
}
