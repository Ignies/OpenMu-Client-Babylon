import {
  Observable,
  type ArcRotateCamera,
  type Scene,
} from '../libs/babylon/exports';
import { ENUM_WORLD } from '../common/types';
import { GameOptions } from '../common/gameOptions';
import { lightingTier, tierIndex } from '../common/lightingQuality';
import {
  inkLinesActive,
  renderingStyle,
  styleIndex,
  syncRenderingStyle,
} from '../common/renderingStyle';
import { linearBufferActive } from '../common/lightModel';
import {
  directLightGain,
  pbrMaterialsOn,
  specularLightScale,
} from '../common/materialQuality';
import { devQueryNumber, devQueryNumbers } from '../common/devSeams';
import { maps } from '../maps';
import { EventBus } from '../libs/eventBus';
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
  type ShadowPolicy,
} from './shadowPolicy';
import { syncSkyDome } from './skyDome';
import { syncSkyline } from './horizon';
import { syncShadows, syncTerrainDefines } from '../scenes/shadows';
import { syncAmbientOcclusion } from '../scenes/ambientOcclusion';
import { syncEffectMask } from '../scenes/effectMask';
import { syncInkOutline, inkOutlineLive } from '../scenes/inkOutline';
import { syncHullOutline } from '../scenes/hullOutline';
import { syncSpeedLines, speedLinesLive } from '../scenes/speedLines';
import { syncHeightFog, updateHeightFog } from '../scenes/heightFog';
import { syncRoomMask } from '../scenes/roomMask';
import { syncToneMap, toneMapLive } from '../scenes/toneMap';
import { syncFireflyGuard } from '../scenes/fireflyGuard';
import { syncSunShafts, sunShaftsLive } from '../scenes/sunShafts';
import {
  motionVectorsLive,
  syncMotionVectors,
  velocityFullRes,
} from '../scenes/motionVectors';
import {
  createPostChain,
  TONE_MAPPER_NAMES,
  type PostChain,
  type ToneMapperName,
} from '../scenes/postChain';

/**
 * The look director (ARCHITECTURE §4.3): the one composer. Reads the map's
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

let active: LookDirector | null = null;

/** The scene's director, for the readers (terrain, water, area hand-off). */
export function lookDirector(): LookDirector | null {
  return active;
}

