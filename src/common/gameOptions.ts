import { makeAutoObservable, runInAction } from 'mobx';
import { LocalStorage } from '../libs/localStorage';

const OPTIONS_KEY = 'mu_options';

export type GameOptions = {
  shadows: boolean;
  postProcessing: boolean;
  /**
   * ACES filmic tone mapping.
   *
   * Split out of `postProcessing` because it is the one pass that rewrites
   * every pixel whether or not a single grade slider is dialled in — the
   * highlight rolloff and the warm shoulder are what read as "a filter is
   * on" over the classic look. Enhanced/Ultra lighting wants it (it is what
   * keeps a hot key light from clipping); Classic does not, so it is a
   * choice rather than a consequence of enabling post-processing at all.
   */
  toneMapping: boolean;
  /**
   * Scales the per-map mood contrast. `GRADE_NOMINAL` is the authored
   * value, 0 is a flat 1.0 — the untouched frame.
   */
  contrast: number;
  /** Film grain strength; 0 disables the pass. */
  filmGrain: number;
  /** Fast approximate anti-aliasing (pipeline pass). */
  fxaa: boolean;
  /** Bloom weight; 0 disables the pass. */
  bloom: number;
  /** GlowLayer strength for item and effect halos; 0 disables the layer. */
  glow: number;
  /** Chromatic aberration; 0 disables the pass. */
  chromatic: number;
  /**
   * Scales the per-map mood exposure, the way `contrast` does for contrast.
   * `GRADE_NOMINAL` is the authored value, 0 is a flat 1.0.
   */
  exposure: number;
  /**
   * How hard the Enhanced/Characters materials lean on their derived normal
   * and metalness maps. `MATERIAL_DETAIL_MAX` is the full derivation, 0 is the
   * flat placeholders — PBR lighting with none of the derived relief.
   */
  materialDetail: number;
  sharpness: number;
  colorTint: number;
  mapGradient: number;
  vignette: number;
  darkness: number;
  sceneDarkening: boolean;
  saturation: number;
  dynamicLights: boolean;
  /** 0 Classic (blob shadows) · 1 Enhanced (CSM + SSAO + height fog) · 2 Ultra. */
  lightingQuality: number;
  /**
   * 0 Classic (flat Standard materials) · 1 Characters (PBR everywhere, but
   * derived maps only on the figures and their gear) · 2 Enhanced (derived
   * maps on the whole world). See `materialQuality.ts` for why the tier
   * scopes the maps rather than the material.
   */
  materialQuality: number;
  volume: number;
  effectLevel: number;
  /** Item effect style: 0 off · 1 legacy · 2 legacy + improved · 3 improved. */
  itemEffects: number;
  /** Leaves, snow, tavern dust (GPU particle backbone). */
  ambientParticles: boolean;
  /** Rain driven by the server weather packet. */
  weatherEffects: boolean;
  /**
   * Ground-contact weather: settled snow and rain wetness on the terrain,
   * puddles, footprints and the snow a boot kicks up.
   *
   * Separate from `weatherEffects` because it is a different cost and a
   * different taste. `weatherEffects` is the sky — particles falling past the
   * camera. This is everything the weather does to the ground, which means a
   * branch in the terrain shader, a mask upload, a decal pass and a parallax
   * march. Off, the terrain compiles the shader it always had.
   */
  advancedEffects: boolean;
  autoAttack: boolean;
  whisperBeep: boolean;
  slideHelp: boolean;
};

export const GRADE_NOMINAL = 5;

export const MAP_GRADIENT_MAX = 10;

export const SATURATION_MIN = -10;
export const SATURATION_MAX = 10;

const CLAMPS: Partial<Record<keyof GameOptions, number>> = {
  mapGradient: MAP_GRADIENT_MAX,
  saturation: SATURATION_MAX,
  effectLevel: 4,
  itemEffects: 3,
  lightingQuality: 2,
  materialQuality: 2,
  // Literal rather than `MATERIAL_DETAIL_MAX`: materialQuality.ts imports
  // this module, so naming it here would close an import cycle.
  materialDetail: 9,
  contrast: 25,
  filmGrain: 9,
  bloom: 9,
  glow: 9,
  chromatic: 9,
  exposure: 25,
};

const DEFAULTS: GameOptions = {
  shadows: true,
  postProcessing: true,
  toneMapping: true,
  contrast: GRADE_NOMINAL,
  filmGrain: 0,
  fxaa: false,
  bloom: 0,
  glow: 5,
  chromatic: 0,
  exposure: GRADE_NOMINAL,
  sharpness: 2,
  colorTint: 0,
  mapGradient: 3,
  vignette: 13,
  darkness: 8,
  sceneDarkening: true,
  saturation: 0,
  dynamicLights: true,
  lightingQuality: 0,
  materialQuality: 0,
  materialDetail: 6,
  volume: 5,
  effectLevel: 4,
  itemEffects: 2,
  ambientParticles: true,
  weatherEffects: true,
  advancedEffects: true,
  autoAttack: false,
  whisperBeep: true,
  slideHelp: true,
};

type Listener = (options: GameOptions) => void;

const listeners = new Set<Listener>();

function load(): GameOptions {
  const stored = LocalStorage.load(OPTIONS_KEY);

  if (!stored) return { ...DEFAULTS };

  try {
    const loaded = {
      ...DEFAULTS,
      ...(JSON.parse(stored) as Partial<GameOptions>),
    };

    for (const [key, max] of Object.entries(CLAMPS)) {
      const value = loaded[key as keyof GameOptions];

      if (typeof value === 'number' && value > max) {
        (loaded as Record<string, unknown>)[key] = max;
      }
    }

    return loaded;
  } catch {
    return { ...DEFAULTS };
  }
}

/**
 * The live options. Observable (every field a MobX observable) so the
 * Options window and any observer that reads a field re-render on change —
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
