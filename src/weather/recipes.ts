import { monsterModelTypeOf } from '../common/playSpeed';

/**
 * **Who leaves what.** Pure data shared by the ground effects — the shape a
 * thing presses into settled snow, how far apart it puts its feet down, how
 * hard it presses and how wide a channel its body ploughs.
 *
 * Read by `footprints.ts` (which bakes one sole atlas row per `TrackShape`)
 * and by `ecs/systems/footprintSystem.ts` (which walks the world and lays
 * them). Neither owns the table: a boot and a paw differ in a dozen small
 * numbers, and those numbers belong in one place where they can be compared
 * against each other rather than scattered across the two files that use
 * them.
 *
 * ### The two halves
 *
 *  - **`TrackShape`** is what the print *looks like* — the silhouette baked
 *    into the sole atlas. There are six, and adding one costs an atlas row
 *    and a case in `shapeDepth`.
 *  - **`TrackRecipe`** is how a particular creature *uses* one: its size, its
 *    stride, how wide it stands, whether it puts down two feet or four, and
 *    how much of a trench it drags between footfalls. Several recipes share a
 *    shape — a yeti and a hound both leave a pad with toes, but one is a
 *    barefoot biped and the other a quadruped at half the size.
 *
 * ### Keyed by model, not by monster
 *
 * `MODEL_TRACKS` is keyed by the **monster model type** (`MONSTER_MODEL_*`,
 * `MODEL_MONSTER01 + type`), which `monsterModelTypeOf(npcType)` reads from
 * `MONSTER_MODEL_TABLE` — the same key `deathVisuals.ts` uses for its
 * shatters, and for the same reason: what a thing leaves behind is decided by
 * the body it has, and a few hundred `npcType` rows share a few dozen bodies.
 * Golden, elite and event variants of a monster therefore inherit its track
 * for free.
 *
 * The table is a first pass over the models the shipped tables name; anything
 * not listed falls back to `boot`, because most of MU's bestiary is bipedal
 * and shod. Devias is the only map with settled snow on the ground today
 * (`SNOW_GROUND_MAPS`), so its own residents are the rows that can be checked
 * by looking at the screen; the rest are waiting for their map to get snow.
 */

// ---- 1. tuning -------------------------------------------------------------

/**
 * The silhouettes. One atlas row each in `footprints.ts`, so this list is
 * short on purpose — six shapes that read differently at a glance beat twenty
 * that all read as "some kind of mark".
 *
 * `none` draws nothing: it is what a flyer, a wraith and a slitherer share.
 * The slitherer still ploughs its channel — see `dragWidth`.
 */
export type TrackShape =
  | 'boot'
  | 'paw'
  | 'claw'
  | 'hoof'
  | 'chitin'
  | 'pad'
  | 'none';

/** Every shape that is actually drawn, in atlas-row order. */
export const DRAWN_SHAPES = [
  'boot',
  'paw',
  'claw',
  'hoof',
  'chitin',
  'pad',
] as const satisfies readonly TrackShape[];

export interface TrackRecipe {
  /** The silhouette pressed into the ground. `none` presses nothing. */
  readonly shape: TrackShape;
  /**
   * Size of one print, × the tuned print in `FOOTPRINT_TUNING`.
   *
   * Uniform, deliberately: the relief march works in UV against a fixed
   * reach, so a quad scaled up is a hollow that much deeper in world terms as
   * well. One number therefore gets "bigger foot, deeper hole" without a
   * second per-instance channel. The print's *proportions* come from its
   * shape (`SHAPE_ASPECT` in footprints.ts), never from here.
   */
  readonly scale: number;
  /** Tiles walked between footfalls. */
  readonly stride: number;
  /** Tiles from the centre line out to a print: half the stance. */
  readonly side: number;
  /** 2 lays one print a footfall; 4 lays a hind and a fore on the same side. */
  readonly feet: 2 | 4;
  /** Tiles from the hind print to the fore one. `feet: 4` only. */
  readonly reach: number;
  /**
   * How hard it presses, × the strength the snow itself allows.
   *
   * Well under 1 for anything that also ploughs a channel: the trench is what
   * carries the depth there and the prints are only pockets in its floor (see
   * `GAIT` in footprintSystem.ts). High for the light-footed, whose marks are
   * separate punctures with untouched snow between them.
   */
  readonly press: number;
  /** Width of the channel the body ploughs, in tiles. 0 ploughs none. */
  readonly dragWidth: number;
  /** How deeply that channel cuts, × the print's own strength. */
  readonly drag: number;
  /** Snow thrown at each footfall, × the hero's. */
  readonly spray: number;
}

