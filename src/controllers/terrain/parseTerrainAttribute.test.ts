import { describe, expect, it, vi } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { ENUM_WORLD } from '@/core/types';
import { parseTerrainAttribute } from './parseTerrainAttribute';

const LORENCIA = 'Data/World1/EncTerrain1.att';

describe.skipIf(!existsSync(LORENCIA))('parseTerrainAttribute', () => {
  const bytes = () => new Uint8Array(readFileSync(LORENCIA));

  it('reads Lorencia and its probe tile', async () => {
    const att = await parseTerrainAttribute(bytes(), ENUM_WORLD.WD_0LORENCIA);
    expect(att).toBeDefined();
  });

  // OpenTerrainAttribute's probe is a warning: an edited or unexpected file still loads.
  it('warns, but still loads, when the probe tile does not match', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(parseTerrainAttribute(bytes(), ENUM_WORLD.WD_4LOSTTOWER)).resolves.toBeDefined();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
