import {
  CustomMaterial,
  PBRCustomMaterial,
  Texture,
  type AbstractMesh,
  type BaseTexture,
  type Effect,
  type Material,
  type Scene,
} from '../libs/babylon/exports';
import { pbrMapsFor, pbrPlaceholders } from './pbrMaps';
import { pbrDetailStrength, pbrKeyGain } from './materialQuality';
import { UNIFIED_LIGHT_MODEL, bodyLightTint } from './lightModel';
import { pointLightPoolSize } from './pointLightPool';
import {
  itemEmissiveAt,
  itemGlowClock,
  type ItemVisualTier,
} from './itemVisualTier';
import {
  improvedItemEffectsOn,
  legacyItemEffectsOn,
  legacyRenderLevel,
} from './itemEffectMode';

const glowScratch = { r: 0, g: 0, b: 0, a: 1 };
import { resolveDataUrl } from '../libs/mu/dataFolder';
import { sunLightOf } from '../lighting/keyRig';
import {
  SNOW_CAP_COLOUR,
  SNOW_CAP_KNEE_FULL,
  SNOW_CAP_KNEE_THIN,
  snowCapAt,
} from '../weather/snowCaps';

const ITEM_FX_UNIFORM = `itemFx`;
/**
 * Snow on the object's up-facing surfaces, 0…1 (weather/snowCaps.ts). Per
 * mesh, from `metadata.snowCap` and the cover at the mesh's tile; zero for
 * everything that is not a map prop on a snow map, and for glow cards.
 */
const SNOW_CAP_UNIFORM = `muSnowCap`;

/**
 * Whitens what faces up. `albedo` is the path's albedo variable. Runs on the
 * geometric normal, so a wall stays bare however its bump map tilts it.
 * The knee slides down as the cap deepens: a dusting only sits on the flat
 * tops, full cover reaches down the slopes.
 */
const snowCapGlsl = (albedo: string) => `
  if (${SNOW_CAP_UNIFORM} > 0.0) {
    float capKnee = mix(${f(SNOW_CAP_KNEE_THIN)}, ${f(SNOW_CAP_KNEE_FULL)}, ${SNOW_CAP_UNIFORM});
    float cap = smoothstep(capKnee - 0.12, capKnee + 0.12, normalW.y) * ${SNOW_CAP_UNIFORM};
    ${albedo}.rgb = mix(${albedo}.rgb, vec3(${f(SNOW_CAP_COLOUR[0])}, ${f(
  SNOW_CAP_COLOUR[1]
)}, ${f(SNOW_CAP_COLOUR[2])}), cap);
  }
`;
const f = (n: number) => n.toFixed(3);
/** PBR variant: BodyLight lives outside the Material UBO so it can be set per mesh. */
const BODY_LIGHT_UNIFORM = `muBodyLight`;

/**
 * Diffuse lift that stands in for the π the lights are not carrying while the
 * world is still on the Standard path — see `pbrKeyGain`. 1 on the Enhanced
 * tier, where the lights carry it themselves.
 */
const KEY_GAIN_UNIFORM = `muKeyGain`;

/**
 * Detail strength as the shader sees it. The emissive map is *added* on top
 * of the lit surface, so a texture the derivation found trim in comes out
 * brighter than its Classic twin — that is one of the ways Enhanced reads as
 * "the texture itself got lighter", and it has to follow the dial with the
 * rest of the derivation.
 */
const DETAIL_UNIFORM = `muDetail`;

/**
 * Every live PBR item material, so the detail strength can be re-applied
 * without a reload. There is one per blend-state variant, not per mesh.
 */
const pbrMaterials = new Set<PBRCustomMaterial>();

/**
 * Dial the whole PBR deviation back toward Classic. At 0 the material is the
 * lit albedo and nothing else; at 1 it is the full derivation.
 *
 * Each of these is a separate way Enhanced comes out lighter and paler than
 * its Classic twin, which is why the dial has to move all of them together:
 *
 *  - `specularIntensity` — the Standard item material ships `specularColor 0`
 *    and has no highlight at all, so every bit of GGX the PBR path adds is
 *    white laid over the texture. That is the *pale*: it lifts the surface and
 *    desaturates it at the same time, and it is the largest of the three.
 *  - `metallic` — multiplies the map's blue channel, pulling back the palette
 *    heuristic's guesses. A texel it calls metal loses its diffuse and gets a
 *    highlight back in exchange, with no environment map to justify it.
 *  - `bumpTexture.level` — scales `perturbNormal`, thinning the
 *    height-from-luma relief that turns JPEG ringing into geometry.
 *
 * The added emissive follows too, through `DETAIL_UNIFORM` in the shader.
 *
 * Roughness is deliberately left alone: it is already a multiply against the
 * map, and scaling it would make surfaces *smoother* (shinier), which is the
 * wrong direction for toning the effect down.
 */
