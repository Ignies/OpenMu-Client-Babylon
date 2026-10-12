import { describe, expect, it } from 'vitest';
import type { BodyFxEmitter } from '@/controllers/monsters';
import { MonsterActionType as A } from '../objects/enum';
import { monsters } from './all';

/** The rows of one kind a type's folder writes. */
function rows<K extends BodyFxEmitter['kind']>(numb: number, kind: K): Extract<BodyFxEmitter, { kind: K }>[] {
  return (monsters.def(numb)?.bodyFx ?? []).filter((e): e is Extract<BodyFxEmitter, { kind: K }> => e.kind === kind);
}

/** Every card as `bone:sheet@scale` with its row's light. */
const cards = (numb: number) =>
  rows(numb, 'cards').flatMap(r => r.spots.map(s => `${s.bone}:${s.card}@${s.scale} ${r.colour.join(',')}`));

const trails = (numb: number) => rows(numb, 'trail').map(t => `${t.bone} ${t.widthCm}cm x${t.maxTails} ${t.colour.join(',')}`);

describe('boss bodies', () => {
  // RenderMonsterVisual's MODEL_MEDUSA (GMSwampOfQuiet.cpp:1044-1134).
  it('light Medusa from the swamp file', () => {
    expect(cards(561).sort()).toEqual(
      [
        '5:lightMarks@2 0.9,0.8,0.3',
        '5:light@2.4 0.1,1,0',
        '33:lightMarks@1.2 0.9,0.8,0.3',
        '33:light@1.4 0.1,1,0',
        '34:lightRed@0.4 1,1,1',
        '35:lightRed@0.4 1,1,1',
        '68:light@4 0.1,1,0',
        '68:shockWave@0.35 0.9,1,0.1',
        '68:shockWave@0.22 0.9,1,0.1',
        '68:shiny2@1.2 0.9,1,0.9',
        '66:lightRed@0.4 1,1,1',
        '67:lightRed@0.4 1,1,1',
        '69:lightRed@0.4 1,1,1',
        '70:lightRed@0.4 1,1,1',
      ].sort()
    );
    // MoveEye(34, 35) feeds the SubType 55 / 56 eye ribbons; SubType 57 rides bones 67 and 70 with 15 tails.
    expect(trails(561).sort()).toEqual(['34 6cm x8 1,0,0', '35 6cm x8 1,0,0', '67 10cm x15 0.1,0.6,0.3', '70 10cm x15 0.1,0.6,0.3']);
    const [neck, die] = rows(561, 'puff');
    expect(neck).toMatchObject({ every: 6, bones: [5], particles: ['smoke50', ['smokeLine1', 'smokeLine2', 'smokeLine3']], colour: [0.25, 1, 0] });
    expect(die).toMatchObject({ every: 3, bones: [0, 5, 124], particles: ['smoke1', 'smoke1'], gate: { action: [A.Die] } });
  });
});

describe('Kundun', () => {
  // MODEL_ILLUSION_OF_KUNDUN: the bone 6 smoke (GMHellas.cpp:1433-1440), and while alive the red eyes, the
  // swelling blue flare on bone 100 and its smoke (:1570-1632).
  it('smokes from bone 6 and lights his eyes and bone 100 while alive', () => {
    const [bone6, bone100] = rows(275, 'puff');
    expect(bone6).toMatchObject({ every: 2, bones: [6], particles: ['smoke17'], colour: [1, 0.2, 0], local: [2, 30, 0] });
    expect(bone100).toMatchObject({ every: 2, bones: [100], particles: ['smoke13'], gate: { alive: true } });
    const [eyes, flare] = rows(275, 'cards');
    expect(eyes).toMatchObject({ colour: [1, 0, 0], pulse: { speed: 0.003, amount: 0.2, base: 0.8 }, gate: { alive: true } });
    expect(cards(275)).toEqual(['8:energy@0.4 1,0,0', '9:energy@0.4 1,0,0', '100:flareBlue@1.2 1,1,1']);
    expect(flare).toMatchObject({ swell: { speed: 0.001, amount: 0.3 }, gate: { alive: true } });
  });
});

