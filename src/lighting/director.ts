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
  SKY_SUN_DEFAULT,
} from './profiles';
import {
  CLASSIC_SHADOW_POLICY,
  shadowPolicyFor,
  type ShadowPolicy,
} from './shadowPolicy';
import { syncSkyDome } from './skyDome';
import { syncShadows } from '../scenes/shadows';
import { syncAmbientOcclusion } from '../scenes/ambientOcclusion';
import { syncHeightFog, updateHeightFog } from '../scenes/heightFog';
import { syncRoomMask } from '../scenes/roomMask';
import { syncToneMap } from '../scenes/toneMap';
import { syncSunShafts, sunShaftsLive } from '../scenes/sunShafts';
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

/** Area (tavern) blend, seconds. */
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
  readonly fogColorLinear: Rgb;
  /** Names of the live post passes, chain order. */
  readonly passes: readonly string[];
};

export interface LookDirector {
  setMap(world: ENUM_WORLD): void;
  setArea(name: AreaLookName | null, rect?: AreaRect | RoomVolume): void;
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
    if (blend < 1) {
      blend = Math.min(1, blend + dt / BLEND_SECONDS);
      const t = blend * blend * (3 - 2 * blend);
      shown = lerpBlendable(from, blendable(target, targetCandles, targetShare), t);
    }

    const tier = tierIndex() as 0 | 1 | 2;
    const lightTier = lightingTier();
    const shaped = lightTier !== null;
    const post = GameOptions.postProcessing;
    const room = shaped ? area : null;

    const profile: LookProfile = {
      ...target,
      ev: shown.ev,
      whiteBalance: wbDev ?? shown.whiteBalance,
      fog: shown.fog,
    };

    // 1. key. Inside a room the rig and the ground bake take the room's share
    // of the map's level (F14); the emitters stay at the map's level and
    // carry the room.
    const keyGain = shaped ? 2 ** (profile.ev + evDev) : 1;
    const roomShare = shaped ? shown.roomShare : 1;
    // The emitters take the room's share as well. Leaving them at the map's
    // level put the pub floor at 94 % torch delta against Classic's half and
    // half: the bake's own colour vanished under a uniform orange, which is
    // what "the light no longer reads on the objects" looks like on a floor.
    // `candles` is then what it says, how much more than the room's own level
    // its emitters get, and 1 is Classic.
    const emitterGain = shaped ? (candlesDev ?? shown.candles) * roomShare : 1;
    const sunShare = shaped ? profile.sun.share : 0;
    const skyIntensity = shaped ? 1 - sunShare : 1;
    const skyGround: Rgb = shaped
      ? [SKY_GROUND, SKY_GROUND, SKY_GROUND]
      : WHITE;

    setKey(scene, {
      skyIntensity: skyIntensity * keyGain * roomShare,
      skyDiffuse: WHITE,
      skyGround: shaped ? skyGround : null,
      sunIntensity: sunShare * keyGain * roomShare * directLightGain(),
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

    // 4. sky. The map's own horizon, not the area's: a tavern has no sky of
    // its own but the doorway still shows the one outside - unless the room
    // owns the frame and nothing past its walls is drawn.
    syncSkyDome(scene, {
      horizon: shaped ? base.sky?.horizon ?? null : null,
      linear: linearBufferActive(scene),
      bytes: maps.clearColorFor(world),
      black: room !== null,
    });

    // 5. haze and AO
    const fogSource = profile.fog.color ?? base.sky?.horizon ?? null;
    const fogColorLinear: Rgb = fogSource ? toLinear(fogSource) : [0, 0, 0];

    let reordered = syncAmbientOcclusion(scene, camera, lightTier, post);
    reordered =
      syncHeightFog(scene, camera, shaped ? profile.fog : { ...profile.fog, density: 0 }, fogColorLinear, post) ||
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
        post
      ) || reordered;

    // 6. post: the viewer's brightness only; the map's level is in the key.
    const brightness = shaped ? GameOptions.brightness / 10 : 0;
    const postExposure = 2 ** brightness;
    const toneMapperIndex =
      shaped && post
        ? Math.max(0, Math.min(3, Math.round(tmDev ?? GameOptions.toneMapper)))
        : 0;

    // The MU curve is what `toneMapper` 1 selects; it is the last scene-light
    // pass, so it runs after the haze and the mask and before the chain.
    reordered =
      syncToneMap(scene, camera, toneMapperIndex === 1, postExposure) || reordered;

    if (reordered) postChain.moveToEnd();

    postChain.set({
      shaped,
      exposure: postExposure,
      toneMapper: toneMapperIndex,
      whiteBalance: profile.whiteBalance,
    });

    // 7. publish
    const passes = [
      ...(shaped && post ? ['ssao'] : []),
      ...(shaped && post && profile.fog.density > 0 ? ['haze'] : []),
      ...(roomMask.live ? ['roomMask'] : []),
      ...(sunShaftsLive() ? ['sunShafts'] : []),
      ...postChain.passes(),
    ];

    const ev = shaped ? profile.ev + evDev + brightness : 0;

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
        roomShare,
      },
      shadow,
      ev,
      keyGain,
      exposure: keyGain * postExposure,
      toneMapper: TONE_MAPPER_NAMES[toneMapperIndex],
      fogColorLinear,
      passes,
    };

    const next = [
      tier,
      world,
      areaKey(room),
      ev.toFixed(3),
      roomShare.toFixed(3),
      shadow.casters,
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
