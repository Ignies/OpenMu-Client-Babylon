import { describe, expect, it } from 'vitest';
import { PlayerAction as A, ServerPlayerActionType } from '@versions/shared/objects/enum';
import { AnimationRegistry, animations, defineAnimation } from './animation';
import { playerActionEnumSource, replacePlayerActionEnum, PLAYER_ACTION_ENUM_MARK } from './playerActionEnum';
import { playerFrameSpeedScale, playerPlaySpeed } from './playSpeed';

const fist = defineAnimation({ action: 1, name: 'PLAYER_B', aliases: ['PLAYER_A_END'], speed: 0.3, serverActions: [ServerPlayerActionType.Attack1] });
const set = defineAnimation({ action: 0, name: 'PLAYER_A', speed: { base: 0.2, plus: 'attackSpeed' } });

describe('AnimationRegistry', () => {
  it('finds a clip by id, name or alias and maps its server actions', () => {
    const r = new AnimationRegistry();
    r.add([fist, set]);
    expect(r.get(1)).toBe(fist);
    expect(r.named('PLAYER_A_END')).toBe(fist);
    expect(r.all().map(d => d.action)).toEqual([0, 1]);
    expect(r.serverToClient[ServerPlayerActionType.Attack1]).toBe(1);
  });
});

describe('playerActionEnumSource', () => {
  const block = playerActionEnumSource([fist, set]);

  it('writes every id once, an alias first and the name referring to it, MAX_PLAYER_ACTION one past the last', () => {
    expect(block).toBe(
      `${PLAYER_ACTION_ENUM_MARK}\nexport enum PlayerAction {\n  PLAYER_A = 0,\n  PLAYER_A_END = 1,\n  PLAYER_B = PLAYER_A_END,\n  MAX_PLAYER_ACTION = 2,\n}\n`
    );
  });

  it('replaces only the marked block', () => {
    const text = `const a = 1;\n${PLAYER_ACTION_ENUM_MARK}\nexport enum PlayerAction {\n  OLD = 0,\n}\nconst b = 2;\n`;
    expect(replacePlayerActionEnum(text, block)).toBe(`const a = 1;\n${block}const b = 2;\n`);
  });

  it('keeps a CRLF file CRLF', () => {
    const text = `const a = 1;\r\n${PLAYER_ACTION_ENUM_MARK}\r\nexport enum PlayerAction {\r\n  OLD = 0,\r\n}\r\nconst b = 2;\r\n`;
    expect(replacePlayerActionEnum(text, block)).toBe(`const a = 1;\r\n${block.replace(/\n/g, '\r\n')}const b = 2;\r\n`);
  });
});

describe('player clip lookups', () => {
  it('read each rule kind', () => {
    expect(animations.get(A.PLAYER_ATTACK_FIST)!.speed).toEqual({ base: 0.6, plus: 'attackSpeed' });
    expect(playerPlaySpeed(A.PLAYER_ATTACK_FIST, 100)).toBeCloseTo(0.6 + 0.4);
    expect(playerPlaySpeed(A.PLAYER_SKILL_HELL_BEGIN, 0, 100)).toBeCloseTo((0.5 + 0.2) / 2);
    expect(playerPlaySpeed(A.PLAYER_WALK_MALE, 0, 0, false)).toBe(0.33);
    expect(playerPlaySpeed(A.PLAYER_WALK_MALE, 0, 0, true)).toBe(0.32);
    expect(playerPlaySpeed(A.PLAYER_SIT1)).toBe(0.4);
  });

  it('fall back to the base table for an id no file names', () => {
    const [below, above]: number[] = [-1, 100000];
    expect(playerPlaySpeed(below)).toBe(0.28);
    expect(playerPlaySpeed(above)).toBe(0.4);
    expect(playerFrameSpeedScale(below, 4, true)).toBe(1);
  });
});
