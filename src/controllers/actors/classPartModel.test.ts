import { describe, expect, it } from 'vitest';
import { CharacterClassNumber as C } from '../../core/types';
import { classPartModel } from './classPartModel';

const part = (group: number, num: number) => ({ group, num });

describe('the model a class wears for an armour piece (ZzzCharacter.cpp:9579-9617)', () => {
  it('dresses the Rage Fighter in the Monk models for Leather, Scale, Brass and Plate (MonkSystem.cpp:187-206)', () => {
    expect(classPartModel(part(7, 5), C.RageFighter)).toBe('HelmMonk01.glb');
    expect(classPartModel(part(8, 6), C.FistMaster)).toBe('ArmorMonk02.glb');
    expect(classPartModel(part(9, 8), C.RageFighter)).toBe('PantMonk03.glb');
    expect(classPartModel(part(11, 9), C.RageFighter)).toBe('BootMonk04.glb');
    // Gloves land on BootMonk too: group 10 and 11 share the last row.
    expect(classPartModel(part(10, 5), C.RageFighter)).toBe('BootMonk01.glb');
    expect(classPartModel(part(8, 7), C.RageFighter)).toBeNull();
    expect(classPartModel(part(8, 0), C.RageFighter)).toBeNull();
    expect(classPartModel(part(8, 5), C.BladeMaster)).toBeNull();
  });

  it('gives the Dark Lord a mask for the Bronze, Leather, Scale, Brass and Plate helms only', () => {
    expect(classPartModel(part(7, 0), C.DarkLord)).toBe('MaskHelmMale01.glb');
    expect(classPartModel(part(7, 5), C.LordEmperor)).toBe('MaskHelmMale06.glb');
    expect(classPartModel(part(7, 6), C.DarkLord)).toBe('MaskHelmMale07.glb');
    expect(classPartModel(part(7, 8), C.DarkLord)).toBe('MaskHelmMale09.glb');
    expect(classPartModel(part(7, 9), C.DarkLord)).toBe('MaskHelmMale10.glb');
    expect(classPartModel(part(7, 1), C.DarkLord)).toBeNull();
    expect(classPartModel(part(8, 5), C.DarkLord)).toBeNull();
    expect(classPartModel(part(7, 5), C.DarkKnight)).toBeNull();
  });

  it('gives the Summoner the ElfC models for the Vine and Silk pieces (MODEL_HELM2, ZzzOpenData.cpp:259-266)', () => {
    expect(classPartModel(part(7, 10), C.Summoner)).toBe('HelmElfC01.glb');
    expect(classPartModel(part(10, 11), C.DimensionMaster)).toBe('GloveElfC02.glb');
    expect(classPartModel(part(11, 10), C.BloodySummoner)).toBe('BootElfC01.glb');
    expect(classPartModel(part(8, 12), C.Summoner)).toBeNull();
    expect(classPartModel(part(8, 10), C.FairyElf)).toBeNull();
  });

  it('leaves weapons and every other class alone', () => {
    expect(classPartModel(part(0, 5), C.RageFighter)).toBeNull();
    expect(classPartModel(part(12, 5), C.RageFighter)).toBeNull();
    expect(classPartModel(part(7, 0), C.DarkWizard)).toBeNull();
  });

  it('names files the build ships', async () => {
    const { existsSync } = await import('node:fs');
    const names = [
      ...[5, 6, 8, 9].flatMap(n => [7, 8, 9, 11].map(g => classPartModel(part(g, n), C.RageFighter))),
      ...[0, 5, 6, 8, 9].map(n => classPartModel(part(7, n), C.DarkLord)),
      ...[10, 11].flatMap(n => [7, 8, 9, 10, 11].map(g => classPartModel(part(g, n), C.Summoner))),
    ];
    for (const name of names) expect(existsSync(`public/game-assets/Player/${name}`), String(name)).toBe(true);
  });
});
