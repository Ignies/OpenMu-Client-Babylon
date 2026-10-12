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
