import { makeAutoObservable, runInAction } from 'mobx';
import {
  CAMERA_FOV_DEG,
  CAMERA_FOV_MAX_DEG,
  CAMERA_FOV_MIN_DEG,
} from '../camera/recipes';
import { RENDER_DISTANCE_MAX } from './renderDistance';
import { LocalStorage } from '../libs/localStorage';

const OPTIONS_KEY = 'mu_options';

export type GameOptions = {
  shadows: boolean;
  postProcessing: boolean;
  /**
   * 0 none / 1 standard (`1 - exp2(-1.59 x)`) / 2 ACES / 3 Khronos PBR
   * Neutral. Runs on the Enhanced/Ultra tiers only: Classic is the
   * reference client's display-space frame and takes no curve. Standard is
   * the default by measurement (ARCHITECTURE §11.1): Neutral's black offset
   * put Lorencia's saturation at 0.62 and its shadow B/R at 0.27.
   */
  toneMapper: number;
  /** Player exposure trim in tenths of a stop over the map's own, -10..10. */
  brightness: number;
  /** Film grain strength; 0 disables the pass. */
  filmGrain: number;
  /** Fast approximate anti-aliasing (pipeline pass). */
  fxaa: boolean;
  /** Bloom weight; 0 disables the pass. Emitters only (threshold at scene white). */
  bloom: number;
  /** GlowLayer strength for item and effect halos; 0 disables the layer. */
  glow: number;
  /** Chromatic aberration; 0 disables the pass. */
  chromatic: number;
  /**
   * How hard the PBR materials lean on their derived normal and metalness
   * maps. `MATERIAL_DETAIL_MAX` is the full derivation, 0 is the flat
   * placeholders.
   */
  materialDetail: number;
  sharpness: number;
  /** Sun rays through whatever occludes the sun; 0 disables the pass. */
  sunShafts: number;
  /** Multiply vignette; 0 disables the pass. */
  vignette: number;
  dynamicLights: boolean;
  /** 0 Classic (blob shadows) / 1 Enhanced (CSM + SSAO + haze) / 2 Ultra. */
  lightingQuality: number;
  /**
   * 0 Classic (flat Standard materials) / 1 PBR on every lit mesh with
   * derived maps on the figures and their gear / 2 derived maps on the whole
   * world. See `materialQuality.ts`.
   */
  materialQuality: number;
  volume: number;
  effectLevel: number;
  /** Item effect style: 0 off / 1 legacy / 2 legacy + improved / 3 improved. */
  itemEffects: number;
  /** Leaves, snow, tavern dust (GPU particle backbone). */
  ambientParticles: boolean;
  /**
   * The volumetric cloud deck and the shadows it casts, together: they are
   * one field, and splitting them lets a shadow have no cloud above it.
   */
  clouds: boolean;
  /** Rain driven by the server weather packet. */
  weatherEffects: boolean;
  /**
   * Animated water terrain: wave deformation and the caustics flipbook on
   * the maps that have them (Atlans). Read at map load, like the ground
   * weather - off, the terrain compiles the shader it always had.
   */
  animatedWater: boolean;
  /**
   * Blades of grass standing on the tiles the splat map draws as grass
   * (`libs/mu/terrainGrass.ts`), 0-9. The original had this pass and the
   * clone never ported it; 0 is the ground exactly as it was, no mesh, no
   * material, no per-frame cost.
   *
   * Its own axis rather than a rider on `advancedEffects` for that option's
   * own reason: it is a different cost and a different taste. This one is
   * vertex and residency work, not a branch in the ground shader.
   */
  grassDensity: number;
  /**
   * Ground-contact weather: settled snow and rain wetness on the terrain,
   * puddles, footprints and the snow a boot kicks up.
   *
   * Separate from `weatherEffects` because it is a different cost and a
   * different taste. `weatherEffects` is the sky - particles falling past the
   * camera. This is everything the weather does to the ground, which means a
   * branch in the terrain shader, a mask upload, a decal pass and a parallax
   * march. Off, the terrain compiles the shader it always had.
   */
  advancedEffects: boolean;
  /**
   * Index into `RENDER_DISTANCE_STEPS`: how far from the hero map objects are
   * kept loaded. Step 0 is the radius the client always had; the top step
   * holds the whole map at once.
   */
  renderDistance: number;
  /**
   * Draw the map's scenery as instanced batches - one mesh per prop type
   * and 32-tile chunk instead of one per placement (`common/propBatches.ts`).
   * Off is the client exactly as it was, every prop its own model. A change
   * reloads the current map's objects.
   */
  propBatching: boolean;
  autoAttack: boolean;
  whisperBeep: boolean;
  slideHelp: boolean;
  /**
   * The original client's camera: Ctrl+wheel zoom levels, Insert/Delete
   * rotate, 30-degree frustum, per-map overrides (`src/camera/`). Off is
   * today's fixed framing.
   */
  cameraControl: boolean;
  /**
   * Vertical field of view in degrees, `CAMERA_FOV_DEG` being the original
   * client's 30. First person rides on top of it (`FIRST_PERSON_WIDEN_DEG`).
   * Nothing reads it while `cameraControl` is off.
   */
  cameraFov: number;
  /**
   * W/A/S/D walk the hero, camera-relative, and in first person the mouse
   * looks around under a pointer lock. On, those four keys stop reaching the
   * actions they carry (potion slot 2, master skills, sort, command window) -
   * Ctrl + the key still does.
   */
  wsadMovement: boolean;
  /**
   * Let the first-person pointer lock be taken at any zoom level, so the
   * mouse looks around in third person too - the camera behind the hero, the
   * crosshair in the middle of the screen. Nothing reads it while
   * `wsadMovement` is off, which is what supplies the walk once the lock has
   * taken the cursor.
   */
  thirdPersonMouseLook: boolean;
  /**
   * Let the eye rise and fall with the hero's stride in first person. Off is a
   * camera that slides along at a fixed height; nothing outside the innermost
   * zoom step reads it.
   */
  firstPersonBob: boolean;
  /**
   * Run the latched ALT drop names through `lootFilter.ts` instead of naming
   * every pile on the ground. ALT held still shows all of them.
   */
  lootFilter: boolean;
  lootJewels: boolean;
  lootExcellent: boolean;
  lootAncient: boolean;
  /** Name +7 and up (`HIGH_DROP_LEVEL`, the gold tint). */
  lootHighLevel: boolean;
  /** Everything the rules above do not claim. */
  lootOther: boolean;
  /** Index into `LOOT_ZEN_STEPS`: the smallest zen pile that keeps its name. */
  lootZen: number;
  /** A "14:03" column in front of every chat log line. */
  chatTimestamps: boolean;
  /**
   * Index into `UI_SCALE_STEPS`: how big every window is drawn, on top of
   * the size it was dragged to. 4K screens want more than a 640x480 stage.
   */
  uiScale: number;
  /** Windows stay where they are: a drag raises them but does not move them. */
  lockWindows: boolean;
  /** Durability, full grid, last potion and buff ending notices. */
  stateWarnings: boolean;
  /**
   * Walk the login flow again by ourselves when the game server socket
   * drops, instead of sending the player back to the server list.
   */
  autoReconnect: boolean;
  /**
   * Keep the browser's own shortcuts off the keyboard: Ctrl+W, Ctrl+R,
   * Ctrl+S and the rest of the chords a game key lands on by accident
   * (`common/browserHotkeys.ts`). Off is the plain tab, reload and all.
   */
  blockBrowserKeys: boolean;
};

