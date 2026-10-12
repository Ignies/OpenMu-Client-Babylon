import type { BodyBlurSheet, BodyCard, BodyFxEmitter, BodyParticle, BodyPuff, BodyTexture } from '@/controllers/monsters';
import { MonsterActionType as A } from '../../objects/enum';
import { lookState } from '@/controllers/monsters';

/**
 * Building blocks the monster folders' `bodyFx` rows share (`MoveCharacterVisual`,
 * ZzzCharacter.cpp:5583). Plain data, no engine: the fx controller draws them.
 */

type Cm3 = readonly [number, number, number];
type RGB = readonly [number, number, number];

export const body = (
  every: number,
  recipe: BodyParticle,
  box: Cm3,
  extra: Partial<Extract<BodyFxEmitter, { kind: 'body' }>> = {}
): BodyFxEmitter => ({ kind: 'body', every, recipe, box, ...extra });

export const bone = (
  every: number,
  recipe: BodyParticle,
  at: number,
  extra: Partial<Extract<BodyFxEmitter, { kind: 'bone' }>> = {}
): BodyFxEmitter => ({ kind: 'bone', every, recipe, bone: at, ...extra });

export const bones = (
  every: number,
  count: number,
  recipe: BodyParticle,
  extra: Partial<Extract<BodyFxEmitter, { kind: 'bones' }>> = {}
): BodyFxEmitter => ({ kind: 'bones', every, count, recipe, ...extra });

export const halo = (texture: BodyTexture, colour: RGB, size: number, heightCm: number): BodyFxEmitter => ({
  kind: 'halo',
  texture,
  colour,
  size,
  heightCm,
});

export const mark = (texture: BodyTexture, colour: RGB, tiles: number, spin: number): BodyFxEmitter => ({
  kind: 'mark',
  texture,
  colour,
  tiles,
  spin,
});

/** `MonsterMoveSandSmoke` (:5570): walking, one `SMOKE + 1` a tick within ±100 cm. */
export const walkSand = body(1, 'sandSmoke', [100, 100, 0], {
  gate: { action: [A.Walk] },
});

/** `MonsterDieSandSmoke` (:5551): Die frame 8, twenty `SMOKE + 1` SubType 1 in a ±32 x ±16 box. */
export const dieSand = body(1, 'sandSmokeBurst', [32, 32, 16], {
  count: 20,
  gate: { action: [A.Die], frames: [[8, 9]] },
});

/**
 * The Dark Knight / Larva / Chain Scorpion arm (:6157-6166): alive, one puff
 * in four ticks, `BITMAP_SMOKE` on Devias and `SMOKE + 1` elsewhere.
 */
export const haze = (colour?: RGB): BodyFxEmitter =>
  body(4, 'sandSmoke', [32, 32, 16], {
    devias: 'bodySmoke',
    colour,
    gate: { alive: true },
  });

/** `c->Appear = 60` (WSclient.cpp:2856): ticks the golden bosses' arrival dust runs. */
export const APPEAR_TICKS = 60;

/**
 * MODEL_BULL_FIGHTER (0 Bull Fighter, 4 Elite Bull Fighter, 8 Poison Bull): the snort from
 * bone 24, (0, -4, 0) cm, one tick in two, on Stop1 frames 15-20, Stop2 20-25 and Walk 2-3 / 5-6
 * (:6189-6205).
 */
export const BULL_SNORT: readonly BodyFxEmitter[] = [
  bone(2, 'bodySmoke', 24, {
    local: [0, -4, 0],
    gate: { action: [A.Stop1], frames: [[15, 20]] },
  }),
  bone(2, 'bodySmoke', 24, {
    local: [0, -4, 0],
    gate: { action: [A.Stop2], frames: [[20, 25]] },
  }),
  bone(2, 'bodySmoke', 24, {
    local: [0, -4, 0],
    gate: {
      action: [A.Walk],
      frames: [
        [2, 3],
        [5, 6],
      ],
    },
  }),
];

type CardsRow = Extract<BodyFxEmitter, { kind: 'cards' }>;
type PuffRow = Extract<BodyFxEmitter, { kind: 'puff' }>;

/** `CreateSprite(BITMAP_*, bone + local, scale, Light, o)` for each spot, in one light. */
export const cards = (colour: RGB, spots: CardsRow['spots'], extra: Partial<CardsRow> = {}): BodyFxEmitter => ({
  kind: 'cards',
  spots,
  colour,
  ...extra,
});