export function syncPbrDetail(): void {
  const strength = pbrDetailStrength();

  for (const material of pbrMaterials) {
    if (material.bumpTexture) material.bumpTexture.level = strength;
    material.metallic = strength;
    material.specularIntensity = strength;

    // All three live in the Material UBO, and `bindForSubMesh` skips that
    // write while the material is frozen and the buffer is in sync. Only
    // `markDirty(true)` sets `_forceRebindOnNextCall`, which is the one
    // condition in that guard we can reach — plain `markDirty()` assigns the
    // flag its `false` default, so freeze/unfreeze around the writes looks
    // like it should work and silently does not.
    material.markDirty(true);
  }
}

/**
 * Half-lambert sun response (lighting_rework.md §3.1).
 *
 * The original's character shading is `Luminosity = dot·0.8 + 0.4`, clamped
 * ≥ 0.2 (`ZzzBMD.cpp:255-257`): side faces get 0.4, back faces never drop
 * below 0.2. The port's raw `max(N·L, 0)` is why limbs read thin and dark —
 * a near-vertical sun cannot reach a limb's side at all.
 *
 * Implemented as a fill term added on top of the light sum the shader already
 * computed: `sunColor × (wrap(dot) - max(dot, 0))`, with the wrap normalized
 * by 1.2 so a fully sun-facing surface is unchanged and the frame does not
 * re-expose. The fill is clamped ≥ 0, and everything scales with the sun's
 * intensity — Classic parks the sun at 0, so the term is inert there by
 * construction. The CSM does not attenuate the fill: like the original's
 * clamp, the floor holds in shadow.
 *
 * Dev overrides: `?halfLambert=0` disables, `?hlWrap=scale,bias,floor` tunes
 * (values are the already-normalized shader constants).
 */
const SUN_DIR_UNIFORM = 'muSunDir';
const SUN_COLOR_UNIFORM = 'muSunColor';
const SUN_WRAP_UNIFORM = 'muSunWrap';

const HALF_LAMBERT_DEFAULT: [number, number, number] = [
  0.8 / 1.2,
  0.4 / 1.2,
  0.2 / 1.2,
];

function halfLambertParams(): [number, number, number] | null {
  try {
    const q = new URLSearchParams(location.search);
    if (q.get('halfLambert') === '0') return null;
    const wrap = q.get('hlWrap')?.split(',').map(Number);
    if (wrap?.length === 3 && wrap.every(n => !isNaN(n))) {
      return wrap as [number, number, number];
    }
  } catch {
    /* no location (tests) — use the default */
  }
  return HALF_LAMBERT_DEFAULT;
}

const halfLambert = halfLambertParams();

/**
 * `target` is the running lit sum the fill lands on: `diffuseBase` on the
 * Standard path (the UNCLAMP recompute multiplies it by the texel after
 * this), `finalColor.rgb` on the PBR path — there the albedo has to be
 * applied by hand, the diffuse composition is already done.
 */
const halfLambertGlsl = (target: string, albedo: string) => `
  if (${SUN_COLOR_UNIFORM}.r + ${SUN_COLOR_UNIFORM}.g + ${SUN_COLOR_UNIFORM}.b > 0.0) {
    float hlDot = dot(normalW, -${SUN_DIR_UNIFORM});
    float hlFill = max(
      max(hlDot * ${SUN_WRAP_UNIFORM}.x + ${SUN_WRAP_UNIFORM}.y, ${SUN_WRAP_UNIFORM}.z) - max(hlDot, 0.0),
      0.0);
    ${target} += ${SUN_COLOR_UNIFORM} * hlFill${albedo ? ` * ${albedo}` : ''};
  }
`;

/** Per-draw sun uniforms for the half-lambert fill; zero colour = off. */
function bindSunWrap(effect: Effect, mesh: AbstractMesh) {
  const wrap = halfLambert;
  const sun = wrap ? sunLightOf(mesh.getScene()) : null;

  if (!wrap || !sun || sun.intensity <= 0) {
    effect.setFloat3(SUN_COLOR_UNIFORM, 0, 0, 0);
    return;
  }

  const d = sun.direction;
  const norm = 1 / (Math.hypot(d.x, d.y, d.z) || 1);
  effect.setFloat3(SUN_DIR_UNIFORM, d.x * norm, d.y * norm, d.z * norm);
  effect.setFloat3(
    SUN_COLOR_UNIFORM,
    sun.diffuse.r * sun.intensity,
    sun.diffuse.g * sun.intensity,
    sun.diffuse.b * sun.intensity
  );
  effect.setFloat3(SUN_WRAP_UNIFORM, wrap[0], wrap[1], wrap[2]);
}