export const TONE_MAPPER_MAX = 3;

export const BRIGHTNESS_MIN = -10;
export const BRIGHTNESS_MAX = 10;

/** `uiScale` steps: the factor every window's own scale is multiplied by. */
export const UI_SCALE_STEPS = [0.7, 0.8, 0.9, 1, 1.15, 1.3, 1.5, 1.75, 2] as const;

export const UI_SCALE_MAX = UI_SCALE_STEPS.length - 1;

export function uiScaleFactor(step: number): number {
  return UI_SCALE_STEPS[Math.max(0, Math.min(UI_SCALE_MAX, step))] ?? 1;
}

const RANGES: Partial<Record<keyof GameOptions, readonly [number, number]>> = {
  toneMapper: [0, TONE_MAPPER_MAX],
  brightness: [BRIGHTNESS_MIN, BRIGHTNESS_MAX],
  effectLevel: [0, 4],
  itemEffects: [0, 3],
  lightingQuality: [0, 2],
  materialQuality: [0, 2],
  // Literal rather than `MATERIAL_DETAIL_MAX`: materialQuality.ts imports
  // this module, so naming it here would close an import cycle.
  materialDetail: [0, 9],
  filmGrain: [0, 9],
  bloom: [0, 9],
  glow: [0, 9],
  chromatic: [0, 9],
  sharpness: [0, 9],
  vignette: [0, 9],
  sunShafts: [0, 9],
  lootZen: [0, 9],
  uiScale: [0, UI_SCALE_MAX],
  renderDistance: [0, RENDER_DISTANCE_MAX],
  grassDensity: [0, 9],
  cameraFov: [CAMERA_FOV_MIN_DEG, CAMERA_FOV_MAX_DEG],
};

