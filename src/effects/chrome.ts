/**
 * Chrome - the original's `RENDER_BRIGHT | RENDER_CHROME` pass on an effect
 * mesh: the mesh drawn again, additive, with Chrome01 looked up by its world
 * normal and scrolled on the clock, tinted `BodyLight` and faded by the
 * effect's `Alpha` (ZzzBMD.cpp:1426-1436, :1636-1640). MODEL_SKILL_JAVELIN's
 * orange sheen (ZzzObject.cpp:1571-1576).
 *
 * Not a layer: `model.ts` draws a clone of one mesh with this material
 * (`ModelOptions.shine`). One material per (scene, tint); the fade is read
 * from each drawn mesh's `visibility` at bind time, so spawns share it.
 *
 * Driven by: `model.ts`. Read by: nobody.
 */
import {
  Constants,
  ShaderMaterial,
  ShaderStore,
  Vector3,
  type AbstractMesh,
  type Scene,
} from '../libs/babylon/exports';
import { linearBufferActive } from '../common/lightModel';
import { effectTexture, fxNow, lightCardGain, type RGB } from './core';

const SHADER = 'fxChrome';

/** `BITMAP_CHROME`. */
const CHROME_TEXTURE = 'Effect/Chrome01.OZJ';

const materials = new Map<Scene, Map<string, ShaderMaterial>>();

/** The chrome material for `tint`, shared by every mesh that shines in it. */
export function chromeMaterial(scene: Scene, tint: RGB): ShaderMaterial {
  let byTint = materials.get(scene);
  if (!byTint) {
    byTint = new Map();
    materials.set(scene, byTint);
  }
  const key = tint.join(',');
  const known = byTint.get(key);
  if (known) return known;

  registerShader();
  const mat = new ShaderMaterial(`${SHADER}:${key}`, scene, SHADER, {
    attributes: ['position', 'normal'],
    uniforms: ['world', 'viewProjection', 'wave', 'tint', 'look'],
    samplers: ['chromeSampler'],
    needAlphaBlending: true,
  });
  mat.alphaMode = Constants.ALPHA_ONEONE;
  mat.backFaceCulling = false;
  mat.disableDepthWrite = true;
  mat.zOffset = -2;
  const colour = new Vector3(tint[0], tint[1], tint[2]);
  mat.setVector3('tint', colour);
  void effectTexture(scene, CHROME_TEXTURE).then(tex => {
    if (materials.get(scene)?.get(key) === mat) mat.setTexture('chromeSampler', tex);
  });
  mat.onBindObservable.add((mesh: AbstractMesh) => {
    const effect = mat.getEffect();
    if (!effect) return;
    // `WorldTime % 10000 * 0.0001`, the scroll every RENDER_CHROME shares.
    effect.setFloat('wave', ((fxNow() * 1000) % 10000) * 0.0001);
    // Gain, linear flag, then the `Alpha` the chrome pass scales `BodyLight` by.
    effect.setFloat3('look', lightCardGain(scene), linearBufferActive(scene) ? 1 : 0, Math.min(1, mesh.visibility));
  });
  byTint.set(key, mat);
  return mat;
}

/** Drop every chrome material (the effects reset). The texture is the effect cache's. */
export function disposeChromeMaterials(): void {
  for (const byTint of materials.values()) for (const m of byTint.values()) m.dispose(true, false);
  materials.clear();
}

/**
 * MU is Z-up: its normal is (x, z, y) here (itemMaterial.ts), so
 * `g_chrome = (N.z * 0.5 + wave, N.y * 0.5 + wave * 2)` reads the world
 * normal's y and z. `fract` stands in for the sheet's GL_REPEAT.
 */
function registerShader(): void {
  if (ShaderStore.ShadersStore[`${SHADER}VertexShader`]) return;

  ShaderStore.ShadersStore[`${SHADER}VertexShader`] = `
  precision highp float;
  attribute vec3 position;
  attribute vec3 normal;
  uniform mat4 world;
  uniform mat4 viewProjection;
  uniform float wave;
  varying vec2 vUV;

  void main(void) {
    vec3 n = normalize(mat3(world) * normal);
    vUV = vec2(n.y * 0.5 + wave, n.z * 0.5 + wave * 2.0);
    gl_Position = viewProjection * (world * vec4(position, 1.0));
  }
  `;

  ShaderStore.ShadersStore[`${SHADER}FragmentShader`] = `
  precision highp float;
  uniform sampler2D chromeSampler;
  uniform vec3 tint;
  uniform vec3 look;
  varying vec2 vUV;

  void main(void) {
    vec3 col = texture2D(chromeSampler, fract(vUV)).rgb * tint * look.x;
    if (look.y > 0.5) col = pow(col, vec3(2.2));
    gl_FragColor = vec4(col * look.z, 1.0);
  }
  `;
}
