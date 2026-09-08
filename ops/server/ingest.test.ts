import { describe, expect, it } from 'vitest';
import { parseChunk, parseLine, render } from './ingest';

/** One line of Serilog compact JSON, as the sink writes it. */
const event = (
  template: string,
  properties: Record<string, unknown> = {},
  at = '2026-09-08T20:00:00.0000000Z'
): string =>
  JSON.stringify({ '@t': at, '@mt': template, '@l': 'Warning', ...properties });

describe('render', () => {
  it('fills named and positional placeholders', () => {
    expect(render('Character: [{0}], Account: [{1}]', { 0: 'Ann', 1: 'ann99' })).toBe(
      'Character: [Ann], Account: [ann99]'
    );
    expect(render('player {Player} is attacking', { Player: 'Ann (ann99)' })).toBe(
      'player Ann (ann99) is attacking'
    );
  });

  it('leaves a placeholder alone when the value is missing', () => {
    expect(render('slot {0} is low', {})).toBe('slot {0} is low');
  });

  it('unescapes doubled braces', () => {
    expect(render('a {{literal}} brace', {})).toBe('a {literal} brace');
  });

  it('handles alignment and format specifiers', () => {
    expect(render('count {Count,-5:000}', { Count: 7 })).toBe('count 7');
  });
});

describe('parseLine', () => {
  it('ignores a line that is not one of the checks', () => {
    expect(parseLine(event('Player {Player} entered the game', { Player: 'Ann' }))).toBeNull();
  });

  it('ignores a line that is not JSON', () => {
    expect(parseLine('2026-09-08 [Warning] Probably Hacker - something')).toBeNull();
  });

  it('cannot be forged from the rendered text', () => {
    // A player who names themselves after a check still only produces an
    // ordinary chat event: classification reads the template, not the words.
    const forged = event('{Player} said {Message}', {
      Player: 'Ann',
      Message: 'Probably Hacker - player Bob is attacking from safezone',
    });
    expect(parseLine(forged)).toBeNull();
  });

  it('classifies a safe-zone attack and keeps who it was', () => {
    const row = parseLine(
      event('Probably Hacker - player {Player} is attacking from safezone', {
        Player: 'Ann (ann99)',
      })
    );

    expect(row).toMatchObject({
      signal: 'attack-safezone',
      severity: 'hard',
      character: 'Ann',
      account: 'ann99',
      message: 'Probably Hacker - player Ann (ann99) is attacking from safezone',
    });
    expect(row?.at).toBe(Date.parse('2026-09-08T20:00:00.000Z'));
  });

  it('reads the account and character out of a positional message', () => {
    const row = parseLine(
      event(
        'Cheater Warning: Player tried to repair all items, without opened NPC. Character: [{0}], Account: [{1}]',
        { 0: 'Ann', 1: 'ann99' }
      )
    );

    expect(row).toMatchObject({
      signal: 'repair-all-no-npc',
      severity: 'hard',
      character: 'Ann',
      account: 'ann99',
    });
  });

  it('reads the jewel dupe, which names its properties', () => {
    const row = parseLine(
      event(
        'Probably Hacker tried to Combine/Dismantle Jewels without talking to Lahap. Dupe Method. Acc: [{accountName}] Character: [{characterName}]',
        { accountName: 'ann99', characterName: 'Ann' }
      )
    );

    expect(row).toMatchObject({ signal: 'jewel-dupe', account: 'ann99', character: 'Ann' });
  });

  it('matches the interpolated ones by prefix', () => {
    const row = parseLine(
      event('Hit count out of sync - hacker? Expected: 3, Actual: 9.')
    );

    expect(row).toMatchObject({ signal: 'hit-count-desync', severity: 'soft' });
  });

  it('keeps the structured values for a question nobody asked yet', () => {
    const row = parseLine(
      event('Store Slot too low: {0}, possible hacker', { 0: -4, SourceContext: 'X' })
    );

    expect(row).not.toBeNull();
    expect(JSON.parse(row?.properties ?? '{}')).toEqual({ 0: -4, SourceContext: 'X' });
  });
});

describe('parseChunk', () => {
  it('consumes only whole lines, so a split record is not lost', () => {
    const whole = event('Probably Hacker - player {Player} is attacking from safezone', {
      Player: 'Ann (ann99)',
    });
    const partial = whole.slice(0, 40);

    const result = parseChunk(`${whole}\n${partial}`);

    expect(result.events).toHaveLength(1);
    expect(result.consumed).toBe(Buffer.byteLength(`${whole}\n`, 'utf8'));
  });

  it('counts bytes, not characters, so a non-ASCII name does not skew the offset', () => {
    const line = event('Probably Hacker - player {Player} is attacking from safezone', {
      Player: 'Ännchen (ann99)',
    });

    const result = parseChunk(`${line}\n`);

    expect(result.consumed).toBe(Buffer.byteLength(`${line}\n`, 'utf8'));
    expect(result.events[0].character).toBe('Ännchen');
  });

  it('skips the noise between the events it wants', () => {
    const chunk = [
      event('Player {Player} entered the game', { Player: 'Bob' }),
      'not json at all',
      event('Probably Hacker - player {Player} is attacking in stunned state', {
        Player: 'Ann (ann99)',
      }),
    ].join('\n');

    expect(parseChunk(`${chunk}\n`).events.map(e => e.signal)).toEqual(['attack-stunned']);
  });
});