/** itemFx bit layout (float-packed, read with int() in the shader). */
const FX_LEVEL_MASK = 0x0f;
const FX_EXCELLENT = 0x10;
const FX_ANCIENT = 0x20;
const FX_LEGACY = 0x40;
const FX_SPECIALS = 0x80; // render level > 0: excellent / ancient passes allowed
const FX_CHROME2_FROM_LIGHT = 0x100; // PartObjectColor2 case 0: tint = scene light

/**
 * Weight of the legacy additive chrome passes. 1.0 is the original's math
 * exactly; the original's framebuffer clips at 1 while ours is tone mapped
 * and exposed, so the passes are eased a little to land on the same look.
 */
const LEGACY_GAIN = '0.65';

const BRIGHT_OVERRIDE = `
  color.rgb = baseColor.rgb * vDiffuseColor.rgb;
`;

/**
 * Babylon's Standard fragment clamps the lighting sum before the texture
 * multiply; this re-derives the colour without the clamp so warm light stays
 * warm past 1.0 (clamped lighting is why warm light reads
 * green"). `muBodyLight` stands where `vDiffuseColor` did — that one lives
 * in the Material UBO and never took a per-mesh write.
 */
const UNCLAMP = `
  color.rgb = diffuseBase * ${BODY_LIGHT_UNIFORM}.rgb * baseColor.rgb * baseAmbientColor;
`;

const FLAT_LIT_OVERRIDE = `
  color.rgb = baseColor.rgb * vDiffuseColor.rgb;
`;

/**
 * The original client's item passes (ZzzObject.cpp `RenderPartObjectEffect`,
 * ZzzBMD.cpp `RenderMesh`), folded into one fragment: every pass there is an
 * additive (GL_ONE, GL_ONE) redraw of the mesh with a chrome texture looked up
 * by the world-space normal, so summing them here is exact up to the
 * per-vertex light term (we use Babylon's lambert sum, `diffuseBase`).
 *
 * MU is Z-up with Y forward; Babylon here is Y-up with Z forward, so the
 * original's `normal[0..2]` is `(normalW.x, normalW.z, normalW.y)`.
 * `WorldTime` is milliseconds; `time` is seconds.
 */
type ShaderVars = {
  /** The fragment being composed (vec4). */
  color: string;
  /** The raw diffuse/albedo texel (vec4). */
  texel: string;
  /** BodyLight × BlendMeshLight per mesh (vec4, alpha = visibility). */
  bodyLight: string;
};

const STANDARD_VARS: ShaderVars = {
  color: 'color',
  texel: 'baseColor',
  bodyLight: BODY_LIGHT_UNIFORM,
};

const PBR_VARS: ShaderVars = {
  color: 'finalColor',
  texel: 'albedoTexture',
  bodyLight: BODY_LIGHT_UNIFORM,
};

