import { existsSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { NPC_MODEL_TABLE, npcModelFile } from './npcModelTable';

/**
 * A row naming a file that is not there does not fail loudly: the load rejects
 * and the entity keeps a placeholder, which looks the same as the missing
 * models this table exists to fix. So the table is checked against the folder.
 */
const ASSETS = join(import.meta.dirname, '..', '..', '..', 'public', 'game-assets');

describe('NPC_MODEL_TABLE', () => {
  const rows = Object.entries(NPC_MODEL_TABLE);

  it('has rows', () => {
    expect(rows.length).toBeGreaterThan(50);
  });

  it('names a file that exists for every npc', () => {
    const missing = rows
      .filter(([, [file]]) => !existsSync(join(ASSETS, npcModelFile(file))))
      .map(([type, [file]]) => `${type} -> ${file}`);

    expect(missing).toEqual([]);
  });

  it('scales every npc to something visible', () => {
    for (const [type, [, scale]] of rows) {
      expect(scale, `npc ${type}`).toBeGreaterThan(0);
      expect(scale, `npc ${type}`).toBeLessThan(10);
    }
  });

  describe('the ones the server spawns that used to fall back to a Bull Fighter', () => {
    it('draws the Santa Village snowman and its eight little santas', () => {
      for (const type of [467, 468, 469, 470, 471, 472, 473, 474, 475]) {
        expect(NPC_MODEL_TABLE[type], `npc ${type}`).toBeDefined();
      }
    });

    it('draws the Kanturu Relics canon trap', () => {
      expect(NPC_MODEL_TABLE[105]).toEqual(['c_mon', 1.0]);
    });
  });
});