describe('Selupan', () => {
  // RenderMonsterVisual's MODEL_SELUPAN (GM_Raklion.cpp:2003-2049): blue lights breathing in colour and size on
  // bones 9 and 70-74, some turning on the world clock.
  it('carries his blue lights on bones 9 and 70-74', () => {
    expect(cards(459)).toEqual([
      '9:light@2.2 0.3,0.6,1',
      '9:light@2.2 0.3,0.6,1',
      '9:light@3.2 0.3,0.6,1',
      '70:light@2.3 0.1,0.2,1',
      '70:shiny6@2 0.1,0.2,1',
      '74:light@2.3 0.1,0.2,1',
      '74:shiny6@2 0.1,0.2,1',
      '71:light@2.5 0.1,0.2,1',
      '71:shiny2@2.5 0.1,0.2,1',
      '71:shiny6@2.5 0.1,0.2,1',
      '72:light@2 0.1,0.2,1',
      '72:shiny6@1.5 0.1,0.2,1',
      '71:eventCloud@0.6 0.1,0.2,1',
      '71:eventCloud@0.4 0.1,0.2,1',
    ]);
    const [head, hands, clouds] = rows(459, 'cards');
    expect(head).toMatchObject({ lift: { speed: 0.004, amount: 0.25, base: 0.25 }, swell: { speed: 0.004, amount: 0.2 } });
    expect(head.spots[0].local).toEqual([0, 10, 0]);
    expect(hands).toMatchObject({ lift: { speed: 0.004, amount: 0.1, base: 0.1 }, swell: { speed: 0.004, amount: 0.2 } });
    expect(hands.spots.map(s => s.spin ?? 0)).toEqual([0.08, 0, 0.08, 0, 0, 0.08, 0.15, 0, 0]);
    expect(clouds).toMatchObject({ lift: { speed: 0.004, amount: 0.1, base: 0.1 } });
    expect(clouds.swell).toBeUndefined();
    expect(clouds.spots.map(s => s.spin)).toEqual([-0.1, -0.2]);
  });
});

describe('Erohim', () => {
  // RenderHuntingGroundMonsterVisual's MODEL_EROHIM (GMHuntingGround.cpp:672-712): two red lights on each eye, and
  // through Attack2 a true fire and a smoke from the left hand. Monster82_LHand is not his bone, so the fire is a
  // plain SubType 0 one (ZzzEffectParticle.cpp:8281-8298).
  it('lights his eyes and fires his left hand through Attack2', () => {
    expect(cards(295)).toEqual(['8:light@0.5 0.9,0.2,0.1', '8:light@0.5 0.9,0.2,0.1', '9:light@0.5 0.9,0.2,0.1', '9:light@0.5 0.9,0.2,0.1']);
    expect(rows(295, 'cards')[0].spots[0].local).toEqual([0, -2, 0]);
    expect(rows(295, 'puff')).toEqual([
      expect.objectContaining({ every: 1, bones: [16], local: [0, 0, -10], particles: ['trueFire'], scale: 3, gate: { action: [A.Attack2] } }),
      expect.objectContaining({ every: 1, bones: [16], local: [0, 0, -10], particles: ['smoke21'], scale: 2, gate: { action: [A.Attack2] } }),
    ]);
  });
});

describe('Balgass', () => {
  // CreateJoint(BITMAP_JOINT_ENERGY, SubType 2 / 3, Scale 30) at his creation (GMCrywolf1st.cpp:674-675) on
  // MoveEye(9, 10)'s eyes (:802): 20 tails on the left (bone 10), 8 on the right (bone 9), in SubType 2 / 3's
  // purple (ZzzEffectJoint.cpp:458-459).
  it('runs his two purple eye ribbons', () => {
    expect(trails(349)).toEqual(['10 30cm x20 0.5,0.1,1', '9 30cm x8 0.5,0.1,1']);
  });
});

describe('Nightmare', () => {
  // MODEL_DARK_SKULL_SOLDIER_5 (GM_Kanturu_3rd.cpp:666-705, :1005-1081): the SubType 18-21 ribbons on MoveEye(9, 10,
  // 39, 40)'s eyes and the white cards on his registered bones, none of it once he dies.
  it('runs his four eye ribbons and lights his bones while alive', () => {
    expect(trails(361)).toEqual(['10 10cm x8 0.8,0.5,1', '9 10cm x8 0.8,0.5,1', '40 10cm x8 0.8,0.5,1', '39 10cm x8 0.8,0.5,1']);
    expect(rows(361, 'trail').every(t => t.gate?.alive)).toBe(true);
    expect(cards(361)).toEqual([
      ...[61, 62, 54, 55, 21, 22].flatMap(b => [`${b}:light@0.3 1,1,1`, `${b}:flareBlue@0.5 1,1,1`]),
      ...[25, 26, 71, 70, 43, 44].flatMap(b => [`${b}:light@0.4 1,1,1`, `${b}:flareBlue@0.7 1,1,1`]),
      ...[39, 40].flatMap(b => [`${b}:light@0.3 1,1,1`, `${b}:flareBlue@0.6 1,1,1`]),
      '9:flareBlue@0.3 1,1,1',
      '10:flareBlue@0.3 1,1,1',
    ]);
    const [spots] = rows(361, 'cards').map(r => r.spots);
    expect(spots.filter(s => s.local).map(s => `${s.bone} ${s.local?.join(',')}`)).toEqual([
      '21 5,0,0', '21 5,0,0', '22 9,0,0', '22 9,0,0', '25 6,0,0', '25 6,0,0', '43 10,0,0', '43 10,0,0',
      '39 3,0,0', '39 3,0,0', '40 3,0,0', '40 3,0,0', '9 0,-2,0', '10 4,-4,0',
    ]);
    expect(rows(361, 'cards')[0].gate?.alive).toBe(true);
  });
});
