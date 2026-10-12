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