/** The same sheet at the same scale on several bones. */
export const spotsOn = (bones: readonly number[], card: BodyCard, scale: number, local?: Cm3): CardsRow['spots'] =>
  bones.map(b => ({ bone: b, card, scale, local }));

/** A JOINT_ENERGY ribbon riding a bone: `Scale` cm wide, `MaxTails` long. */
export const trail = (
  at: number,
  widthCm: number,
  maxTails: number,
  colour: RGB,
  extra: Partial<Extract<BodyFxEmitter, { kind: 'trail' }>> = {}
): BodyFxEmitter => ({ kind: 'trail', bone: at, widthCm, maxTails, colour, ...extra });

/** `BITMAP_SMOKELINE1 + rand() % 3`: one of the three sheets. */
export const SMOKE_LINES: readonly BodyPuff[] = ['smokeLine1', 'smokeLine2', 'smokeLine3'];

export const puff = (
  every: number,
  bonesAt: readonly number[],
  particles: PuffRow['particles'],
  colour: RGB,
  extra: Partial<PuffRow> = {}
): BodyFxEmitter => ({ kind: 'puff', every, bones: bonesAt, particles, colour, ...extra });

/** One card: `CreateSprite(sheet, TransformPosition(bone, local), scale, Light, o)`. */
export const spot = (bone: number, card: BodyCard, scale: number, local?: Cm3): CardsRow['spots'][number] =>
  local ? { bone, card, scale, local } : { bone, card, scale };

/** `eBuff_Berserker` (81): the Imperial Guardian bosses' rage. */
const BERSERKER = 81;

/** `for (i < NumBones) if (i % 5 == 0)`: every fifth bone of a body of `numBones`. */
const fifthBones = (numBones: number): number[] => Array.from({ length: Math.ceil(numBones / 5) }, (_, i) => i * 5);

/**
 * An Imperial Guardian boss under `eBuff_Berserker`: every fifth bone, each its own `rand() % 6`, a
 * `BITMAP_SMOKE` SubType 50 and a smoke line in red (GMEmpireGuardian1.cpp:2093-2108, GMEmpireGuardian2.cpp:877,
 * GMEmpireGuardian3.cpp:1082, GMEmpireGuardian4.cpp:1183, :1313).
 */
export const rageSmoke = (numBones: number): BodyFxEmitter =>
  puff(6, fifthBones(numBones), ['smoke50', SMOKE_LINES], [1, 0.1, 0.1], { rollEach: true, gate: { buff: BERSERKER } });

// ---- the Iron Knights (GM_Raklion.cpp RenderMonsterVisual) ----

const KNIGHT_BLUE: RGB = [0.3, 0.6, 1];

/**
 * The Iron Knight and the Dark Iron Knight: bones 20, 37, 45, 51 each roll `rand() % 6` and, in (0.3, 0.6, 1) two
 * times in three or (0.8, 0.8, 0.8), throw SMOKE SubType 50 and a SMOKELINE SubType 2 at 0.8 (:1875-1897, :2128-2150).
 */
export const ironKnightSmoke = (): BodyFxEmitter =>
  puff(6, [20, 37, 45, 51], ['smoke50', ['smokeLine1_2', 'smokeLine2_2', 'smokeLine3_2']], KNIGHT_BLUE, {
    rollEach: true,
    scales: [1, 0.8],
    colours: [KNIGHT_BLUE, KNIGHT_BLUE, [0.8, 0.8, 0.8]],
  });

/** ...and dying, before Die frame 1, six MODEL_EFFECT_BROKEN_ICE0 + rand() % 3 a tick at each (:1960-1970, :2213-2223). */
export const ironKnightIce = (): BodyFxEmitter => ({
  kind: 'shards',
  every: 1,
  shards: 'brokenIce',
  count: 6,
  bones: [20, 37, 45, 51],
  colour: [0.3, 0.5, 1],
  gate: { action: [A.Die], frames: [[0, 1]] },
});

// ---- the Swamp of Quiet line (GMSwampOfQuiet.cpp RenderMonsterVisual) ----

/** The Sapis and the Sapi Queen: two BITMAP_LIGHT cards on bone 15 (:812-840, :1136-1146). */
export const sapiLight = (colour: RGB): BodyFxEmitter => cards(colour, spotsOn([15, 15], 'light', 2));

