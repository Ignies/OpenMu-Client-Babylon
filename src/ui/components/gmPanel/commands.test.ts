import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GM_COMMANDS, gmCommand } from '../../../common/gmCommands';
import { GM_MAPS } from '../../../common/gmMaps';

/**
 * The panel's screens name the commands they send as strings, and a name that
 * is not in the catalogue throws when the screen renders - which is to say, in
 * front of a game master, in the middle of a job.
 *
 * This reads the names back out of the source and resolves every one. It is
 * the check that catches a command being dropped from the catalogue while a
 * screen still calls for it, which is exactly how `/move` broke once: it was
 * removed for being gated at Normal rather than GameMaster, and the Travel
 * screen went on asking for it.
 */

const HERE = fileURLToPath(new URL('.', import.meta.url));

const sources = readdirSync(HERE)
  .filter(name => /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name))
  .map(name => readFileSync(join(HERE, name), 'utf8'));

const referenced = [
  ...new Set(
    sources.flatMap(source =>
      [...source.matchAll(/gmCommand\(\s*['"]([^'"]+)['"]\s*\)/g)].map(match => match[1])
    )
  ),
].sort();

describe('the commands the panel names', () => {
  it('finds some at all, or this test is checking nothing', () => {
    expect(referenced.length).toBeGreaterThan(20);
  });

  it('resolves every one against the catalogue', () => {
    const missing = referenced.filter(name => !GM_COMMANDS.some(c => c.command === name));
    expect(missing).toEqual([]);
  });

  it('resolves them through gmCommand without throwing', () => {
    for (const name of referenced) {
      expect(() => gmCommand(name)).not.toThrow();
    }
  });

  it('refuses a name that is not a command', () => {
    expect(() => gmCommand('/nonesuch')).toThrow(/unknown game master command/);
  });
});

describe('the parameters the panel supplies', () => {
  /**
   * A screen that supplies a value under the wrong name silently sends the
   * command without it - the server then reads its arguments positionally and
   * acts on something else. `/move`'s map goes in `mapIdOrName`, not `map`;
   * its character in `target`, not `characterName`.
   */
  const overrideKeys = sources.flatMap(source =>
    [...source.matchAll(/overrides=\{\{([^}]*)\}\}/g)].flatMap(match =>
      [...match[1].matchAll(/([A-Za-z_$][\w$]*)\s*:/g)].map(key => key[1])
    )
  );

  it('only names parameters some command actually declares', () => {
    const known = new Set(
      GM_COMMANDS.flatMap(command => (command.params ?? []).map(param => param.name))
    );
    const unknown = [...new Set(overrideKeys)].filter(key => !known.has(key));
    expect(unknown).toEqual([]);
  });
});

describe('the map picker', () => {
  it('has no duplicate map numbers', () => {
    const numbers = GM_MAPS.map(map => map.number);
    expect(new Set(numbers).size).toBe(numbers.length);
  });

  it('names every map', () => {
    for (const map of GM_MAPS) {
      expect(map.name.trim()).not.toBe('');
      expect(map.number).toBeGreaterThanOrEqual(0);
    }
  });
});