const DEFAULTS: GameOptions = {
  shadows: true,
  postProcessing: true,
  toneMapper: 1,
  brightness: 0,
  filmGrain: 0,
  fxaa: false,
  bloom: 3,
  glow: 5,
  chromatic: 0,
  sharpness: 2,
  vignette: 0,
  sunShafts: 3,
  dynamicLights: true,
  lightingQuality: 1,
  materialQuality: 1,
  materialDetail: 6,
  volume: 5,
  effectLevel: 4,
  itemEffects: 2,
  ambientParticles: true,
  clouds: true,
  weatherEffects: true,
  animatedWater: true,
  grassDensity: 5,
  advancedEffects: true,
  renderDistance: 0,
  propBatching: true,
  autoAttack: false,
  whisperBeep: true,
  slideHelp: true,
  cameraControl: true,
  cameraFov: CAMERA_FOV_DEG,
  wsadMovement: false,
  thirdPersonMouseLook: false,
  firstPersonBob: true,
  autoReconnect: true,
  lootFilter: false,
  lootJewels: true,
  lootExcellent: true,
  lootAncient: true,
  lootHighLevel: true,
  lootOther: false,
  lootZen: 0,
  chatTimestamps: false,
  uiScale: 3,
  lockWindows: false,
  stateWarnings: true,
  blockBrowserKeys: true,
};

/**
 * Keys the structured look retired. The grade they drove (darkness, contrast,
 * split-tone tint, saturation, the map gradient) no longer exists; the two
 * that survive in another shape are mapped in `migrate`.
 */
const DROPPED_KEYS = [
  'darkness',
  'sceneDarkening',
  'contrast',
  'colorTint',
  'saturation',
  'mapGradient',
  'toneMapping',
  'exposure',
] as const;

type Listener = (options: GameOptions) => void;

const listeners = new Set<Listener>();

/**
 * One-time schema migration of a stored options blob; true when it changed.
 * Stored tiers are kept as they are: a returning player's Classic stays
 * Classic, the new default reaches fresh installs only.
 */
export function migrate(stored: Record<string, unknown>): boolean {
  const present = DROPPED_KEYS.filter(key => key in stored);

  if (present.length === 0) return false;

  if ('toneMapping' in stored && !('toneMapper' in stored)) {
    stored.toneMapper = stored.toneMapping ? 1 : 0;
  }

  if ('exposure' in stored && !('brightness' in stored)) {
    stored.brightness = 0;
  }

  // The vignette was 0..25 with a default of 13 nobody chose; it is 0..9
  // now, opt-in (§6). The old default resets, a chosen value is rescaled.
  const vignette = stored.vignette;
  let vignetteNote = '';

  if (typeof vignette === 'number') {
    stored.vignette = vignette === 13 ? 0 : Math.round((vignette * 9) / 25);
    vignetteNote = `, vignette ${vignette}/25 -> ${stored.vignette}/9`;
  }

  for (const key of present) delete stored[key];

  console.info(`[options] retired keys removed: ${present.join(', ')}${vignetteNote}`);

  return true;
}

function load(): GameOptions {
  const stored = LocalStorage.load(OPTIONS_KEY);

  if (!stored) return { ...DEFAULTS };

  try {
    const parsed = JSON.parse(stored) as Record<string, unknown>;
    const migrated = migrate(parsed);

    const loaded = {
      ...DEFAULTS,
      ...(parsed as Partial<GameOptions>),
    };

    for (const [key, [min, max]] of Object.entries(RANGES)) {
      const value = loaded[key as keyof GameOptions];

      if (typeof value === 'number') {
        (loaded as Record<string, unknown>)[key] = Math.max(
          min,
          Math.min(max, value)
        );
      }
    }

    if (migrated) LocalStorage.save(OPTIONS_KEY, JSON.stringify(loaded));

    return loaded;
  } catch {
    return { ...DEFAULTS };
  }
}

/**
 * The live options. Observable (every field a MobX observable) so the
 * Options window and any observer that reads a field re-render on change -
 * the window used to force itself with a counter bump. Reads outside a
 * reaction (the per-frame material / lighting checks) cost a getter call.
 */
export const GameOptions: GameOptions = makeAutoObservable(load());

export function setGameOption<K extends keyof GameOptions>(
  key: K,
  value: GameOptions[K]
): void {
  if (GameOptions[key] === value) return;

  runInAction(() => {
    GameOptions[key] = value;
  });

  LocalStorage.save(OPTIONS_KEY, JSON.stringify(GameOptions));

  for (const listener of listeners) listener(GameOptions);
}

export function onGameOptionsChanged(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
