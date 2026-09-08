import { describe, expect, it } from 'vitest';
import { GM_COMMANDS, buildCommandLine, type GmCommand } from './gmCommands';

const find = (name: string): GmCommand => {
  const command = GM_COMMANDS.find(c => c.command === name);
  if (!command) throw new Error(`no such command in the catalogue: ${name}`);
  return command;
};

const line = (name: string, values: Record<string, string>): string => {
  const built = buildCommandLine(find(name), values);
  if ('error' in built) throw new Error(built.error);
  return built.line;
};

const error = (name: string, values: Record<string, string>): string => {
  const built = buildCommandLine(find(name), values);
  if ('line' in built) throw new Error(`expected a refusal, got: ${built.line}`);
  return built.error;
};

describe('the catalogue', () => {
  it('names every command with a leading slash', () => {
    for (const command of GM_COMMANDS) {
      expect(command.command).toMatch(/^\/[a-z]+$/);
    }
  });

  it('has no duplicate commands', () => {
    const names = GM_COMMANDS.map(c => c.command);
    expect(new Set(names).size).toBe(names.length);
  });

  it('never puts a required parameter after an optional one', () => {
    // The server parses positionally, so a gap cannot be filled later: an
    // optional parameter followed by a required one could never be sent.
    for (const command of GM_COMMANDS) {
      const params = command.params ?? [];
      const firstOptional = params.findIndex(p => !p.required);
      if (firstOptional < 0) continue;
      expect(params.slice(firstOptional).every(p => !p.required)).toBe(true);
    }
  });

  it('only marks the last parameter as taking the rest of the line', () => {
    for (const command of GM_COMMANDS) {
      const params = command.params ?? [];
      params.slice(0, -1).forEach(param => expect(param.rest).toBeFalsy());
    }
  });
});

describe('buildCommandLine', () => {
  it('sends a command that takes no arguments on its own', () => {
    expect(line('/hide', {})).toBe('/hide');
  });

  it('puts positional arguments in the order the server declares them', () => {
    expect(line('/teleport', { x: '125', y: '125' })).toBe('/teleport 125 125');
    expect(line('/movemonster', { id: '3', x: '10', y: '20' })).toBe('/movemonster 3 10 20');
  });

  it('puts the value before the character on the setters', () => {
    // SetLevelChatCommandPlugIn.Arguments is { Level, CharacterName }, not the
    // other way round - typing them the natural way sets the wrong thing.
    expect(line('/setlevel', { level: '350', characterName: 'Ann' })).toBe('/setlevel 350 Ann');
    expect(line('/setmoney', { amount: '5000' })).toBe('/setmoney 5000');
    expect(line('/set', { statType: 'str', amount: '32000', characterName: 'Ann' })).toBe(
      '/set str 32000 Ann'
    );
  });

  it('leaves a blank optional argument off the end', () => {
    expect(line('/getlevel', {})).toBe('/getlevel');
    expect(line('/createmonster', { number: '10' })).toBe('/createmonster 10');
    expect(line('/createmonster', { number: '10', intelligence: '1' })).toBe(
      '/createmonster 10 1'
    );
  });

  it('stops at the first gap rather than shifting later arguments up', () => {
    // `/item 7 3 <blank> 5` would land the 5 in the level slot.
    expect(line('/item', { group: '7', number: '3', ex: '5' })).toBe('/item 7 3');
    expect(line('/item', { group: '7', number: '3', lvl: '13', ex: '63' })).toBe(
      '/item 7 3 13 63'
    );
  });

  it('refuses a missing required argument', () => {
    expect(error('/teleport', { x: '125' })).toBe('Y is required.');
    expect(error('/banacc', {})).toBe('Account is required.');
  });

  it('refuses a number that is not one', () => {
    expect(error('/teleport', { x: 'here', y: '125' })).toBe('X must be a whole number.');
  });

  it('refuses a value outside the accepted set', () => {
    expect(error('/get', { statType: 'luk' })).toBe('Stat must be one of str, agi, vit, ene, cmd.');
  });

  it('refuses a space in an argument that is not the message', () => {
    // The server splits on spaces, so "Two Words" would become two arguments.
    expect(error('/trace', { characterName: 'Two Words' })).toBe(
      'Character cannot contain spaces.'
    );
  });

  it('keeps the spaces in an argument that takes the rest of the line', () => {
    expect(line('/goldnotice', { message: 'server restart in 5 minutes' })).toBe(
      '/goldnotice server restart in 5 minutes'
    );
  });

  it('trims what was typed', () => {
    expect(line('/trace', { characterName: '  Ann  ' })).toBe('/trace Ann');
  });
});
