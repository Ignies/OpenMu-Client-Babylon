import { describe, expect, it, vi } from 'vitest';
import { runInAction } from 'mobx';
import { CharacterClassNumber } from '../../core/types';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

const BUX = [0xfc, 0xcf, 0xab];
const bux = (b: Uint8Array) => b.forEach((v, i) => (b[i] = v ^ BUX[i % 3]));

/** `count` BUX records of `size` bytes, `fill(view, index)` writing each plain record. */
function table(size: number, count: number, fill: (v: DataView, i: number) => void): Uint8Array {
  const out = new Uint8Array(size * count + 4);
  for (let i = 0; i < count; i++) {
    const rec = out.subarray(i * size, (i + 1) * size);
    fill(new DataView(rec.buffer, rec.byteOffset, size), i);
    bux(rec);
  }
  return out;
}

// One node: Twisting Slash Strengthener (330) in the Blade Master tree.
const tree = table(24, 1, v => {
  v.setUint16(0, 1, true);
  v.setUint16(2, 1, true);
  v.setUint8(5, 1);
  v.setUint8(6, 20);
  v.setInt32(16, 330, true);
});
// `Local/Skill.bmd`: the older 600 x 80 table, where 330 is a passive with brand 73 and icon 7.
const oldSkill = table(80, 600, (v, i) => {
  if (i !== 330) return;
  v.setUint8(55, 3);
  v.setUint8(56, 73);
  v.setUint16(68, 7, true);
});
// `Local/Eng/skill_eng.bmd`: SKILL_ATTRIBUTE_FILE_LEGACY, 650 x 88 (330: use 4, brand 41, icon 30).
const s6Skill = table(88, 650, (v, i) => {
  if (i !== 330) return;
  v.setUint8(55, 4);
  v.setUint32(56, 41, true);
  v.setUint16(72, 30, true);
});

vi.mock('@/controllers/assets/mu', async importOriginal => ({
  ...(await importOriginal<object>()),
  downloadDataFile: async (path: string) =>
    path === 'Local/MasterSkillTreeData.bmd' ? tree : path === 'Local/Skill.bmd' ? oldSkill : new Uint8Array(),
  downloadLocalDataFile: async (base: string) => (base === 'skill' ? s6Skill : new Uint8Array()),
}));

const { ensureMasterTreeData, masterTreeEntries, masterSkillIconCell, masterLearnBlock } = await import('./masterTree');
const { setMasterLevelUpPoints } = await import('./masterLevel');
const { HeroSkills } = await import('./state');
const { Hero } = await import('../hero');

describe('master tree skill table', () => {
  it('reads the Season 6 skill table the original loads (Skill_<lang>.bmd)', async () => {
    runInAction(() => (Hero.charClass = CharacterClassNumber.BladeMaster));
    setMasterLevelUpPoints(5);
    await ensureMasterTreeData();
    const [entry] = masterTreeEntries();
    expect(entry?.skill).toBe(330);
    // Magic_Icon 30: row 1, column 5 of the 25-wide sheet.
    expect(masterSkillIconCell(330)).toEqual({ x: 100, y: 28 });

    // CheckBeforeSkill: the first point needs the brand, Twisting Slash (41).
    HeroSkills.setSkillList([]);
    expect(entry && masterLearnBlock(entry)).toBe('requirements');
    HeroSkills.setSkillList([{ index: 0, number: 41, level: 0 }]);
    expect(entry && masterLearnBlock(entry)).toBeNull();
  });
});