/**
 * The recipes. `boot` is the hero's and the default, and its numbers are the
 * ones the whole look was tuned against — the gait multipliers in
 * `footprintSystem.ts` are relative to it, so changing `boot` moves every
 * character in the game.
 */
const TRACKS = {
  /** A shod biped: every player, every town NPC, most of the bestiary. */
  boot: {
    shape: 'boot',
    scale: 1,
    stride: 0.5,
    side: 0.14,
    feet: 2,
    reach: 0,
    press: 0.28,
    dragWidth: 1.0,
    drag: 1,
    spray: 1,
  },
  /**
   * Golems, giants, balrogs: a foot with no toes in it, twice the size, and
   * heavy enough that the channel behind it is a furrow.
   */
  stomp: {
    shape: 'pad',
    scale: 1.9,
    stride: 0.95,
    side: 0.26,
    feet: 2,
    reach: 0,
    press: 0.55,
    dragWidth: 1.7,
    drag: 1,
    spray: 1.6,
  },
  /** A barefoot biped with toes — yetis, forest monsters, the big and furry. */
  barefoot: {
    shape: 'paw',
    scale: 1.35,
    stride: 0.62,
    side: 0.18,
    feet: 2,
    reach: 0,
    press: 0.4,
    dragWidth: 1.2,
    drag: 0.9,
    spray: 1.1,
  },
  /**
   * A four-footed animal: hounds, wolves, werewolves. Small pads in two
   * pairs, and a narrow channel — a dog's chest clears snow that a man's legs
   * plough straight through.
   */
  paw: {
    shape: 'paw',
    scale: 0.85,
    stride: 0.55,
    side: 0.16,
    feet: 4,
    reach: 0.75,
    press: 0.45,
    dragWidth: 0.7,
    drag: 0.55,
    spray: 0.7,
  },
  /** A two-legged reptile: lizardmen, drakan, the smaller dragons. */
  claw: {
    shape: 'claw',
    scale: 1.1,
    stride: 0.6,
    side: 0.16,
    feet: 2,
    reach: 0,
    press: 0.45,
    dragWidth: 0.9,
    drag: 0.7,
    spray: 0.9,
  },
  /** A four-legged one, and bigger: bahamut, gorgon, the great beasts. */
  beast: {
    shape: 'claw',
    scale: 1.35,
    stride: 0.8,
    side: 0.22,
    feet: 4,
    reach: 1.0,
    press: 0.5,
    dragWidth: 1.3,
    drag: 0.85,
    spray: 1.2,
  },
  /** A cloven biped: bull fighters, devils. Two crescents, pressed hard. */
  cloven: {
    shape: 'hoof',
    scale: 1.0,
    stride: 0.58,
    side: 0.15,
    feet: 2,
    reach: 0,
    press: 0.6,
    dragWidth: 0.9,
    drag: 0.8,
    spray: 0.9,
  },
  /** On all fours: death cows, anything ridden. */
  hoof: {
    shape: 'hoof',
    scale: 0.95,
    stride: 0.62,
    side: 0.17,
    feet: 4,
    reach: 0.85,
    press: 0.6,
    dragWidth: 0.8,
    drag: 0.6,
    spray: 0.8,
  },
  /**
   * Spiders, scorpions, beetles: thin legs that punch small deep holes and a
   * body that never touches the snow, so there is no channel at all — which
   * is the whole point of it. A line of separate pricks with clean snow
   * between them reads as an insect and as nothing else.
   */
  chitin: {
    shape: 'chitin',
    scale: 0.7,
    stride: 0.34,
    side: 0.22,
    feet: 4,
    reach: 0.45,
    press: 0.8,
    dragWidth: 0,
    drag: 0,
    spray: 0.25,
  },
  /**
   * Worms, larvae, hydras, the rolling Iron Wheel: no feet, so no prints —
   * one unbroken groove and nothing else in it.
   */
  slide: {
    shape: 'none',
    scale: 1,
    stride: 0.5,
    side: 0,
    feet: 2,
    reach: 0,
    press: 0,
    dragWidth: 1.1,
    drag: 0.85,
    spray: 0.5,
  },
  /**
   * Off the ground: flyers, hovering things, wraiths with no feet to speak
   * of. Leaves the snow exactly as it found it.
   */
  none: {
    shape: 'none',
    scale: 1,
    stride: 1,
    side: 0,
    feet: 2,
    reach: 0,
    press: 0,
    dragWidth: 0,
    drag: 0,
    spray: 0,
  },
} as const satisfies Record<string, TrackRecipe>;