const legacyPasses = ({ color, texel, bodyLight }: ShaderVars) => `
    int fx = int(${ITEM_FX_UNIFORM});
    int fxLevel = fx & ${FX_LEVEL_MASK};
    bool fxExc = (fx & ${FX_EXCELLENT}) != 0;
    bool fxAnc = (fx & ${FX_ANCIENT}) != 0;
    bool fxLegacy = (fx & ${FX_LEGACY}) != 0;
    bool fxSpecials = (fx & ${FX_SPECIALS}) != 0;
    bool fxChrome2Light = (fx & ${FX_CHROME2_FROM_LIGHT}) != 0;

    // Improved look: the GlowLayer draws a soft capped halo (itemHaloAt);
    // this is the in-surface part. Two rules keep the armor readable at high
    // levels: the sheen rides the texel's own brightness squared, so the
    // tint lands on trim and metal detail while dark leather keeps its
    // texture (a flat add drowned everything into one bright shape), and
    // the view-dependent rim stays a thin edge light.
    if (itemGlow.r + itemGlow.g + itemGlow.b > 0.0) {
      float rim = 1.0 - clamp(dot(normalize(viewDirectionW), normalW), 0.0, 1.0);
      rim = rim * rim * rim;
      float texLum = dot(${texel}.rgb, vec3(0.299, 0.587, 0.114));
      ${color}.rgb += itemGlow * (0.3 * texLum * texLum + 0.35 * rim);
    }

    if (fxLegacy) {
      float tms = time * 1000.0;
      vec3 nm = vec3(normalW.x, normalW.z, normalW.y);
      // RENDER_TEXTURE passes are vertex lit (BodyLight × IntensityTransform,
      // 0.2…1.2); the chrome passes are not — glColor3fv(BodyLight) only.
      vec3 lit = clamp(diffuseBase, vec3(0.2), vec3(1.2));
      float fade = ${LEGACY_GAIN};

      if (fxLevel >= 3 && fxLevel < 5) {
        // +3 / +4: g_Luminosity tint, red (SceneManager.cpp:961, ZzzObject.cpp:10213)
        float L = sin(tms * 0.004) * 0.15 + 0.6;
        ${color}.rgb *= vec3(L, L * 0.6, L * 0.6);
      } else if (fxLevel >= 5 && fxLevel < 7) {
        // +5 / +6: blue
        float L = sin(tms * 0.004) * 0.15 + 0.6;
        ${color}.rgb *= vec3(L * 0.5, L * 0.7, L);
      } else if (fxLevel >= 7) {
        ${color}.rgb *= fxLevel < 9 ? 0.8 : 0.9;

        float wave = mod(tms, 10000.0) * 0.0001;

        // RENDER_CHROME | RENDER_BRIGHT: Chrome01 × PartObjectColor, added
        // (ZzzBMD.cpp RenderMesh: glColor3fv(BodyLight), GL_ONE, GL_ONE)
        vec2 uvChrome = vec2(nm.z * 0.5 + wave, nm.y * 0.5 + wave * 2.0);
        ${color}.rgb += texture2D(chromeSampler, uvChrome).rgb * chromeColor * fade;

        if (fxLevel >= 9) {
          // RENDER_METAL | RENDER_BRIGHT: Shiny01 with the static chrome coords
          vec2 uvMetal = vec2(nm.z * 0.5 + 0.2, nm.y * 0.5 + 0.5);
          ${color}.rgb += texture2D(shinySampler, uvMetal).rgb * chromeColor * fade;
        }

        if (fxLevel >= 11) {
          vec3 c2 = fxChrome2Light ? ${bodyLight}.rgb : chrome2Color;
          vec2 uv2;
          if (fxLevel < 13) {
            // RENDER_CHROME2
            float w2 = mod(tms, 5000.0) * 0.00024 - 0.4;
            uv2 = vec2((nm.z + nm.x) * 0.8 + w2 * 2.0, (nm.y + nm.x) + w2 * 3.0);
          } else {
            // RENDER_CHROME4: rotating light vector
            vec3 Lv = vec3(cos(tms * 0.001), sin(tms * 0.002), 1.0);
            float d = dot(nm, Lv);
            uv2 = vec2(d + nm.y * 0.5 + Lv.y * 3.0, (1.0 - d) - (nm.z * 0.5 + wave * 3.0));
          }
          ${color}.rgb += texture2D(chrome2Sampler, uv2).rgb * c2 * fade;
        }
      }

      if (fxSpecials) {
        if (fxExc) {
          // Excellent: the item's own texture re-drawn additively, tinted
          // (L, 0.3L, 1-L) with L = sin(t*0.002)*0.5+0.5 (ZzzObject.cpp:10322)
          float L = sin(tms * 0.002) * 0.5 + 0.5;
          ${color}.rgb += ${texel}.rgb * vec3(L, L * 0.3, 1.0 - L) * lit;
        } else if (fxAnc) {
          // Ancient: RENDER_CHROME3 at alpha sin(t*0.001)*0.5+0.4 (:10374)
          float a = sin(tms * 0.001) * 0.5 + 0.4;
          if (a > 0.01) {
            vec3 LV = vec3(0.0, -0.1, -0.8);
            float d = dot(nm, LV);
            ${color}.rgb += texture2D(chrome2Sampler, vec2(d, 1.0 - d)).rgb * ancientColor * a * fade;
          }
        }
      }
    }
`;

let chromeTextures: { chrome: Texture; shiny: Texture; chrome2: Texture } | null =
  null;
let chromeScene: Scene | null = null;

/** Effect/Chrome01 (repeat), Effect/Shiny01, Effect/Chrome02 (clamp, nearest). */
function getChromeTextures(scene: Scene) {
  if (chromeTextures && chromeScene === scene) return chromeTextures;

  const load = (file: string, clamp: boolean, nearest: boolean) => {
    const texture = new Texture(
      resolveDataUrl(`Effect/${file}`),
      scene,
      false,
      false,
      nearest ? Texture.NEAREST_SAMPLINGMODE : Texture.BILINEAR_SAMPLINGMODE
    );
    texture.name = `legacy_${file}`;
    if (clamp) {
      texture.wrapU = Texture.CLAMP_ADDRESSMODE;
      texture.wrapV = Texture.CLAMP_ADDRESSMODE;
    }
    return texture;
  };

  chromeScene = scene;
  chromeTextures = {
    chrome: load('Chrome01.jpg', false, false),
    shiny: load('Shiny01.jpg', true, false),
    chrome2: load('Chrome02.jpg', true, true),
  };

  return chromeTextures;
}

