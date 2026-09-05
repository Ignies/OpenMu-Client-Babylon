import {
  Observable,
  type ArcRotateCamera,
  type Scene,
} from '../libs/babylon/exports';
import { ENUM_WORLD } from '../common/types';
import { GameOptions } from '../common/gameOptions';
import { lightingTier, tierIndex } from '../common/lightingQuality';
import { linearBufferActive } from '../common/lightModel';
import {
  directLightGain,
  pbrMaterialsOn,
  specularLightScale,
} from '../common/materialQuality';
import { maps } from '../maps';
import { EventBus } from '../libs/eventBus';
import { setKey, setSunDirection, syncSpecular } from './keyRig';
import {
  applyArea,
  areaProfile,
  profileFor,
  toLinear,
  type AreaLookName,
  type LookProfile,
  type Rgb,
} from './profiles';
import { shadowPolicyFor, type ShadowPolicy } from './shadowPolicy';
import { syncShadows } from '../scenes/shadows';
import { syncAmbientOcclusion } from '../scenes/ambientOcclusion';
import { syncHeightFog, updateHeightFog } from '../scenes/heightFog';
import {
  createPostChain,
  TONE_MAPPER_NAMES,
  type PostChain,
  type ToneMapperName,
} from '../scenes/postChain';

/**
 * The look director (ARCHITECTURE §4.3): the one composer. Reads the map's
 * `LookProfile` and `GameOptions`, computes `LookState`, and hands each
 * writer its slice - key rig, shadows, AO, haze, post chain - in a fixed
 * order once a frame. Nothing else writes a light, the pipeline, the fog or
 * the image-processing configuration.
 */

/**
 * The key budget (§3.2): sky share S with the ground at 0.68 S, the sun the
 * rest, so an up-facing surface in the open takes 1.0 - what the bake gives
 * the ground. Colours are neutral; warmth comes from the white balance.
 */
const SKY_SHARE = 0.55;
const SKY_GROUND = 0.68;

const WHITE: Rgb = [1, 1, 1];

/**
 * How much of the hemispheric key the ground gets back under a roof, as a
 * fraction of what an object standing on it receives. The terrain has no key
 * term (outdoors the bake *is* the sky's contribution); indoors the bake is
 * the room's own dark value while the hemisphere still lights the furniture,
 * so without this the candles are the floor's entire light and it takes all
 * of their hue.
 */
const INTERIOR_GROUND_KEY = 0.6;

/** Area (tavern) blend, seconds. */
const BLEND_SECONDS = 0.7;

export type LookState = {
  readonly engine: 'polish';
  readonly tier: 0 | 1 | 2;
  readonly world: ENUM_WORLD;
  readonly area: AreaLookName | null;
  /** After the area override and blend. */
  readonly profile: LookProfile;
  readonly key: {
    readonly skyIntensity: number;
    readonly skyColor: Rgb;
    readonly skyGround: Rgb;
    readonly sunIntensity: number;
    readonly direction: readonly [number, number, number];
    /** The roofed-tile ground key the terrain shader adds (`INTERIOR_GROUND_KEY`). */
    readonly interiorGround: Rgb;
  };
  readonly shadow: ShadowPolicy;
  /** Stops over unity after the player's brightness trim; 0 on Classic. */
  readonly ev: number;
  /** Linear, `2^ev`. */
  readonly exposure: number;
  readonly toneMapper: ToneMapperName;
  readonly fogColorLinear: Rgb;
  /** Names of the live post passes, chain order. */
  readonly passes: readonly string[];
};

export interface LookDirector {
  setMap(world: ENUM_WORLD): void;
  setArea(name: AreaLookName | null): void;
  tick(dt: number): void;
  state(): Readonly<LookState>;
  readonly onChange: Observable<Readonly<LookState>>;
}

let active: LookDirector | null = null;

/** The scene's director, for the readers (terrain, water, area hand-off). */
export function lookDirector(): LookDirector | null {
  return active;
}

