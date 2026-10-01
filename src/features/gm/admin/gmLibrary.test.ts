import { describe, expect, it } from 'vitest';
import { expandLine, readList, sameFavourite, spread, type Favourite } from './gmLibrary';

const vars = { x: 130, y: 125, map: 0, me: 'Admin', target: 'Rookie' };

describe('expandLine', () => {
  it('fills every placeholder, as often as it appears', () => {
    expect(expandLine('/move {me} {map} {x} {y}', vars)).toBe('/move Admin 0 130 125');
    expect(expandLine('/fireworks {x} {y} /xmasfireworks {x} {y}', vars)).toBe(
      '/fireworks 130 125 /xmasfireworks 130 125'
    );
    expect(expandLine('/charinfo {target}', vars)).toBe('/charinfo Rookie');
  });

  it('leaves a line without placeholders as it is', () => {
    expect(expandLine('/startbc', vars)).toBe('/startbc');
  });
});

describe('spread', () => {
  it('starts on the spot and never repeats a tile', () => {
    const tiles = spread(30);
    expect(tiles[0]).toEqual([0, 0]);
    expect(tiles).toHaveLength(30);
    expect(new Set(tiles.map(t => t.join(','))).size).toBe(30);
  });

  it('fills the nearest ring before the next one', () => {
    const ring = (t: [number, number]) => Math.max(Math.abs(t[0]), Math.abs(t[1]));
    expect(spread(9).slice(1).every(t => ring(t) === 1)).toBe(true);
    expect(ring(spread(10)[9])).toBe(2);
  });
});

describe('readList', () => {
  const isLine = (v: unknown): v is string => typeof v === 'string';

  it('reads a list that holds up', () => {
    expect(readList('["/hide","/unhide"]', isLine)).toEqual(['/hide', '/unhide']);
  });

  it('drops a list with anything it cannot use, or that is not JSON', () => {
    expect(readList('["/hide",{"name":"x"}]', isLine)).toEqual([]);
    expect(readList('{"not":"a list"}', isLine)).toEqual([]);
    expect(readList('not json', isLine)).toEqual([]);
    expect(readList(null, isLine)).toEqual([]);
  });
});

describe('sameFavourite', () => {
  it('compares lines by text and macros by id', () => {
    const line: Favourite = { kind: 'line', line: '/hide' };
    const macro: Favourite = { kind: 'macro', id: 'a' };
    expect(sameFavourite(line, { kind: 'line', line: '/hide' })).toBe(true);
    expect(sameFavourite(line, { kind: 'line', line: '/unhide' })).toBe(false);
    expect(sameFavourite(macro, { kind: 'macro', id: 'a' })).toBe(true);
    expect(sameFavourite(line, macro)).toBe(false);
  });
});