type ItemMaterial = CustomMaterial | PBRCustomMaterial;

/** The item-effect uniforms both variants share. */
function addItemUniforms(material: ItemMaterial, scene: Scene) {
  const textures = getChromeTextures(scene);

  material.AddUniform(ITEM_FX_UNIFORM, 'float', 0);
  material.AddUniform(SNOW_CAP_UNIFORM, 'float', 0);
  material.AddUniform(SUN_DIR_UNIFORM, 'vec3', null);
  material.AddUniform(SUN_COLOR_UNIFORM, 'vec3', null);
  material.AddUniform(SUN_WRAP_UNIFORM, 'vec3', null);
  material.AddUniform('time', 'float', 0);
  material.AddUniform('chromeColor', 'vec3', null);
  material.AddUniform('chrome2Color', 'vec3', null);
  material.AddUniform('ancientColor', 'vec3', null);
  material.AddUniform('itemGlow', 'vec3', null);
  material.AddUniform('chromeSampler', 'sampler2D', textures.chrome);
  material.AddUniform('shinySampler', 'sampler2D', textures.shiny);
  material.AddUniform('chrome2Sampler', 'sampler2D', textures.chrome2);
}

/**
 * Per-draw item state: effect bits, chrome tints, improved glow. Both
 * variants run this from their bind observer; the materials are frozen and
 * shared, so everything per mesh has to go through here.
 */
function bindItemEffect(effect: Effect, mesh: AbstractMesh, time: number) {
  effect.setFloat('time', time + (mesh.metadata?.timeOffset ?? 0));

  bindSunWrap(effect, mesh);

  const tier = mesh.metadata?.itemTier as ItemVisualTier | null | undefined;

  let fx = 0;

  // Blend (bright) meshes are additive glow cards already; the original
  // skips NoneBlendMesh meshes in its chrome passes the same way.
  if (
    tier &&
    tier.active &&
    legacyItemEffectsOn() &&
    !mesh.metadata?.brightMesh
  ) {
    fx = (tier.level & FX_LEVEL_MASK) | FX_LEGACY;
    if (tier.isExcellent) fx |= FX_EXCELLENT;
    if (tier.isAncient) fx |= FX_ANCIENT;
    if (legacyRenderLevel() > 0) fx |= FX_SPECIALS;
    if (tier.legacy.chrome2 === null) fx |= FX_CHROME2_FROM_LIGHT;

    const { chrome, chrome2, ancient } = tier.legacy;
    effect.setFloat3('chromeColor', chrome[0], chrome[1], chrome[2]);
    if (chrome2) {
      effect.setFloat3('chrome2Color', chrome2[0], chrome2[1], chrome2[2]);
    } else {
      effect.setFloat3('chrome2Color', 1, 1, 1);
    }
    effect.setFloat3('ancientColor', ancient[0], ancient[1], ancient[2]);
  }

  effect.setFloat(ITEM_FX_UNIFORM, fx);

  // Snow caps: only map props flagged for it, never a glow card. The mesh's
  // tile decides whether it stands under a roof.
  let cap = 0;
  if (mesh.metadata?.snowCap && !mesh.metadata.brightMesh) {
    const p = mesh.absolutePosition;
    cap = snowCapAt(p.x, p.z);
  }
  effect.setFloat(SNOW_CAP_UNIFORM, cap);

  if (
    tier &&
    tier.improvedActive &&
    improvedItemEffectsOn() &&
    !mesh.metadata?.brightMesh
  ) {
    const g = itemEmissiveAt(tier, itemGlowClock(), glowScratch);
    effect.setFloat3('itemGlow', g.r, g.g, g.b);
  } else {
    effect.setFloat3('itemGlow', 0, 0, 0);
  }
}

/**
 * BodyLight × BlendMeshLight × the mood's bake tint (or the explicit per-mesh
 * colour), alpha = visibility. The caller has already written the neutral
 * (1, 1, 1, visibility); without the unified model the bake is left out and
 * only the explicit colour lands, which is the older behaviour.
 */
function bindBodyLight(effect: Effect, mesh: AbstractMesh, uniform: string) {
  const bodyLight = mesh.metadata?.bodyLight;

  if (bodyLight && UNIFIED_LIGHT_MODEL) {
    const blend = mesh.metadata?.blendMeshLight ?? 1;

    effect.setFloat4(
      uniform,
      bodyLight.x * blend * bodyLightTint[0],
      bodyLight.y * blend * bodyLightTint[1],
      bodyLight.z * blend * bodyLightTint[2],
      mesh.visibility
    );
  }

  if (mesh.metadata?.diffuseColor) {
    effect.setColor4(
      uniform,
      mesh.metadata.diffuseColor,
      mesh.metadata.diffuseColor.a
    );
  }
}