/** The Shadows: SMOKE 50 and a smoke line from six bones, each its own `rand() % 6` (:842-950, :1190-1199). */
export const shadowSmoke = (colour: RGB, scales: readonly [number, number] = [1, 1]): BodyFxEmitter =>
  puff(6, [11, 15, 34, 21, 25, 39], ['smoke50', SMOKE_LINES], colour, { rollEach: true, scales });

/**
 * The Blaze and Ice Napins: BITMAP_LIGHT on bones 10, 61, 72, 21 (Scale 4) and 122, 116 (1) and, about
 * each, one of BITMAP_FIRE_HIK1, BITMAP_FIRE_CURSEDLICH SubType 4 or BITMAP_FIRE_HIK3 a tick (:1002-1043, :1147-1188).
 */
export const napinFires = (light: RGB, fire: RGB): readonly BodyFxEmitter[] => [
  cards(light, [...spotsOn([10, 61, 72, 21], 'light', 4), ...spotsOn([122, 116], 'light', 1)]),
  puff(1, [10, 61, 72, 21], [['fire1', 'fire2', 'fire3']], fire, { scale: 1.2, jitterCm: 10 }),
  puff(1, [122, 116], [['fire1', 'fire2', 'fire3']], fire, { scale: 0.7, jitterCm: 5 }),
];

type BlurRow = Extract<BodyFxEmitter, { kind: 'blur' }>;

/** `CreateBlur` from one bone point to another while the gate is open (a RenderObject swing loop). */
export const blur = (
  from: number,
  to: number,
  colour: RGB,
  sheet: BodyBlurSheet,
  extra: Partial<BlurRow> = {}
): BodyFxEmitter => ({ kind: 'blur', from, to, colour, sheet, ...extra });

/**
 * A Sapi's claws through Attack1 / Attack2 in its frame window: CreateBlur Type 0 from bone 42 to each of 34, 35,
 * 38, 39 and 43, each its own SubType (GMSwampOfQuiet.cpp:620-795).
 */
export const sapiClaws = (colour: RGB, frames: readonly [number, number], from = 42, to = [34, 35, 38, 39, 43]): BodyFxEmitter[] =>
  to.map(b => blur(from, b, colour, 'blur01', { gate: { action: [A.Attack1, A.Attack2], frames: [frames] } }));

// ---- the Maya hands (GM_Kanturu_3rd.cpp MoveMonsterVisual) ----

/** `KANTURU_MAYA_DIRECTION_MAYA3` (_enum.h:3734): the hands' death and Stop2 looks turn on it. */
const MAYA3 = 14;

/**
 * A Maya hand's Move visual (:879-937): dying before MAYA3, five WATERFALL_3 SubType 6 at Scale 2 a tick at
 * `BoneTransform[rand() % 45]` in (0.4, 0.6, 1); in Stop2 from MAYA3 on, a SMOKE + 3 SubType 3 at 1.5 and a SubType 4
 * at 0.8 a tick at the palm. Not here: the dying hand's BlendMesh -2.
 */
export const mayaHandMoves = (palm: number, local: Cm3): BodyFxEmitter[] => [
  puff(1, Array.from({ length: 45 }, (_, i) => i), ['waterfall3_6'], [0.4, 0.6, 1], {
    pick: 5,
    scale: 2,
    gate: { action: [A.Die], when: () => lookState('kanturuMaya') < MAYA3 },
  }),
  puff(1, [palm], ['smoke3_3', 'smoke3_4'], [1, 1, 1], {
    local,
    scales: [1.5, 0.8],
    gate: { action: [A.Stop2], when: () => lookState('kanturuMaya') >= MAYA3 },
  }),
];

// ---- the Aida and Kanturu swing blurs (MoveAidaBlurEffect, MoveKanturu1stBlurEffect, Move_Kanturu2nd_BlurEffect) ----

const ATTACKS = [A.Attack1, A.Attack2];

/** One swing's blurs, each `from(fromLocal) > to(toLocal)` in the same light, sheet and gate. */
const swings = (pairs: readonly (readonly [number, Cm3, number, Cm3])[], colour: RGB, sheet: BodyBlurSheet, extra: Partial<BlurRow>): BodyFxEmitter[] =>
  pairs.map(([from, fromLocal, to, toLocal]) => blur(from, to, colour, sheet, { fromLocal, toLocal, ...extra }));

