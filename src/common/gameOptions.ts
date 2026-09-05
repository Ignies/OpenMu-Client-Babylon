import { makeAutoObservable, runInAction } from 'mobx';
import { LocalStorage } from '../libs/localStorage';

const OPTIONS_KEY = 'mu_options';

export type GameOptions = {
  shadows: boolean;
  postProcessing: boolean;
  /**
   * 0 none / 1 standard (`1 - exp(-1.59 x)`) / 2 ACES / 3 Khronos PBR
   * Neutral. Runs on the Enhanced/Ultra tiers only: Classic is the
   * reference client's display-space frame and takes no curve.
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
  /** Rain driven by the server weather packet. */
  weatherEffects: boolean;
  /**
   * Animated water terrain: wave deformation and the caustics flipbook on
   * the maps that have them (Atlans). Read at map load, like the ground
   * weather - off, the terrain compiles the shader it always had.
   */
  animatedWater: boolean;
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
  autoAttack: boolean;
  whisperBeep: boolean;
  slideHelp: boolean;
  /**
   * The original client's camera: Ctrl+wheel zoom levels, Insert/Delete
   * rotate, 30-degree frustum, per-map overrides (`src/camera/`). Off is
   * today's fixed framing.
   */
  cameraControl: boolean;
};

export const TONE_MAPPER_MAX = 3;

export const BRIGHTNESS_MIN = -10;
export const BRIGHTNESS_MAX = 10;

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
};

const DEFAULTS: GameOptions = {
  shadows: true,
  postProcessing: true,
  toneMapper: 3,
  brightness: 0,
  filmGrain: 0,
  fxaa: false,
  bloom: 3,
  glow: 5,
  chromatic: 0,
  sharpness: 2,
  vignette: 0,
  dynamicLights: true,
  lightingQuality: 1,
  materialQuality: 1,
  materialDetail: 6,
  volume: 5,
  effectLevel: 4,
  itemEffects: 2,
  ambientParticles: true,
  weatherEffects: true,
  animatedWater: true,
  advancedEffects: true,
  autoAttack: false,
  whisperBeep: true,
  slideHelp: true,
  cameraControl: true,
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

/** One-time schema migration of a stored options blob; true when it changed. */
function migrate(stored: Record<string, unknown>): boolean {
  const present = DROPPED_KEYS.filter(key => key in stored);

  if (present.length === 0) return false;

  if ('toneMapping' in stored && !('toneMapper' in stored)) {
    stored.toneMapper = stored.toneMapping ? 3 : 0;
  }

  if ('exposure' in stored && !('brightness' in stored)) {
    stored.brightness = 0;
  }

  for (const key of present) delete stored[key];

  console.info(`[options] retired keys removed: ${present.join(', ')}`);

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