function trackTime(scene: Scene, onReady: (now: () => number) => void) {
  let time = 0;

  scene.onReadyObservable.addOnce(() => {
    scene.onBeforeRenderObservable.add(() => {
      time += scene.getEngine()!.getDeltaTime()! / 1000;
    });

    onReady(() => time);
  });
}

/**
 * `BlendMeshTexCoordU/V` (ZzzBMD.cpp `EnableWave`, :2146): the original adds a
 * per-object offset to every texel lookup of one mesh, which is how water,
 * waterfalls, sand-falls and the Dungeon flesh curtains move.
 *
 * Babylon's own texture matrix cannot carry it here: the shared item material
 * is frozen, its `diffuseTexture` is a single placeholder, and the real
 * texture is rebound per mesh in `onBindObservable`. With an identity
 * placeholder Babylon compiles `DIFFUSEDIRECTUV = 1`, so `vDiffuseUV` is the
 * raw attribute and there is no matrix uniform left to write.
 *
 * So the offset is its own uniform and the texel is re-fetched in the
 * fragment, at `CUSTOM_FRAGMENT_UPDATE_DIFFUSE` — the first hook that runs
 * after `baseColor = texture2D(diffuseSampler, vDiffuseUV + uvOffset)`.
 *
 * **Do not move this to the vertex stage.** Offsetting the varying there
 * looks better on paper (one fetch, and the alpha test would see the scrolled
 * texel) and it does not compile: `vDiffuseUV` is a *fragment-only* symbol.
 * Babylon declares it through `samplerFragmentDeclaration`, and when the
 * texture matrix is identity — which the shared placeholder always is, so
 * `DIFFUSEDIRECTUV = 1` — it is a `#define` onto `vMainUV1` emitted into the
 * fragment shader alone. Writing to it from `Vertex_MainEnd` is an undeclared
 * identifier, the program fails to link, and Babylon dumps the whole shader
 * to the console. Tried, reverted; this comment is the record.
 *
 * The `#ifdef DIFFUSE` guard is not decoration either: `diffuseSampler` and
 * `vDiffuseUV` both live inside that block, so an unguarded body would fail
 * the same way on any variant compiled without a diffuse texture.
 *
 * What this costs is the alpha test, which runs on the *unscrolled* texel a
 * few lines earlier. It shows only on alpha-keyed scrollers — Noria's
 * waterfall curtains (42/43) and Lost Tower's conduits (3/4) — where the
 * texture slides inside a key that stays put. Both are near-uniform masks, so
 * it is close to invisible; the fix, when it matters, is
 * `ALPHATEST_AFTERALLALPHACOMPUTATIONS`, which Babylon does not expose here.
 *
 * It exists only on the bright/flat-lit variants — the ones MU marks
 * `BlendMesh` or `StreamMesh`, which is every mesh that can scroll — so the
 * ordinary lit path compiles exactly as before.
 */
const UV_SCROLL_UNIFORM = 'muUvScroll';

const UV_SCROLL_RESAMPLE = `
  #ifdef DIFFUSE
    if (${UV_SCROLL_UNIFORM}.x != 0.0 || ${UV_SCROLL_UNIFORM}.y != 0.0) {
      baseColor = texture2D(diffuseSampler, vDiffuseUV + ${UV_SCROLL_UNIFORM});
    }
  #endif
`;

/** Per-mesh scroll offset, written each frame by the object that owns it. */
export type UvScroll = { u: number; v: number };

/**
 * Give a shared item material a **per-mesh** alpha-test texture.
 *
 * Every off-screen pass Babylon runs — the geometry buffer, the cascades, the
 * glow layer — alpha-tests with its own effect, not the material's, so none of
 * them ever reaches `onBindObservable`. What they bind into `diffuseSampler`
 * is whatever `getAlphaTestTexture()` hands back, and on a shared material
 * that is the 2×2 opaque placeholder: alpha 1 everywhere, so the test passes
 * everywhere and a keyed mesh writes its whole quad. That is why the G-buffer
 * could only ever hold the opaque meshes — grass and leaves went into it as
 * solid blocks and SSAO smeared them across the ground.
 *
 * Babylon always calls `needAlphaTestingForMesh(mesh)` immediately before
 * `getAlphaTestTexture()` — geometryBufferRenderer, shadowGenerator and
 * thinEffectLayer all do, and the `&&` between them fixes the order — so the
 * first is where the mesh is picked up and the second is where its texture is
 * handed over. Same trick `createCsm` uses through
 * `onBeforeShadowMapRenderMeshObservable`, expressed through the API the
 * other passes actually query.
 *
 * The lit path is untouched: `isReadyForSubMesh` reads `_diffuseTexture` /
 * `_albedoTexture` directly, and the placeholder still stands in whenever no
 * mesh is being rendered, so the ALPHATEST define never flickers.
 */