export type TrackName = keyof typeof TRACKS;

/**
 * Monster model type → the track it leaves.
 *
 * Ordered by model index so it can be read side by side with
 * `MONSTER_MODEL_TABLE`. Anything absent takes `boot`.
 *
 * ### `none` and `slide` are earned, not guessed
 *
 * The first cut of this table was written from monster *names*, and the two
 * silent recipes are exactly where that fails invisibly: a wrong `boot` on a
 * hound is a visible mistake somebody can report, and a wrong `none` is a
 * creature that quietly leaves nothing, which reads as the feature being
 * broken. Devias' **Worm** was the one that proved it — MU's name is a
 * mistranslation and the model is a striped, fanged quadruped, so a row
 * written from the word "worm" turned the map's most common monster into a
 * thing that left no prints at all. Its **Iron Wheel** does not roll either:
 * it is in `SAND_SMOKE_MODELS` (impactVisuals.ts), the list of monsters the
 * original drops a sand puff under *as they walk*, which is the client's own
 * evidence that they are on their feet.
 *
 * So a row here only says `none` when something proves the thing is off the
 * ground — the client lifting it (`HoverHeight`), or a model that is plainly a
 * floating shroud — and only says `slide` for a body with no legs in it. When
 * in doubt it walks, because walking is the mistake that can be seen.
 */
const MODEL_TRACKS: Readonly<Record<number, TrackName>> = {
  0: 'cloven', // Bull Fighter
  1: 'paw', // Hound
  2: 'none', // Budge Dragon — hovers (MonsterObject.BobsWhileMoving)
  5: 'stomp', // Giant
  6: 'slide', // Larva
  7: 'none', // Ghost
  8: 'chitin', // Hell Spider
  9: 'chitin', // Spider
  10: 'stomp', // Cyclops
  11: 'beast', // Gorgon
  12: 'barefoot', // Yeti
  13: 'barefoot', // Elite Yeti
  15: 'stomp', // Ice Monster
  // Devias' "Worm" is a four-legged, striped, fanged beast — the name is a
  // mistranslation and it is the map's commonest monster, so this row is the
  // one most likely to be looked at.
  17: 'paw', // Worm
  20: 'chitin', // Scorpion
  21: 'chitin', // Beetle Monster
  23: 'stomp', // Forest Monster
  24: 'paw', // Agon
  25: 'stomp', // Stone Golem
  26: 'cloven', // Devil
  27: 'stomp', // Balrog
  30: 'hoof', // Death Cow
  31: 'none', // Red Dragon — flies
  33: 'beast', // Bahamut
  34: 'slide', // Vepar
  36: 'claw', // Lizard King
  37: 'slide', // Hydra
  39: 'stomp', // Golden Titan
  // Not a wheel: an armoured walking construct. `SAND_SMOKE_MODELS` in
  // impactVisuals.ts has it dropping a puff under itself every tick it walks.
  41: 'stomp', // Iron Wheel
  43: 'paw', // Bloody Wolf
  50: 'slide', // Aquamos
  51: 'slide', // Queen Rainer
  54: 'claw', // Drakan
  55: 'none', // Phoenix of Darkness
  58: 'beast', // Spirit Beast
  64: 'stomp', // Kundun Demon
  69: 'stomp', // Schriker / Illusion Kundun
  81: 'claw', // Lizard Warrior
  82: 'stomp', // Fire Golem
  83: 'none', // Queen Bee
  84: 'stomp', // Poison Golem / Gigas Golem
  95: 'paw', // Werewolf
  101: 'stomp', // Blue Golem
  102: 'hoof', // Death Rider
  104: 'stomp', // Death Tree
  105: 'beast', // Hell Maine
};

// ---- 2. state + readers ----------------------------------------------------

/** The recipe by name. */
export function trackNamed(name: TrackName): TrackRecipe {
  return TRACKS[name];
}

/**
 * What this character leaves behind.
 *
 * `npcType` is what makes an entity a monster or an NPC (attackSystem.ts): a
 * player has none, and players wear boots. A type with no monster model — a
 * town NPC, a trap, an unknown — falls back to `boot` for the same reason the
 * default does.
 */
export function trackFor(npcType: number | undefined): TrackRecipe {
  if (npcType === undefined) return TRACKS.boot;
  return TRACKS[MODEL_TRACKS[monsterModelTypeOf(npcType)] ?? 'boot'];
}
