import { describe, expect, it } from 'vitest';
import {
  heroStateMessage,
  parseSelfDefense,
  pkTextColour,
  PK_MURDERER2_COLOUR,
} from './nameTags';

describe('heroStateMessage', () => {
  it('is silent for the New state', () => {
    expect(heroStateMessage('Ann', 0)).toBeNull();
  });

  it('announces hero states as system lines', () => {
    expect(heroStateMessage('Ann', 1)).toEqual({
      text: 'Ann : Hero',
      error: false,
    });
    expect(heroStateMessage('Ann', 2)).toEqual({
      text: 'Ann : Hero',
      error: false,
    });
    expect(heroStateMessage('Ann', 4)).toEqual({
      text: 'Ann : Outlaw Warning',
      error: false,
    });
  });

  it('announces the commoner and outlaw states as error lines', () => {
    expect(heroStateMessage('Ann', 3)).toEqual({
      text: 'Ann : Commoner',
      error: true,
    });
    expect(heroStateMessage('Ann', 5)).toEqual({
      text: 'Ann : 1st Stage Outlaw',
      error: true,
    });
    expect(heroStateMessage('Ann', 6)).toEqual({
      text: 'Ann : 2nd Stage Outlaw',
      error: true,
    });
  });
});

describe('parseSelfDefense', () => {
  it('parses the begin message', () => {
    expect(
      parseSelfDefense("Self defense is initiated by Bob's attack to Ann!")
    ).toEqual({ active: true, attacker: 'Bob', defender: 'Ann' });
  });

  it('parses the end message', () => {
    expect(
      parseSelfDefense('Self defense of Ann against Bob diminishes.')
    ).toEqual({ active: false, attacker: 'Bob', defender: 'Ann' });
  });

  it('ignores other blue messages', () => {
    expect(parseSelfDefense('Welcome to Lorencia')).toBeNull();
    expect(parseSelfDefense('')).toBeNull();
  });
});

describe('pkTextColour', () => {
  it('falls back to the murderer colour past the table', () => {
    expect(pkTextColour(6)).toBe(PK_MURDERER2_COLOUR);
    expect(pkTextColour(7)).toBe(PK_MURDERER2_COLOUR);
  });
});