export function useMeshAlphaTestTexture(material: Material): void {
  const placeholder = material.getAlphaTestTexture();
  const needsTest = material.needAlphaTestingForMesh.bind(material);

  let current: AbstractMesh | null = null;

  material.needAlphaTestingForMesh = (mesh: AbstractMesh) => {
    current = mesh;
    return needsTest(mesh);
  };

  material.getAlphaTestTexture = () =>
    (current?.metadata?.diffuseTexture as BaseTexture | undefined) ??
    placeholder;
}

export function createItemMaterial(
  scene: Scene,
  bright = false,
  flatLit = false,
  withScroll = false
) {
  const simpleMaterial = new CustomMaterial('itemMaterial', scene);

  simpleMaterial.diffuseColor.setAll(1);

  simpleMaterial.specularColor.setAll(0);

  simpleMaterial.maxSimultaneousLights = 2 + pointLightPoolSize();

  addItemUniforms(simpleMaterial, scene);
  // Outside the Material UBO, so the per-mesh write below actually lands —
  // see bindBodyLight and the Standard path never applied
  // BodyLight".
  simpleMaterial.AddUniform(BODY_LIGHT_UNIFORM, 'vec4', null);

  // Glow cards and flat-lit UI models never take a cap; the uniform is
  // still declared for them (addItemUniforms) and simply unread.
  simpleMaterial.Fragment_Custom_Diffuse(`
${withScroll ? UV_SCROLL_RESAMPLE : ''}
${bright || flatLit ? '' : snowCapGlsl('baseColor')}
  `);
  if (withScroll) {
    simpleMaterial.AddUniform(UV_SCROLL_UNIFORM, 'vec2', null);
  }

  simpleMaterial.Fragment_Before_FragColor(legacyPasses(STANDARD_VARS));

  // The half-lambert fill lands on `diffuseBase` before the UNCLAMP
  // recompute reads it; glow cards and flat-lit models take neither.
  simpleMaterial.Fragment_Before_Fog(`
${bright || flatLit ? '' : halfLambertGlsl('diffuseBase', '') + UNCLAMP}${
    bright ? BRIGHT_OVERRIDE : ''
  }${flatLit ? FLAT_LIT_OVERRIDE : ''}
`);

  trackTime(scene, now => {
    simpleMaterial.onBindObservable.add(mesh => {
      const effect = simpleMaterial.getEffect();
      if (!effect) return;

      bindItemEffect(effect, mesh, now());

      effect.setTexture('diffuseSampler', mesh.metadata!.diffuseTexture);

      if (withScroll) {
        const scroll = mesh.metadata!.uvScroll as UvScroll | undefined;
        effect.setFloat2(UV_SCROLL_UNIFORM, scroll?.u ?? 0, scroll?.v ?? 0);
      }

      effect.setFloat4(BODY_LIGHT_UNIFORM, 1, 1, 1, mesh.visibility);
      bindBodyLight(effect, mesh, BODY_LIGHT_UNIFORM);
    });
  });

  return simpleMaterial;
}

/**
 * Gain on the derived/authored emissive map. It is added after lighting so
 * gems and trim hold their colour in shadow; the GlowLayer picks the same
 * map up through `sceneLook`'s texture selector.
 */
const PBR_EMISSIVE_GAIN = '0.35';

/*
 * There is deliberately no diffuse-loss compensation for metalness any more.
 *
 * The old one scaled `surfaceAlbedo` up at the metallic-roughness anchor so a
 * texel the palette heuristic called 'metal' would not go dark without an
 * environment map to reflect. But `pbrBlockReflectivity` captures
 * `vec3 baseColor = surfaceAlbedo;` immediately *after* that anchor and builds
 * `surfaceReflectivityColor = mix(metallicF0, baseColor, metallic)` from it,
 * so the boost landed on the metallic F0 as well — up to 1.6× at the old
 * METAL_MAX. Lorencia's oak and stone got a conductor's reflectance on top of
 * a diffuse that had barely dimmed: energy added twice, which is the broad
 * yellow sheen Enhanced showed across the tavern floor and counter.
 *
 * The two cannot be separated at this anchor (`surfaceReflectivityColor` is
 * already written by the next one), and they should not be: 'keep more
 * diffuse' and 'reflect less like metal' are the same physical statement.
 * `METAL_MAX` in `pbrMaps.ts` is now the single knob for both.
 */

