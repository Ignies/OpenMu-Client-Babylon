import {
  Observable,
  type ArcRotateCamera,
  type Scene,
} from '../render/babylon/exports';
import { ENUM_WORLD } from '../../core/types';
import { GameOptions } from '@/controllers/settings';
import { lightingTier, tierIndex } from './lightingQuality';
import {
  inkLinesActive,
  renderingStyle,
  styleIndex,
  syncRenderingStyle,
} from '../render/renderingStyle';
import { linearBufferActive } from './lightModel';
import {
  directLightGain,
  pbrMaterialsOn,
  specularLightScale,
} from '../render/materialQuality';
import { devQueryNumber, devQueryNumbers } from '../../core/devSeams';
import { maps } from '../maps';
import { EventBus } from '../../core/eventBus';
import {
  DEFAULT_SUN_DIRECTION,
  setKey,
  setSunDirection,
  syncSpecular,
} from './keyRig';
import {
  applyArea,
  areaProfile,
  profileFor,
  toLinear,
  type AreaLookName,
  type AreaRect,
  type LookProfile,
  type Rgb,
  type RoomVolume,
  NO_FOG,
  NO_OMEN,
  composeBalance,
  omenProfile,
  type OmenLook,
  type OmenLookName,
  SKY_SUN_DEFAULT,
} from './profiles';
import {
  CLASSIC_SHADOW_POLICY,
  shadowPolicyFor,
  type KeptShadowPolicy,
  type ShadowPolicy,
} from './shadowPolicy';
import { syncSkyDome } from './skyDome';
import { syncSkyline } from './horizon';
import { setLookDirector } from './activeDirector';
import { syncShadows, syncTerrainDefines } from '@/controllers/render/shadows';
import {
  syncAmbientOcclusion,
  syncAmbientOcclusionSamples,
  syncEffectMask,
  syncInkOutline,
  inkOutlineLive,
  syncHullOutline,
  syncSpeedLines,
  speedLinesLive,
  syncHeightFog,
  updateHeightFog,
  syncRoomMask,
  syncToneMap,
  toneMapLive,
  syncFireflyGuard,
  syncFireflyGuardSamples,
  syncSunShafts,
  sunShaftsLive,
  syncUpscale,
  syncUpscaleSamples,
  upscaleScale,
  createPostChain,
  TONE_MAPPER_NAMES,
  type PostChain,
  type ToneMapperName,
} from '@/controllers/render/scenes';

/**
 * The look director: the one composer. Reads the map's
 * `LookProfile` and `GameOptions`, computes `LookState`, and hands each
 * writer its slice - key rig, shadows, sky, AO, haze, post chain - in a fixed
 * order once a frame. It writes no Babylon state itself.
 */

/**
 * The key budget (§3.2): the sun takes the profile's share, the sky the rest
 * with the ground at 0.68 of it, so an up-facing surface in the open takes
 * 1.0 - what the bake gives the ground. Colours are neutral; warmth comes
 * from the white balance.
 */
const SKY_GROUND = 0.68;

const WHITE: Rgb = [1, 1, 1];
const BLACK: Rgb = [0, 0, 0];
const SKY_GROUND_RGB: Rgb = [SKY_GROUND, SKY_GROUND, SKY_GROUND];

/** Area (tavern) blend, seconds; an omen fades on the same clock. */
const BLEND_SECONDS = 0.7;

/** An area named without a footprint masks nothing. */
const WHOLE_MAP: AreaRect = { minX: 0, minY: 0, maxX: 255, maxY: 255 };

export type LookArea = {
  readonly name: AreaLookName;
  /** The room's footprint in tiles: the roof lift's seed and the mask's frame. */
  readonly rect: AreaRect;
  /** The frame with its heights, when the map gave one; the room mask draws nothing without it. */
  readonly volume: RoomVolume | null;
};

const areaKey = (a: LookArea | null): string =>
  a ? `${a.name}:${a.rect.minX},${a.rect.minY},${a.rect.maxX},${a.rect.maxY}` : '';

