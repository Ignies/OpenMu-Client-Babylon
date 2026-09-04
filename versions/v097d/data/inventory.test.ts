import { readdirSync } from 'fs';
import { join, resolve } from 'path';
import { describe, expect, it } from 'vitest';
import { V097D_DATA_FILES } from './inventory';

/**
 * The inventory is what tells base code a file is absent instead of broken,
 * so it must be the tree and not somebody's memory of it. Regenerate with
 * the command in `inventory.ts` when `Data-v097d/` changes.
 */
const ROOT = resolve(__dirname, '../../../Data-v097d');

function walk(dir: string, prefix = ''): string[] {
  const out: string[] = [];

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;

    if (entry.isDirectory()) out.push(...walk(join(dir, entry.name), rel));
    else out.push(rel.toLowerCase());
  }

  return out;
}

describe('v097d data inventory', () => {
  it('lists exactly what Data-v097d contains', () => {
    expect([...V097D_DATA_FILES].sort()).toEqual(walk(ROOT).sort());
  });

  it('knows the period files the login screen draws', () => {
    for (const file of [
      'logo/0account.ozt',
      'logo/0text_box.ozj',
      'logo/0on_botton.ozj',
      'logo/0new_account01.ozt',
      'logo/0new_account02.ozt',
      'logo/mulogo_01.ozj',
    ]) {
      expect(V097D_DATA_FILES).toContain(file);
    }
  });

  it('does not claim the Season 6 sheets it never shipped', () => {
    for (const file of [
      'interface/login_back.ozt',
      'interface/newui_menu01.ozj',
      'effect/cursorpin01.ozj',
      'effect/empact01.ozj',
      'effect/firehik_mono03.ozj',
    ]) {
      expect(V097D_DATA_FILES).not.toContain(file);
    }
  });
});