/**
 * Enhanced variant: the same per-mesh contract as
 * `createItemMaterial` — shared, frozen, `diffuseTexture` / `bodyLight` /
 * `itemTier` read off `mesh.metadata` at bind — on a metallic-roughness PBR
 * shader with normal, metal/rough and emissive maps per texture
 * (`pbrMaps.ts`). Classic stays the Standard path; only lit, non-blend
 * meshes ever get this material (see `modelLoader.getMaterial`).
 *
 * Calibration choices, so the toggle is a look change and not an exposure
 * change: the albedo is sampled as-is (no gamma decode — the Standard path
 * multiplies the gamma texel, and the moods/light intensities were tuned
 * against that); light falloff stays Babylon's legacy range curve, matching
 * the pooled torches' tuned ranges; no environment map, so specular only
 * comes from the key lights and the torch pool (their `specular` is raised
 * off black while this material is on — `syncMaterialQuality`).
 */
export function createItemPbrMaterial(scene: Scene) {
  const material = new PBRCustomMaterial('itemPbrMaterial', scene);
  const flat = pbrPlaceholders(scene);

  material.maxSimultaneousLights = 2 + pointLightPoolSize();

  material.albedoColor.setAll(1);
  material.metallic = 1;
  material.roughness = 1;
  pbrMaterials.add(material);
  material.useMetallnessFromMetallicTextureBlue = true;
  material.useRoughnessFromMetallicTextureGreen = true;
  material.useRoughnessFromMetallicTextureAlpha = false;
  material.metallicTexture = flat.metallicRoughness;
  material.bumpTexture = flat.normal;
  material.usePhysicalLightFalloff = false;
  material.enableSpecularAntiAliasing = true;
  material.environmentIntensity = 0;
  material.ambientColor.setAll(0);

  addItemUniforms(material, scene);
  material.AddUniform(BODY_LIGHT_UNIFORM, 'vec4', null);
  material.AddUniform(KEY_GAIN_UNIFORM, 'float', null);
  material.AddUniform(DETAIL_UNIFORM, 'float', null);
  material.AddUniform('muEmissiveSampler', 'sampler2D', flat.black);

  // BodyLight: the bake's flat per-object light (the unified model).
  // The Standard path takes it as (texel × light)^2.2 through
  // `toLinearSpace` at the end of its fragment, so the bake — a display-
  // domain value, like the texel — is decoded here the same way before it
  // meets the linear albedo; otherwise a 0.5 bake is a stop lighter on
  // Enhanced than on Classic. Applied to `surfaceAlbedo` only: with
  // metallic 0 the dielectric F0 does not read the albedo, so the highlight
  // and the emissive trim added after it keep their calibrated strength.
  // Alpha carries mesh visibility on both paths.
  material.Fragment_Custom_Albedo(`
    ${
      UNIFIED_LIGHT_MODEL
        ? `surfaceAlbedo *= pow(max(${BODY_LIGHT_UNIFORM}.rgb, vec3(0.0)), vec3(2.2));`
        : ''
    }
    surfaceAlbedo *= ${KEY_GAIN_UNIFORM};
    alpha *= ${BODY_LIGHT_UNIFORM}.a;
${snowCapGlsl('surfaceAlbedo')}
  `);

  material.Fragment_Before_Fog(`
    finalColor.rgb += texture2D(muEmissiveSampler, vAlbedoUV).rgb * ${PBR_EMISSIVE_GAIN} * ${DETAIL_UNIFORM};
${halfLambertGlsl('finalColor.rgb', 'surfaceAlbedo')}
  `);

  material.Fragment_Before_FragColor(legacyPasses(PBR_VARS));

  trackTime(scene, now => {
    material.onBindObservable.add(mesh => {
      const effect = material.getEffect();
      if (!effect) return;

      bindItemEffect(effect, mesh, now());

      const diffuse = mesh.metadata!.diffuseTexture as Texture;
      const maps = pbrMapsFor(diffuse, scene);

      effect.setFloat(KEY_GAIN_UNIFORM, pbrKeyGain());
      effect.setFloat(DETAIL_UNIFORM, pbrDetailStrength());

      effect.setTexture('albedoSampler', diffuse);
      effect.setTexture('bumpSampler', maps?.normal ?? flat.normal);
      effect.setTexture(
        'reflectivitySampler',
        maps?.metallicRoughness ?? flat.metallicRoughness
      );
      effect.setTexture('muEmissiveSampler', maps?.emissive ?? flat.black);

      effect.setFloat4(BODY_LIGHT_UNIFORM, 1, 1, 1, mesh.visibility);
      bindBodyLight(effect, mesh, BODY_LIGHT_UNIFORM);
    });
  });

  return material;
}

/** Diagnostics: the live PBR item materials, for `window.muMat()`. */
export function livePbrMaterials(): PBRCustomMaterial[] {
  return [...pbrMaterials];
}