export type LookState = {
  readonly engine: 'polish';
  readonly tier: 0 | 1 | 2;
  readonly world: ENUM_WORLD;
  readonly area: LookArea | null;
  /** After the area override and blend. */
  readonly profile: LookProfile;
  readonly key: {
    readonly skyIntensity: number;
    readonly skyColor: Rgb;
    readonly skyGround: Rgb;
    readonly sunIntensity: number;
    readonly direction: readonly [number, number, number];
    /** Gain on the pool lights and the terrain delta: the room's `candles x roomShare` on tiers >= 1, 1 otherwise. */
    readonly emitterGain: number;
    /**
     * The level the *lit* scene runs at: `keyGain` times whatever an event is
     * dimming it by. The key rig, the ground bake and the emitters take this;
     * effect art takes `keyGain` and never this, so a fireball keeps its own
     * brightness while the world under it goes dark - which is the whole
     * reason the original's invasion meteors read as an omen.
     *
     * Unlike `keyGain` it is not 1 on Classic: the dim is the event's light,
     * not a grade, and the flat tier has to show it.
     */
    readonly sceneGain: number;
    /**
     * The key's share of the map's level inside a room (`AreaLook.keyLevel /
     * keyGain`, §13 F14): the rig, the ground bake and the emitters all take
     * it. 1 outside a room and on Classic.
     */
    readonly roomShare: number;
  };
  readonly shadow: ShadowPolicy;
  /** Stops over unity after the player's brightness trim; 0 on Classic. */
  readonly ev: number;
  /**
   * `2^(profile ev)`: the level of the light (§13 F4). Every lit path
   * multiplies by it once - key rig, ground light sum, point-light pool -
   * and emissive art never does. 1 on Classic.
   */
  readonly keyGain: number;
  /** The frame's effective level, `keyGain x post exposure`. */
  readonly exposure: number;
  readonly toneMapper: ToneMapperName;
  /** The rendering style in force: 0 Classic (and every style on tier 0), 1 cel, 2 anime. */
  readonly style: number;
  readonly fogColorLinear: Rgb;
  /** Names of the live post passes, chain order. */
  readonly passes: readonly string[];
};

export interface LookDirector {
  setMap(world: ENUM_WORLD): void;
  setArea(name: AreaLookName | null, rect?: AreaRect | RoomVolume): void;
  /** An event's modifier over the map and area already resolved; null clears it. */
  setOmen(name: OmenLookName | null): void;
  tick(dt: number): void;
  state(): Readonly<LookState>;
  readonly onChange: Observable<Readonly<LookState>>;
}

export { lookDirector } from './activeDirector';

type Rgb3 = [number, number, number];

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

