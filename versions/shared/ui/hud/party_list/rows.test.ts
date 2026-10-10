import { describe, expect, it } from 'vitest';
import { nameColor, rowLooks, type SeenPlayer } from './rows';

const seen = (name: string, extra: Partial<SeenPlayer> = {}): SeenPlayer => ({
  name,
  visible: true,
  dead: false,
  defense: false,
  ...extra,
});

// CPartyManager::SearchPartyMember (PartyManager.cpp:41-88): a member drawn on screen is found,
// the hero is himself (-3), everyone else is out of sight (-1).
describe('rowLooks', () => {
  const members = [{ name: 'Leader' }, { name: 'Hero' }, { name: 'Far' }, { name: 'Hidden' }];

  it('finds the members on screen and marks the rest out of sight', () => {
    const looks = rowLooks(members, 'Hero', [
      seen('Leader', { defense: true }),
      seen('Hidden', { visible: false }),
    ]);
    expect(looks.map(l => l.sight)).toEqual(['near', 'hero', 'far', 'far']);
    expect(looks[0].defense).toBe(true);
  });

  it('does not find a dead member', () => {
    expect(rowLooks([{ name: 'Leader' }], 'Hero', [seen('Leader', { dead: true })])[0].sight).toBe('far');
  });
});

// CNewUIPartyListWindow::Render (NewUIPartyListWindow.cpp:247-271).
describe('nameColor', () => {
  it('draws the leader orange, dim when out of sight', () => {
    expect(nameColor(0, 'near')).toBe('rgb(255, 148, 22)');
    expect(nameColor(0, 'far')).toBe('rgb(128, 75, 11)');
  });

  it('draws the others white, grey when out of sight', () => {
    expect(nameColor(2, 'hero')).toBe('rgb(255, 255, 255)');
    expect(nameColor(2, 'far')).toBe('rgb(128, 128, 128)');
  });
});