/** Dev seam: `?ev=<stops>` adds to the map's exposure for live tuning. */
function evOverride(): number {
  if (!import.meta.env.DEV) return 0;
  try {
    const raw = new URLSearchParams(location.search).get('ev');
    const n = raw === null ? NaN : Number(raw);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

type Blendable = {
  ev: number;
  whiteBalance: [number, number, number];
  fog: {
    start: number;
    density: number;
    cap: number;
    height: number;
    color: [number, number, number] | null;
  };
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function blendable(p: LookProfile): Blendable {
  return {
    ev: p.ev,
    whiteBalance: [...p.whiteBalance],
    fog: { ...p.fog, color: p.fog.color ? [...p.fog.color] : null },
  };
}

function lerpBlendable(a: Blendable, b: Blendable, t: number): Blendable {
  // A haze fading in keeps the colour of the side that has one.
  const color = b.fog.density > 0 ? b.fog.color : a.fog.color;

  return {
    ev: lerp(a.ev, b.ev, t),
    whiteBalance: [
      lerp(a.whiteBalance[0], b.whiteBalance[0], t),
      lerp(a.whiteBalance[1], b.whiteBalance[1], t),
      lerp(a.whiteBalance[2], b.whiteBalance[2], t),
    ],
    fog: {
      start: lerp(a.fog.start, b.fog.start, t),
      density: lerp(a.fog.density, b.fog.density, t),
      cap: lerp(a.fog.cap, b.fog.cap, t),
      height: lerp(a.fog.height, b.fog.height, t),
      color: color ? [...color] : null,
    },
  };
}

export function createLookDirector(
  scene: Scene,
  camera: ArcRotateCamera
): LookDirector {
  const postChain: PostChain = createPostChain(scene, camera);
  const onChange = new Observable<Readonly<LookState>>();
  const evDev = evOverride();

  let world = ENUM_WORLD.WD_0LORENCIA;
  let area: AreaLookName | null = null;
  let base: LookProfile = profileFor(world);
  let target: LookProfile = base;

  let from = blendable(base);
  let shown = blendable(base);
  let blend = 1;

  let state: LookState | null = null;
  let signature = '';
  let mapReady = true;

  const retarget = (): void => {
    const next = area ? applyArea(base, areaProfile(area)) : base;
    if (next === target) return;

    from = shown;
    target = next;
    blend = 0;
  };

  /**
   * The clear colour is the sky until the dome exists (wave 2c owns it from
   * then on). Tiers >= 1 clear to the map's horizon, decoded once when the
   * buffer is linear; Classic and skyless maps keep the authored bytes or
   * black, exactly as before. The map's own sky, not the area's: a tavern
   * has no sky of its own but the doorway still shows the one outside.
   */
  const writeClearColour = (shaped: boolean): void => {
    const horizon = shaped ? base.sky?.horizon ?? null : null;

    if (horizon) {
      const c = linearBufferActive(scene) ? toLinear(horizon) : horizon;
      scene.clearColor.set(c[0], c[1], c[2], 1);
      return;
    }

    const bytes = maps.clearColorFor(world);
    if (bytes) scene.clearColor.set(bytes[0] / 256, bytes[1] / 256, bytes[2] / 256, 1);
    else scene.clearColor.set(0, 0, 0, 1);
  };

  const tick = (dt: number): void => {
    if (blend < 1) {
      blend = Math.min(1, blend + dt / BLEND_SECONDS);
      const t = blend * blend * (3 - 2 * blend);
      shown = lerpBlendable(from, blendable(target), t);
    }

    const tier = tierIndex() as 0 | 1 | 2;
    const lightTier = lightingTier();
    const shaped = lightTier !== null;
    const post = GameOptions.postProcessing;

    const profile: LookProfile = {
      ...target,
      ev: shown.ev,
      whiteBalance: shown.whiteBalance,
      fog: shown.fog,
    };

    // 1. key
    const skyIntensity = shaped ? SKY_SHARE : 1;
    const sunShare = shaped ? 1 - SKY_SHARE : 0;
    const skyGround: Rgb = shaped
      ? [SKY_GROUND, SKY_GROUND, SKY_GROUND]
      : WHITE;

    setKey(scene, {
      skyIntensity,
      skyDiffuse: WHITE,
      skyGround: shaped ? skyGround : null,
      sunIntensity: sunShare * directLightGain(),
      sunDiffuse: WHITE,
    });

    // 2. shadow policy
    const shadow = shadowPolicyFor(profile, sunShare, lightTier?.pcss ?? false);

    setSunDirection(scene, shadow.direction);
    syncSpecular(scene, pbrMaterialsOn() ? specularLightScale() : 0);

    // 3. shadows (CSM + terrain hook + the blobs' re-park)
    syncShadows(scene, lightTier, shadow);

    // 4. sky (clear colour until the dome exists)
    writeClearColour(shaped);

    // 5. haze and AO
    const fogSource = profile.fog.color ?? base.sky?.horizon ?? null;
    const fogColorLinear: Rgb = fogSource ? toLinear(fogSource) : [0, 0, 0];

    let reordered = syncAmbientOcclusion(scene, camera, lightTier, post);
    reordered =
      syncHeightFog(scene, camera, shaped ? profile.fog : { ...profile.fog, density: 0 }, fogColorLinear, post) ||
      reordered;
    updateHeightFog(camera, dt);

    if (reordered) postChain.moveToEnd();

    // 6. post
    const ev = shaped ? profile.ev + GameOptions.brightness / 10 + evDev : 0;
    const exposure = 2 ** ev;
    const toneMapperIndex = shaped && post ? Math.max(0, Math.min(3, Math.round(GameOptions.toneMapper))) : 0;

    postChain.set({
      shaped,
      exposure,
      toneMapper: toneMapperIndex,
      whiteBalance: profile.whiteBalance,
    });

    // 7. publish
    const passes = [
      ...(shaped && post ? ['ssao'] : []),
      ...(shaped && post && profile.fog.density > 0 ? ['haze'] : []),
      ...postChain.passes(),
    ];

    const groundKey = INTERIOR_GROUND_KEY * skyIntensity;

    state = {
      engine: 'polish',
      tier,
      world,
      area,
      profile,
      key: {
        skyIntensity,
        skyColor: WHITE,
        skyGround: shaped ? [skyGround[0] * skyIntensity, skyGround[1] * skyIntensity, skyGround[2] * skyIntensity] : WHITE,
        sunIntensity: sunShare,
        direction: shadow.direction,
        interiorGround: [groundKey, groundKey, groundKey],
      },
      shadow,
      ev,
      exposure,
      toneMapper: TONE_MAPPER_NAMES[toneMapperIndex],
      fogColorLinear,
      passes,
    };

    const next = [
      tier,
      world,
      area,
      ev.toFixed(3),
      toneMapperIndex,
      profile.whiteBalance.map(v => v.toFixed(3)).join(),
      profile.fog.density.toFixed(4),
      passes.join(),
    ].join('|');

    if (next !== signature) {
      signature = next;
      onChange.notifyObservers(state);
    }

    if (!mapReady) {
      mapReady = true;
      EventBus.emit('look.mapReady', { world });
    }
  };

  const director: LookDirector = {
    setMap(next) {
      world = next;
      area = null;
      base = profileFor(next);
      target = base;
      from = shown = blendable(base);
      blend = 1;
      mapReady = false;
    },
    setArea(name) {
      if (name === area) return;
      area = name;
      retarget();
      EventBus.emit('look.areaChanged', { name });
    },
    tick,
    state() {
      if (!state) tick(0);
      return state!;
    },
    onChange,
  };

  active = director;
  (globalThis as { __lighting?: unknown }).__lighting = director;

  return director;
}