type Blendable = {
  ev: number;
  /** Gain on the room's emitters (`AreaLook.candles`); 1 outside. */
  candles: number;
  /** The key's share of the map's level (`AreaLook.keyLevel / 2^ev`); 1 outside. */
  roomShare: number;
  whiteBalance: Rgb3;
  fog: {
    start: number;
    density: number;
    cap: number;
    height: number;
    color: Rgb3 | null;
    fromTarget?: boolean;
  };
  /** The buffer `fog.color` points at while there is a colour. */
  fogColor: Rgb3;
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function setRgb(out: Rgb3, c: Rgb): Rgb3 {
  out[0] = c[0];
  out[1] = c[1];
  out[2] = c[2];
  return out;
}

const newBlendable = (): Blendable => ({
  ev: 0,
  candles: 1,
  roomShare: 1,
  whiteBalance: [1, 1, 1],
  fog: { start: 0, density: 0, cap: 0, height: 0, color: null, fromTarget: undefined },
  fogColor: [0, 0, 0],
});

function setFog(
  out: Blendable,
  start: number,
  density: number,
  cap: number,
  height: number,
  color: Rgb | null,
  fromTarget: boolean | undefined
): void {
  const fog = out.fog;
  fog.start = start;
  fog.density = density;
  fog.cap = cap;
  fog.height = height;
  fog.color = color ? setRgb(out.fogColor, color) : null;
  fog.fromTarget = fromTarget;
}

/** `out` takes another blendable's values, or a profile's look outside any room. */
function setBlendable(out: Blendable, a: Blendable | LookProfile): Blendable {
  const f = a.fog;
  out.ev = a.ev;
  out.candles = 'candles' in a ? a.candles : 1;
  out.roomShare = 'roomShare' in a ? a.roomShare : 1;
  setRgb(out.whiteBalance, a.whiteBalance);
  setFog(out, f.start, f.density, f.cap, f.height, f.color, f.fromTarget);
  return out;
}

/** `out` is `a` blended by `t` toward `p`'s look with the room's candles and share. */
function lerpBlendable(
  out: Blendable,
  a: Blendable,
  p: LookProfile,
  candles: number,
  roomShare: number,
  t: number
): void {
  // A haze fading in keeps the colour of the side that has one.
  const color = p.fog.density > 0 ? p.fog.color : a.fog.color;

  out.ev = lerp(a.ev, p.ev, t);
  out.candles = lerp(a.candles, candles, t);
  out.roomShare = lerp(a.roomShare, roomShare, t);
  out.whiteBalance[0] = lerp(a.whiteBalance[0], p.whiteBalance[0], t);
  out.whiteBalance[1] = lerp(a.whiteBalance[1], p.whiteBalance[1], t);
  out.whiteBalance[2] = lerp(a.whiteBalance[2], p.whiteBalance[2], t);
  setFog(
    out,
    lerp(a.fog.start, p.fog.start, t),
    lerp(a.fog.density, p.fog.density, t),
    lerp(a.fog.cap, p.fog.cap, t),
    lerp(a.fog.height, p.fog.height, t),
    color,
    p.fog.fromTarget
  );
}

/** A published number as the change signature counts it: in thousandths (`places` 1000). */
const per = (v: number, places: number) => Math.round(v * places);

export function createLookDirector(
  scene: Scene,
  camera: ArcRotateCamera
): LookDirector {
  const postChain: PostChain = createPostChain(scene, camera);
  const onChange = new Observable<Readonly<LookState>>();

  // Dev seams: `?ev=` adds stops, `?wb=r,g,b` replaces the balance, `?tm=0..3`
  // the mapper, `?candles=` the room's emitter gain, `?roomKey=` the room's
  // key level in key units.
  const evDev = devQueryNumber('ev') ?? 0;
  const candlesDev = devQueryNumber('candles');
  const roomKeyDev = devQueryNumber('roomKey');
  const wbDev = devQueryNumbers('wb', 3) as Rgb | null;
  const tmDev = devQueryNumber('tm');

  let world = ENUM_WORLD.WD_0LORENCIA;
  let area: LookArea | null = null;
  let base: LookProfile = profileFor(world);
  let target: LookProfile = base;

  // The omen asked for, the row it is ramping from or to (the last one named,
  // so clearing it fades out of that row rather than snapping), and the ramp.
  let omen: OmenLookName | null = null;
  let omenLook: OmenLook = NO_OMEN;
  let omenBlend = 0;

  let targetCandles = 1;
  let targetShare = 1;
  const from = setBlendable(newBlendable(), base);
  const shown = setBlendable(newBlendable(), base);
  let blend = 1;

  // What the tick hands the writers and publishes, kept and rewritten every
  // frame (docs/guidelines/performance.md); the profile is made again only
  // when the look it is laid over changes.
  const camRight: Rgb3 = [1, 0, 0];
  const camUp: Rgb3 = [0, 1, 0];
  const omenBalance: Rgb3 = [1, 1, 1];
  const balance: Rgb3 = [1, 1, 1];
  let profileOf: LookProfile | null = null;
  let profile = { ...base } as Mutable<LookProfile>;
  const rig = { skyIntensity: 1, skyDiffuse: WHITE, skyGround: null as Rgb | null, sunIntensity: 0, sunDiffuse: WHITE };
  const keptShadow: KeptShadowPolicy = { direction: [0, 0, 0], strength: 0, softness: 1, casters: 'dynamic' };
  const sky: Mutable<Parameters<typeof syncSkyDome>[1]> = { horizon: null, linear: false, bytes: undefined, black: false };
  const fogLinear: Rgb3 = [0, 0, 0];
  const noHaze: Mutable<LookProfile['fog']> = { ...NO_FOG, fromTarget: undefined };
  const sunLinear: Rgb3 = [0, 0, 0];
  const shafts: Mutable<Parameters<typeof syncSunShafts>[4]> = { sunColor: null, direction: keptShadow.direction };
  const tone: Mutable<Parameters<typeof syncToneMap>[2]> = { live: false, mapper: 0, brightness: 1, keyGain: 1 };
  const post: Mutable<Parameters<PostChain['set']>[0]> = { shaped: false, exposure: 1, toneMapper: 0, whiteBalance: WHITE };
  const passes: string[] = [];
  const keySkyGround: Rgb3 = [0, 0, 0];
  const key: Mutable<LookState['key']> = {
    skyIntensity: 1,
    skyColor: WHITE,
    skyGround: WHITE,
    sunIntensity: 0,
    direction: CLASSIC_SHADOW_POLICY.direction,
    emitterGain: 1,
    sceneGain: 1,
    roomShare: 1,
  };
  const kept: Mutable<LookState> = {
    engine: 'polish',
    tier: 0,
    world,
    area: null,
    profile,
    key,
    shadow: CLASSIC_SHADOW_POLICY,
    ev: 0,
    keyGain: 1,
    exposure: 1,
    toneMapper: TONE_MAPPER_NAMES[0],
    style: 0,
    fogColorLinear: fogLinear,
    passes,
  };

  // The last published signature, field by field: NaN publishes the first frame.
  const seen = {
    tier: NaN,
    world: NaN,
    room: null as LookArea | null,
    ev: NaN,
    dim: NaN,
    roomShare: NaN,
    casters: '',
    mapper: NaN,
    style: NaN,
    wb0: NaN,
    wb1: NaN,
    wb2: NaN,
    haze: NaN,
  };
  const seenPasses: string[] = [];

  let state: LookState | null = null;
  let mapReady = true;

  const retarget = (): void => {
    const look = area ? areaProfile(area.name) : null;
    const next = look ? applyArea(base, look) : base;
    if (next === target) return;

    setBlendable(from, shown);
    target = next;
    targetCandles = look?.candles ?? 1;
    targetShare = look ? (roomKeyDev ?? look.keyLevel) / 2 ** base.ev : 1;
    blend = 0;
  };

  const tick = (dt: number): void => {
    // The snapshot the item materials bind this frame. The camera's basis
    // rides with it for the matcap (renderingStyle.ts): the view matrix's
    // first two rows are the camera's right and up in world space.
    const view = camera.getViewMatrix().m;

    camRight[0] = view[0];
    camRight[1] = view[4];
    camRight[2] = view[8];
    camUp[0] = view[1];
    camUp[1] = view[5];
    camUp[2] = view[9];
    syncRenderingStyle(scene.getEngine().getRenderHeight(), camRight, camUp);

    const omenTo = omen ? 1 : 0;

    if (omenBlend !== omenTo) {
      const step = dt / BLEND_SECONDS;

      omenBlend +=
        Math.sign(omenTo - omenBlend) *
        Math.min(step, Math.abs(omenTo - omenBlend));
    }

    const omenT = omenBlend * omenBlend * (3 - 2 * omenBlend);
    const dim = 1 + (omenLook.dim - 1) * omenT;
    omenBalance[0] = 1 + (omenLook.whiteBalance[0] - 1) * omenT;
    omenBalance[1] = 1 + (omenLook.whiteBalance[1] - 1) * omenT;
    omenBalance[2] = 1 + (omenLook.whiteBalance[2] - 1) * omenT;

    if (blend < 1) {
      blend = Math.min(1, blend + dt / BLEND_SECONDS);
      const t = blend * blend * (3 - 2 * blend);
      lerpBlendable(shown, from, target, targetCandles, targetShare, t);
    }

    const tier = tierIndex() as 0 | 1 | 2;
    const lightTier = lightingTier();
    const shaped = lightTier !== null;
    const postOn = GameOptions.postProcessing;
    // The level and the curve are one thing: the key puts
    // the frame a stop or two over display white and the tone pass rolls it
    // back down. With post off there is no pass and no linear buffer - the
    // terrain and the materials compose in display space and clamp at 1 - so
    // the level has nowhere to go but into blown highlights. Ungraded, the
    // shaped tiers run at the original's unit level like Classic; the shaping
    // (sun split, cascades, PBR) is untouched.
    const graded = shaped && postOn;
    const room = shaped ? area : null;

    // The style lives on tiers >= 1 only; null below them. The ink lines are
    // one pixel wide and read the G-buffer, so it runs at full resolution
    // while they are on and at the tier's ratio otherwise.
    const style = renderingStyle();
    const inkWanted = inkLinesActive() && postOn;
    // Times the upscale's scale: the buffer is sized off the drawing buffer,
    // which is the whole window while the upscale is on, and "full
    // resolution" here has always meant the resolution the scene is drawn at.
    const gbufferRatio =
      upscaleScale() *
      (lightTier ? Math.max(lightTier.ssaoRatio, inkWanted ? 1 : 0) : 1);

    if (profileOf !== target) {
      profileOf = target;
      profile = { ...target, ev: shown.ev, whiteBalance: balance, fog: shown.fog };
    }
    profile.ev = shown.ev;
    profile.whiteBalance = wbDev ?? composeBalance(shown.whiteBalance, omenBalance, balance);

    // 1. key. Inside a room the rig and the ground bake take the room's share
    // of the map's level (F14); the emitters stay at the map's level and
    // carry the room.
    const keyGain = graded ? 2 ** (profile.ev + evDev) : 1;
    const roomShare = shaped ? shown.roomShare : 1;
    // The emitters take the room's share as well. Leaving them at the map's
    // level put the pub floor at 94 % torch delta against Classic's half and
    // half: the bake's own colour vanished under a uniform orange, which is
    // what "the light no longer reads on the objects" looks like on a floor.
    // `candles` is then what it says, how much more than the room's own level
    // its emitters get, and 1 is Classic.
    const emitterGain = shaped ? (candlesDev ?? shown.candles) * roomShare : 1;
    // The event dim rides on the light, not the grade, so every lit path takes
    // it and the emissive art does not.
    const sceneGain = keyGain * dim;
    const sunShare = shaped ? profile.sun.share : 0;
    const skyIntensity = shaped ? 1 - sunShare : 1;

    rig.skyIntensity = skyIntensity * sceneGain * roomShare;
    rig.skyGround = shaped ? SKY_GROUND_RGB : null;
    rig.sunIntensity = sunShare * sceneGain * roomShare * directLightGain();
    setKey(scene, rig);

    // 2. shadow policy. Classic never moves the rig: the blobs and the snow
    // relief read its direction and keep the lean they always had.
    const shadow = lightTier
      ? shadowPolicyFor(profile, lightTier.pcss, room ? 'all' : 'dynamic', keptShadow)
      : CLASSIC_SHADOW_POLICY;

    setSunDirection(scene, shaped ? shadow.direction : DEFAULT_SUN_DIRECTION);
    syncSpecular(scene, pbrMaterialsOn() ? specularLightScale() : 0);

    // 3. shadows (CSM + terrain hook + the blobs' re-park)
    syncShadows(scene, lightTier, shadow);
    // The ground and the grass take the style's defines the way they take
    // the cascades'.
    syncTerrainDefines();

    // 4. sky. The map's own horizon, not the area's: a tavern has no sky of
    // its own but the doorway still shows the one outside - unless the room
    // owns the frame and nothing past its walls is drawn.
    sky.horizon = shaped ? base.sky?.horizon ?? null : null;
    sky.linear = linearBufferActive(scene);
    sky.bytes = maps.clearColorFor(world);
    sky.black = room !== null;
    syncSkyDome(scene, sky);

    // The far scenery standing against it, for a map that has any.
    syncSkyline(scene);

    // 5. haze and AO
    toLinear(profile.fog.color ?? base.sky?.horizon ?? BLACK, fogLinear);

    // Ahead of every pass: the target the scene is drawn into, which is what
    // sets the resolution it is drawn at while the upscale is on. It sits at
    // the head of the camera's list, where nothing else inserts, so it never
    // reorders anything behind it.
    syncUpscale(scene, camera);

    // The effect mask is not a pass: it is drawn after the frame and read live.
    syncEffectMask(scene, camera, shaped && postOn);

    let reordered = syncAmbientOcclusion(
      scene,
      camera,
      lightTier,
      postOn,
      gbufferRatio
    );

    // The ink lines: after the AO, before the haze so they fade with it.
    reordered =
      syncInkOutline(scene, camera, lightTier, tier, style, postOn, reordered) ||
      reordered;

    // Anime 2.0's own two: the hull is drawn with the meshes, the speed
    // lines sit beside the ink pass and run on the camera's own travel.
    syncHullOutline(scene);
    reordered =
      syncSpeedLines(scene, camera, lightTier, postOn, dt, reordered) || reordered;

    if (!shaped) {
      Object.assign(noHaze, profile.fog);
      noHaze.density = 0;
    }
    reordered =
      syncHeightFog(
        scene,
        camera,
        shaped ? profile.fog : noHaze,
        fogLinear,
        postOn,
        // The map's own, not the area's: a room owns the frame and shows
        // nothing past its walls, and a room has no holes in its floor.
        shaped && !room ? base.underworld ?? null : null,
        reordered
      ) ||
      reordered;
    updateHeightFog(camera, dt);

    // The room mask (F8): after the haze, before the post chain.
    const roomMask = syncRoomMask(scene, camera, lightTier, room?.volume ?? null, reordered);
    reordered = roomMask.changed || reordered;

    // The shafts are scene light, so they run before the curve. The map's own
    // sky, not the area's: a room owns the frame and shows none.
    const shaftSky = room ? null : base.sky;
    shafts.sunColor = shaftSky
      ? toLinear(shaftSky.sun === null ? shaftSky.zenith : shaftSky.sun ?? SKY_SUN_DEFAULT, sunLinear)
      : null;
    shafts.direction = shadow.direction;
    reordered =
      syncSunShafts(scene, camera, lightTier, tier, shafts, postOn, reordered) || reordered;

    // 6. post: the viewer's brightness only; the map's level is in the key.
    const brightness = graded ? GameOptions.brightness / 10 : 0;
    const postExposure = 2 ** brightness;
    const toneMapperIndex =
      graded
        ? Math.max(0, Math.min(3, Math.round(tmDev ?? GameOptions.toneMapper)))
        : 0;

    // The tone pass maps the surface and composites the effects; it is the
    // last scene-light pass, after the haze and the room mask, before the chain.
    tone.live = shaped && postOn;
    tone.mapper = toneMapperIndex;
    tone.brightness = postExposure;
    tone.keyGain = keyGain;
    reordered = syncToneMap(scene, camera, tone, reordered) || reordered;

    // Bloom reads whatever the buffer holds, so a single aliased fragment can
    // be drawn as a pool of light. The guard bounds a pixel against its
    // neighbours ahead of the chain; the MU curve already bounds the whole
    // buffer, so the two are never live at once.
    reordered =
      syncFireflyGuard(
        scene,
        camera,
        shaped && postOn && GameOptions.bloom > 0 && !toneMapLive(),
        reordered
      ) || reordered;

    if (reordered) postChain.moveToEnd();

    post.shaped = shaped;
    post.exposure = postExposure;
    post.toneMapper = toneMapperIndex;
    post.whiteBalance = profile.whiteBalance;
    postChain.set(post);

    // The MSAA goes to the one pass the scene is drawn into, the head of the
    // camera's chain, which is only known once every pass above has settled.
    syncUpscaleSamples();
    syncAmbientOcclusionSamples();
    syncFireflyGuardSamples();
    postChain.syncSamples();

    // 7. publish
    passes.length = 0;
    if (shaped && postOn) passes.push('ssao');
    if (inkOutlineLive()) passes.push('ink');
    if (speedLinesLive()) passes.push('speedLines');
    if (shaped && postOn && profile.fog.density > 0) passes.push('haze');
    if (roomMask.live) passes.push('roomMask');
    if (sunShaftsLive()) passes.push('sunShafts');
    const chain = postChain.passes();
    for (let i = 0; i < chain.length; i++) passes.push(chain[i]);

    const ev = graded ? profile.ev + evDev + brightness : 0;
    const styleNow = style ? styleIndex() : 0;

    key.skyIntensity = skyIntensity;
    key.skyGround = WHITE;
    if (shaped) {
      keySkyGround[0] = SKY_GROUND * skyIntensity;
      keySkyGround[1] = SKY_GROUND * skyIntensity;
      keySkyGround[2] = SKY_GROUND * skyIntensity;
      key.skyGround = keySkyGround;
    }
    key.sunIntensity = sunShare;
    key.direction = shadow.direction;
    key.emitterGain = emitterGain;
    key.sceneGain = sceneGain;
    key.roomShare = roomShare;

    kept.tier = tier;
    kept.world = world;
    kept.area = room;
    kept.profile = profile;
    kept.shadow = shadow;
    kept.ev = ev;
    kept.keyGain = keyGain;
    kept.exposure = keyGain * postExposure;
    kept.toneMapper = TONE_MAPPER_NAMES[toneMapperIndex];
    kept.style = styleNow;
    state = kept;

    const wb = profile.whiteBalance;
    let changed =
      seen.tier !== tier ||
      seen.world !== world ||
      seen.room !== room ||
      seen.ev !== per(ev, 1e3) ||
      seen.dim !== per(dim, 1e3) ||
      seen.roomShare !== per(roomShare, 1e3) ||
      seen.casters !== shadow.casters ||
      seen.mapper !== toneMapperIndex ||
      seen.style !== styleNow ||
      seen.wb0 !== per(wb[0], 1e3) ||
      seen.wb1 !== per(wb[1], 1e3) ||
      seen.wb2 !== per(wb[2], 1e3) ||
      seen.haze !== per(profile.fog.density, 1e4) ||
      seenPasses.length !== passes.length;
    for (let i = 0; !changed && i < passes.length; i++) changed = seenPasses[i] !== passes[i];

    if (changed) {
      seen.tier = tier;
      seen.world = world;
      seen.room = room;
      seen.ev = per(ev, 1e3);
      seen.dim = per(dim, 1e3);
      seen.roomShare = per(roomShare, 1e3);
      seen.casters = shadow.casters;
      seen.mapper = toneMapperIndex;
      seen.style = styleNow;
      seen.wb0 = per(wb[0], 1e3);
      seen.wb1 = per(wb[1], 1e3);
      seen.wb2 = per(wb[2], 1e3);
      seen.haze = per(profile.fog.density, 1e4);
      seenPasses.length = 0;
      for (let i = 0; i < passes.length; i++) seenPasses.push(passes[i]);
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
      setBlendable(from, base);
      setBlendable(shown, base);
      blend = 1;
      mapReady = false;
    },
    setOmen(name) {
      if (name === omen) return;
      omen = name;
      if (name) omenLook = omenProfile(name);
    },
    setArea(name, rect) {
      const next: LookArea | null = name
        ? {
            name,
            rect: rect ?? WHOLE_MAP,
            volume: rect && 'floorY' in rect ? rect : null,
          }
        : null;
      // A new frame under the same name is a new room.
      if (areaKey(next) === areaKey(area)) return;
      area = next;
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

  setLookDirector(director);
  (globalThis as { __lighting?: unknown }).__lighting = director;

  return director;
}