/** The Death Rider and the Bloody Death Rider: Type 3, Short, to Attack frame 5.06 (GMAida.cpp:539-573, :684-720). */
export const DEATH_RIDER_BLURS = swings(
  [
    [18, [20, 0, 0], 20, [100, 0, 0]],
    [25, [20, 0, 0], 26, [100, 0, 0]],
  ],
  [1, 1, 1],
  'blur02',
  { short: true, gate: { action: ATTACKS, frames: [[0, 5.06]] } }
);

/** The Forest Orc and the Bloody Orc: Type 3, Short, through Attack1 / Attack2 (GMAida.cpp:575-612, :645-682). */
export const ORC_BLURS = swings(
  [
    [35, [20, 0, 0], 37, [60, 0, 0]],
    [39, [20, 0, 0], 41, [60, 0, 0]],
    [43, [20, 0, 0], 45, [60, 0, 0]],
  ],
  [0.5, 0.5, 0],
  'blur02',
  { short: true, gate: { action: ATTACKS } }
);

/** The Death Tree: Type 3, Short, through Attack1 (GMAida.cpp:614-643). */
export const DEATH_TREE_BLURS = swings([[26, [0, 0, 20], 27, [0, 0, 70]]], [0.3, 0.3, 0.3], 'blur02', {
  short: true,
  gate: { action: [A.Attack1] },
});

/** The Satyros: Type 1 off bone 44, Attack frames 3.6-6 (GM_Kanturu_1st.cpp:1608-1640). */
export const SATYROS_BLURS = swings([[44, [0, 0, 0], 44, [0, 0, -200]]], [0.3, 1, 3.5], 'motionBlur', {
  gate: { action: ATTACKS, frames: [[3.6, 6]] },
});

/** The Berserker and the Berserker Warrior: Type 1, Attack frames 3.5-6.7 (GM_Kanturu_1st.cpp:1642-1674, :1798-1834). */
export const BERSERKER_BLURS = swings([[33, [-20, 0, 0], 34, [100, 0, 0]]], [0.3, 2, 0.5], 'motionBlur', {
  gate: { action: ATTACKS, frames: [[3.5, 6.7]] },
});

/** The Blade Hunter: Type 0, Attack frames 5.9-7.55 (GM_Kanturu_1st.cpp:1676-1706). */
export const BLADE_HUNTER_BLURS = swings([[55, [0, 0, 0], 54, [0, 0, 0]]], [1, 1.2, 2], 'blur01', {
  gate: { action: ATTACKS, frames: [[5.9, 7.55]] },
});

/** The Gigantis and the Kentauros Warrior: Type 0, Attack frames 3.5-5.9 (GM_Kanturu_1st.cpp:1708-1742, :1836-1870). */
export const GIGANTIS_BLURS = swings([[34, [0, 0, 0], 33, [0, 0, 0]]], [1, 1.2, 2], 'blur01', {
  gate: { action: ATTACKS, frames: [[3.5, 5.9]] },
});

/**
 * The Genocider and the Gigantis Warrior: Type 0, Short, four claws, Attack frames 5.5-6.9 (GM_Kanturu_1st.cpp:1744-1796,
 * :1872-1924). The original lays 18 samples a tick here, not 10.
 */
export const GENOCIDER_BLURS = swings(
  [49, 51, 50, 52].map(b => [b, [-40, 0, 0], b, [10, 0, 0]] as const),
  [1, 0.2, 0],
  'blur01',
  { short: true, gate: { action: ATTACKS, frames: [[5.5, 6.9]] } }
);

/** The Twin Tail: Type 1, to Attack1 frame 4.12 (GM_Kanturu_2nd.cpp:1286-1309). */
export const TWIN_TAIL_BLURS = swings([[58, [-150, 50, 0], 59, [150, -200, 0]]], [1, 0.2, 0.5], 'motionBlur', {
  gate: { action: [A.Attack1], frames: [[0, 4.12]] },
});

/** The Dreadfear: Type 4 (dark) off bone 33, to Attack1 frame 5 and Attack2 frame 9 (GM_Kanturu_2nd.cpp:1355-1378). */
export const DREADFEAR_BLURS = [
  ...swings([[33, [0, 0, 0], 33, [100, 120, 0]]], [1, 1, 1], 'blur01', { dark: true, gate: { action: [A.Attack1], frames: [[0, 5]] } }),
  ...swings([[33, [0, 0, 0], 33, [100, 120, 0]]], [1, 1, 1], 'blur01', { dark: true, gate: { action: [A.Attack2], frames: [[0, 9]] } }),
];