type Blendable = {
  ev: number;
  /** Gain on the room's emitters (`AreaLook.candles`); 1 outside. */
  candles: number;
  /** The key's share of the map's level (`AreaLook.keyLevel / 2^ev`); 1 outside. */
  roomShare: number;
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

function blendable(p: LookProfile, candles = 1, roomShare = 1): Blendable {
  return {
    ev: p.ev,
    candles,
    roomShare,
    whiteBalance: [...p.whiteBalance],
    fog: { ...p.fog, color: p.fog.color ? [...p.fog.color] : null },
  };
}

function lerpBlendable(a: Blendable, b: Blendable, t: number): Blendable {
  // A haze fading in keeps the colour of the side that has one.
  const color = b.fog.density > 0 ? b.fog.color : a.fog.color;

  return {
    ev: lerp(a.ev, b.ev, t),
    candles: lerp(a.candles, b.candles, t),
    roomShare: lerp(a.roomShare, b.roomShare, t),
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
  let from = blendable(base);
  let shown = blendable(base);
  let blend = 1;

  let state: LookState | null = null;
  let signature = '';
  let mapReady = true;

  const retarget = (): void => {
    const look = area ? areaProfile(area.name) : null;
    const next = look ? applyArea(base, look) : base;
    if (next === target) return;

    from = shown;
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

    syncRenderingStyle(
      scene.getEngine().getRenderHeight(),
      [view[0], view[4], view[8]],
      [view[1], view[5], view[9]]
    );

    const omenTo = omen ? 1 : 0;

    if (omenBlend !== omenTo) {
      const step = dt / BLEND_SECONDS;

      omenBlend +=
        Math.sign(omenTo - omenBlend) *
        Math.min(step, Math.abs(omenTo - omenBlend));
    }

    const omenT = omenBlend * omenBlend * (3 - 2 * omenBlend);
    const dim = 1 + (omenLook.dim - 1) * omenT;
    const omenBalance: Rgb = [
      1 + (omenLook.whiteBalance[0] - 1) * omenT,
      1 + (omenLook.whiteBalance[1] - 1) * omenT,
      1 + (omenLook.whiteBalance[2] - 1) * omenT,
    ];

    if (blend < 1) {
      blend = Math.min(1, blend + dt / BLEND_SECONDS);
      const t = blend * blend * (3 - 2 * blend);
      shown = lerpBlendable(from, blendable(target, targetCandles, targetShare), t);
    }

    const tier = tierIndex() as 0 | 1 | 2;
    const lightTier = lightingTier();
    const shaped = lightTier !== null;
    const post = GameOptions.postProcessing;
    // The level and the curve are one thing (ARCHITECTURE F12): the key puts
    // the frame a stop or two over display white and the tone pass rolls it
    // back down. With post off there is no pass and no linear buffer - the
    // terrain and the materials compose in display space and clamp at 1 - so
    // the level has nowhere to go but into blown highlights. Ungraded, the
    // shaped tiers run at the original's unit level like Classic; the shaping
    // (sun split, cascades, PBR) is untouched.
    const graded = shaped && post;
    const room = shaped ? area : null;

    // The style lives on tiers >= 1 only; null below them. The ink lines are
    // one pixel wide and read the G-buffer, so it runs at full resolution
    // while they are on and at the tier's ratio otherwise.
    const style = renderingStyle();
    const inkWanted = inkLinesActive() && post;
    const gbufferRatio = lightTier
      ? Math.max(lightTier.ssaoRatio, inkWanted ? 1 : 0, velocityFullRes() ? 1 : 0)
      : 1;

    const profile: LookProfile = {
      ...target,
      ev: shown.ev,
      whiteBalance: wbDev ?? composeBalance(shown.whiteBalance, omenBalance),
      fog: shown.fog,
    };

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
    const skyGround: Rgb = shaped
      ? [SKY_GROUND, SKY_GROUND, SKY_GROUND]
      : WHITE;

    setKey(scene, {
      skyIntensity: skyIntensity * sceneGain * roomShare,
      skyDiffuse: WHITE,
      skyGround: shaped ? skyGround : null,
      sunIntensity: sunShare * sceneGain * roomShare * directLightGain(),
      sunDiffuse: WHITE,
    });

    // 2. shadow policy. Classic never moves the rig: the blobs and the snow
    // relief read its direction and keep the lean they always had.
    const shadow = lightTier
      ? shadowPolicyFor(profile, lightTier.pcss, room ? 'all' : 'dynamic')
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
    syncSkyDome(scene, {
      horizon: shaped ? base.sky?.horizon ?? null : null,
      linear: linearBufferActive(scene),
      bytes: maps.clearColorFor(world),
      black: room !== null,
    });

    // The far scenery standing against it, for a map that has any.
    syncSkyline(scene);

    // 5. haze and AO
    const fogSource = profile.fog.color ?? base.sky?.horizon ?? null;
    const fogColorLinear: Rgb = fogSource ? toLinear(fogSource) : [0, 0, 0];

    // The effect mask is not a pass: it is drawn after the frame and read live.
    syncEffectMask(scene, camera, shaped && post);

    let reordered = syncAmbientOcclusion(
      scene,
      camera,
      lightTier,
      post,
      gbufferRatio
    );

    // The ink lines: after the AO, before the haze so they fade with it.
    reordered =
      syncInkOutline(scene, camera, lightTier, tier, style, post, reordered) ||
      reordered;

    // Anime 2.0's own two: the hull is drawn with the meshes, the speed
    // lines sit beside the ink pass and run on the camera's own travel.
    syncHullOutline(scene);
    reordered =
      syncSpeedLines(scene, camera, lightTier, post, dt, reordered) || reordered;

    reordered =
      syncHeightFog(
        scene,
        camera,
        shaped ? profile.fog : { ...profile.fog, density: 0 },
        fogColorLinear,
        post,
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
    reordered =
      syncSunShafts(
        scene,
        camera,
        lightTier,
        tier,
        {
          sunColor: shaftSky
            ? toLinear(
                shaftSky.sun === null ? shaftSky.zenith : shaftSky.sun ?? SKY_SUN_DEFAULT
              )
            : null,
          direction: shadow.direction,
        },
        post,
        reordered
      ) || reordered;

    // 6. post: the viewer's brightness only; the map's level is in the key.
    const brightness = graded ? GameOptions.brightness / 10 : 0;
    const postExposure = 2 ** brightness;
    const toneMapperIndex =
      graded
        ? Math.max(0, Math.min(3, Math.round(tmDev ?? GameOptions.toneMapper)))
        : 0;

    // The tone pass maps the surface and composites the effects; it is the
    // last scene-light pass, after the haze and the room mask, before the chain.
    reordered =
      syncToneMap(
        scene,
        camera,
        { live: shaped && post, mapper: toneMapperIndex, brightness: postExposure, keyGain },
        reordered
      ) || reordered;

    // Bloom reads whatever the buffer holds, so a single aliased fragment can
    // be drawn as a pool of light. The guard bounds a pixel against its
    // neighbours ahead of the chain; the MU curve already bounds the whole
    // buffer, so the two are never live at once.
    reordered =
      syncFireflyGuard(
        scene,
        camera,
        shaped && post && GameOptions.bloom > 0 && !toneMapLive(),
        reordered
      ) || reordered;

    if (reordered) postChain.moveToEnd();

    // Behind the look on purpose: the velocity view is a measurement, not a
    // look, and the tone pass would regrade it.
    syncMotionVectors(scene, camera, shaped, reordered);

    postChain.set({
      shaped,
      exposure: postExposure,
      toneMapper: toneMapperIndex,
      whiteBalance: profile.whiteBalance,
    });

    // 7. publish
    const passes = [
      ...(shaped && post ? ['ssao'] : []),
      ...(inkOutlineLive() ? ['ink'] : []),
      ...(speedLinesLive() ? ['speedLines'] : []),
      ...(shaped && post && profile.fog.density > 0 ? ['haze'] : []),
      ...(roomMask.live ? ['roomMask'] : []),
      ...(sunShaftsLive() ? ['sunShafts'] : []),
      ...postChain.passes(),
      ...(motionVectorsLive() ? ['velocity'] : []),
    ];

    const ev = graded ? profile.ev + evDev + brightness : 0;

    state = {
      engine: 'polish',
      tier,
      world,
      area: room,
      profile,
      key: {
        skyIntensity,
        skyColor: WHITE,
        skyGround: shaped ? [skyGround[0] * skyIntensity, skyGround[1] * skyIntensity, skyGround[2] * skyIntensity] : WHITE,
        sunIntensity: sunShare,
        direction: shadow.direction,
        emitterGain,
        sceneGain,
        roomShare,
      },
      shadow,
      ev,
      keyGain,
      exposure: keyGain * postExposure,
      toneMapper: TONE_MAPPER_NAMES[toneMapperIndex],
      style: style ? styleIndex() : 0,
      fogColorLinear,
      passes,
    };

    const next = [
      tier,
      world,
      areaKey(room),
      ev.toFixed(3),
      dim.toFixed(3),
      roomShare.toFixed(3),
      shadow.casters,
      toneMapperIndex,
      style ? styleIndex() : 0,
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

  active = director;
  (globalThis as { __lighting?: unknown }).__lighting = director;

  return director;
}
