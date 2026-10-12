import type { BodyCard, BodyFxEmitter, BodyParticle, BodyPuff, BodyTexture } from '@/controllers/monsters';
import { MonsterActionType as A } from '../../objects/enum';

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
