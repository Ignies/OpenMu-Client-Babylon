import { makeAutoObservable, runInAction } from 'mobx';
import {
  CAMERA_FOV_DEG,
  CAMERA_FOV_MAX_DEG,
  CAMERA_FOV_MIN_DEG,
} from '../camera/recipes';
import { RENDER_DISTANCE_MAX } from './renderDistance';
import {
  LOW_VITAL_DEFAULT_PERCENT,
  LOW_VITAL_MAX_PERCENT,
  LOW_VITAL_MIN_PERCENT,
} from './lowVitals';
import { LocalStorage } from '../libs/localStorage';
import { RENDER_SCALE_STEP_MAX } from '../libs/renderScale';

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
  /**
   * MSAA on the post chain's first pass, as an index into `MSAA_STEPS`.
   * Classic takes none whatever this says (`pipelineSamples`).
   */
  msaa: number;
  /**
   * Anisotropy on the art's samplers, as an index into `ANISOTROPY_STEPS`.
   * Classic samples nearest and reads none of it (`textureFiltering`).
   */
  anisotropy: number;
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
  /**
   * How much of the window the 3D scene is drawn at before the browser
   * scales it up, as an index into RENDER_SCALE_STEPS (0 is native). The
   * HUD is DOM over the canvas and keeps its own resolution. Only worth
   * moving on a machine the pixels are holding up, which is why it defaults
   * to native (libs/renderScale.ts).
   */
  renderScale: number;
  /**
   * How a reduced `renderScale` is presented: 0 hands the small drawing
   * buffer to the browser and lets it stretch the canvas, 1 draws the world
   * small and reconstructs it at the window's own resolution with FSR
   * (`scenes/upscale.ts`). Inert while the scale is native.
   */
  upscale: number;
  /**
   * Present a warped frame between drawn ones, so more frames reach the
   * screen than the scene is drawn (`scenes/frameGen.ts`). Needs the
   * G-buffer's velocity target, so it runs on the shaped tiers with post
   * processing on and nowhere else.
   */
  frameGeneration: boolean;
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
  /**
   * 0 Classic (the frame as it is) / 1 Cel-shaded (stepped sun on the
   * models) / 2 Anime (the bands plus ink lines and a rim). A taste, not a
   * tier: it lives on lighting tiers >= 1 and Classic's frame never changes.
   * See `renderingStyle.ts`.
   */
  renderingStyle: number;
  /** Bands in the cel ramp, 2..4; unread while no style has a ramp. */
  shadeSteps: number;
  /**
   * How far the Anime style goes, 1..9: the flatness of the textures and
   * the rim. Unread by the other styles.
   */
  styleStrength: number;
  /**
   * The ink lines' width, 1..5 texels at 900 px of height; unread unless
   * the style draws lines.
   */
  lineWidth: number;
  /**
   * How dark the ink lines are, 1..9, black at the top; unread unless the
   * style draws lines.
   */
  lineStrength: number;
  /**
   * Which side of a silhouette the ink lines sit on: 0 inside it (the line
   * eats into the thing it draws), 1 across it, 2 outside it (the thing
   * keeps its whole shape). Unread unless the style draws lines.
   */
  linePlacement: number;
  /**
   * An ink outline on the grass blades, along their edges and across the
   * tip, fading toward the root; the line sliders set it. Unread unless the
   * style draws lines.
   */
  grassOutline: boolean;
  /**
   * The Anime style on the skill effects too: the additive art snapped to
   * the shade steps and given a contour in its own darker colour. Unread
   * unless the style draws lines.
   */
  animeEffects: boolean;
  /**
   * Anime 2.0's rig (`renderingStyle.ts`, ARCHITECTURE 2.6). Every one of
   * these is unread by any other style, and every one of them at 0 compiles
   * no define and builds no pass.
   */
  /** The band edge's hardness, 0..9; 9 is a hard edge, 0 eases over ~4 px. */
  animeShading: number;
  /** Rim strength on the figures, 0..9; 0 draws none. */
  animeRim: number;
  /** How broad the rim is, 0..9: low a thin edge line, high a wash. */
  animeRimWidth: number;
  /** The view-locked matcap sheen on the figures, 0..9; 0 is off. */
  animeMatcap: number;
  /** The painterly flat-tone filter, 0..9; 0 leaves the art alone. */
  animePaint: number;
  /** Screentone strength in the shaded bands, 0..9; 0 is off. */
  animeHalftone: number;
  /** The screentone's dot period in pixels, 1..9. */
  animeHalftoneScale: number;
  /** 0 Off / 1 Screen-space lines / 2 Inverted hull / 3 Both. */
  animeOutlineMode: number;
  /** Radial speed lines at full travel, 0..9; 0 builds no pass. */
  animeSpeedLines: number;
  /**
   * The cinematic trim, 0..9: bloom, chromatic aberration and film grain
   * added on top of the player's own three while Anime 2.0 is live.
   */
  animeFilm: number;
  /** A stylised flare on a landed blow, beside the sparks. */
  animeImpacts: boolean;
  /** Master sound level, 0..9, the original's one slider. */
  volume: number;
  /**
   * The mixer's categories, 0..`BUS_VOLUME_MAX` (`sound/buses.ts`), each a
   * share of the master. 10 is the top, where the category is transparent
   * and the master alone decides - which is where they all start, so the
   * client sounds exactly as it did before they existed.
   */
  musicVolume: number;
  /** Everything that is not music. The categories below are shares of it. */
  effectsVolume: number;
  combatVolume: number;
  monsterVolume: number;
  /** Beds, map-object loops, fire crackle, wildlife. */
  ambientVolume: number;
  stepsVolume: number;
  /** A drop landing on the ground, before the filter below decides. */
  dropVolume: number;
  /** Clicks, windows, pickups, level up, repair, whisper. */
  uiVolume: number;
  /** Instruments played by players - your own and, when `hearInstruments`, everyone else's. */
  instrumentsVolume: number;
  /** Whether other players' instruments sound at all; the visuals stay either way. */
  hearInstruments: boolean;
  /** Ramp the tracks to silence while the page is hidden, and back. */
  muteInBackground: boolean;
  /**
   * Run a landing drop through the rules below instead of sounding every
   * one of them (`sound/drops.ts`). The vocabulary is the loot filter's:
   * what is worth a name on the ground is what is worth hearing land.
   */
  dropSoundFilter: boolean;
  dropSoundJewels: boolean;
  dropSoundExcellent: boolean;
  dropSoundAncient: boolean;
  /** `+7` and up (`HIGH_DROP_LEVEL`, the gold tint). */
  dropSoundHighLevel: boolean;
  /** Everything the rules above do not claim. */
  dropSoundOther: boolean;
  /** Zen piles. */
  dropSoundZen: boolean;
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
  /**
   * The effects a monster draws on itself in the original - the dust a Dark
   * Knight stands in, a Yeti's breath, a Bull Fighter's snort, the burning
   * Death Knight, the sand a Tarkan monster raises walking and dying
   * (`effects/monsterVisuals.ts`). Off is the client as it was: posed bodies
   * and nothing more.
   */
  monsterEffects: boolean;
  autoAttack: boolean;
  /**
   * An amount box in front of every `+` in the character info window, so a
   * few hundred level-up points go in with one press instead of one click
   * each. Off, the window is the original's: one point per click.
   */
  statPointAmounts: boolean;
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
  /**
   * Hovering a drop on the ground shows the item's own tooltip, the same box
   * the inventory draws, so a player can read the options before spending a
   * click and an inventory square on it. Off is the original's name only.
   */
  dropTooltips: boolean;
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
   * A red gradient round the screen edge while health is under
   * `lowHealthPercent`, beating like a heart near death. The life orb sits in
   * a corner nobody looks at mid-fight; this puts the same warning where the
   * eye already is.
   */
  lowHealthWarning: boolean;
  /** Health share the red edge starts at, `LOW_VITAL_MIN/MAX_PERCENT`. */
  lowHealthPercent: number;
  /** The same edge in blue for mana. Off: only casters want it. */
  lowManaWarning: boolean;
  /** Mana share the blue edge starts at. */
  lowManaPercent: number;
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
  /**
   * The world map as a small panel in the top right corner, always on
   * (ours). TAB opens the original's full-screen sheet either way.
   */
  minimapCorner: boolean;
  /**
   * Ctrl-click moves an item to whichever window is open - vault, trade, mix
   * tray, or the merchant - and back again, and Ctrl-click on a shop entry
   * asks how many to buy (`common/quickItemActions.ts`). Off, only the drag
   * and the right click move anything.
   */
  quickItemActions: boolean;
  /**
   * Ask before an excellent, ancient, +7 or higher item, or a jewel, is
   * dropped on the ground or sold to a merchant.
   */
  confirmValuableItems: boolean;
  /**
   * A small corner readout with the frame rate, the frame time and the last
   * measured server round trip (`common/netStats.ts`). Off is the HUD exactly
   * as it was; the `performanceReadout` key action toggles it too.
   */
  performanceReadout: boolean;
  /**
   * The worn item beside the hovered one, with the lines that differ marked
   * up or down: 0 off / 1 while Shift is held / 2 always.
   */
  compareTooltips: number;
  /**
   * A row per timed event under the corner minimap, counting down to the
   * next Blood Castle / Devil Square / Chaos Castle (ours). Off, the client
   * asks the server nothing of its own accord.
   */
  eventTimers: boolean;
  /**
   * The running quests and their counts on the HUD, under the corner minimap
   * (ours). Off is the Classic look: the quest log (T) is the only place a
   * kill count shows.
   */
  questTracker: boolean;
  /**
   * Item names in English whatever the interface language is. The language
   * packs translate them (`Data/Local/<pack>/item_<lang>.bmd`), which reads
   * well but leaves a trader unable to match what a forum or a price list
   * calls the same item - so this turns that one table off and nothing else.
   */
  englishItemNames: boolean;
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
  volume: [0, 9],
  // Literal rather than `BUS_VOLUME_MAX`: sound/buses.ts imports this
  // module, so naming it here would close an import cycle.
  musicVolume: [0, 10],
  effectsVolume: [0, 10],
  combatVolume: [0, 10],
  monsterVolume: [0, 10],
  ambientVolume: [0, 10],
  stepsVolume: [0, 10],
  dropVolume: [0, 10],
  uiVolume: [0, 10],
  instrumentsVolume: [0, 10],
  toneMapper: [0, TONE_MAPPER_MAX],
  brightness: [BRIGHTNESS_MIN, BRIGHTNESS_MAX],
  effectLevel: [0, 4],
  itemEffects: [0, 3],
  lightingQuality: [0, 2],
  materialQuality: [0, 2],
  // Literals rather than `MSAA_MAX` / `ANISOTROPY_MAX`: lightingQuality.ts
  // and materialQuality.ts both import this module, so naming them here
  // would close an import cycle.
  msaa: [0, 3],
  anisotropy: [0, 4],
  // Literal rather than the renderingStyle.ts constants: it imports this
  // module, so naming them here would close an import cycle.
  renderingStyle: [0, 3],
  shadeSteps: [2, 4],
  styleStrength: [1, 9],
  lineWidth: [1, 5],
  lineStrength: [1, 9],
  // Literal rather than the renderingStyle.ts constant, as above.
  linePlacement: [0, 2],
  // Anime 2.0's rig; literals for the same reason.
  animeShading: [0, 9],
  animeRim: [0, 9],
  animeRimWidth: [0, 9],
  animeMatcap: [0, 9],
  animePaint: [0, 9],
  animeHalftone: [0, 9],
  animeHalftoneScale: [1, 9],
  animeOutlineMode: [0, 3],
  animeSpeedLines: [0, 9],
  animeFilm: [0, 9],
  // Literal rather than `MATERIAL_DETAIL_MAX`: materialQuality.ts imports
  // this module, so naming it here would close an import cycle.
  materialDetail: [0, 9],
  filmGrain: [0, 9],
  bloom: [0, 9],
  glow: [0, 9],
  chromatic: [0, 9],
  sharpness: [0, 9],
  renderScale: [0, RENDER_SCALE_STEP_MAX],
  upscale: [0, 1],
  vignette: [0, 9],
  sunShafts: [0, 9],
  lootZen: [0, 9],
  // Literal rather than `COMPARE_TOOLTIP_MAX`: itemCompare.ts imports this
  // module, so naming it here would close an import cycle.
  compareTooltips: [0, 2],
  lowHealthPercent: [LOW_VITAL_MIN_PERCENT, LOW_VITAL_MAX_PERCENT],
  lowManaPercent: [LOW_VITAL_MIN_PERCENT, LOW_VITAL_MAX_PERCENT],
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
  // 4x and 16x: what both were hardwired to before they were the player's,
  // so a fresh install and a returning one look the way they did.
  msaa: 2,
  anisotropy: 4,
  bloom: 3,
  glow: 5,
  chromatic: 0,
  sharpness: 2,
  renderScale: 0,
  upscale: 1,
  frameGeneration: false,
  vignette: 0,
  sunShafts: 3,
  dynamicLights: true,
  lightingQuality: 1,
  materialQuality: 1,
  materialDetail: 6,
  renderingStyle: 0,
  shadeSteps: 3,
  styleStrength: 5,
  lineWidth: 2,
  lineStrength: 5,
  linePlacement: 1,
  grassOutline: true,
  animeEffects: true,
  animeShading: 7,
  animeRim: 5,
  animeRimWidth: 5,
  animeMatcap: 0,
  animePaint: 5,
  animeHalftone: 0,
  animeHalftoneScale: 4,
  animeOutlineMode: 1,
  animeSpeedLines: 0,
  animeFilm: 3,
  animeImpacts: true,
  volume: 5,
  musicVolume: 10,
  effectsVolume: 10,
  combatVolume: 10,
  monsterVolume: 10,
  ambientVolume: 10,
  stepsVolume: 10,
  dropVolume: 10,
  uiVolume: 10,
  instrumentsVolume: 10,
  hearInstruments: true,
  muteInBackground: true,
  dropSoundFilter: false,
  dropSoundJewels: true,
  dropSoundExcellent: true,
  dropSoundAncient: true,
  dropSoundHighLevel: true,
  dropSoundOther: false,
  dropSoundZen: false,
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
  monsterEffects: true,
  autoAttack: false,
  statPointAmounts: true,
  whisperBeep: true,
  slideHelp: true,
  cameraControl: true,
  cameraFov: CAMERA_FOV_DEG,
  wsadMovement: false,
  thirdPersonMouseLook: false,
  firstPersonBob: true,
  autoReconnect: true,
  lootFilter: false,
  dropTooltips: true,
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
  lowHealthWarning: true,
  lowHealthPercent: LOW_VITAL_DEFAULT_PERCENT,
  lowManaWarning: false,
  lowManaPercent: LOW_VITAL_DEFAULT_PERCENT,
  blockBrowserKeys: true,
  minimapCorner: true,
  quickItemActions: true,
  confirmValuableItems: true,
  performanceReadout: false,
  compareTooltips: 2,
  eventTimers: true,
  questTracker: true,
  englishItemNames: false,
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
