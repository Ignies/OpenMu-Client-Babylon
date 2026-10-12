/// <reference types="vite/client" />
import { registerBuffLooks, registerLauncherArrows, registerMonsterSkills, registerSkills, type MonsterSkillDef, type SkillDef } from '@/controllers/skills';
import { LAUNCHER_ARROWS } from '../items/launcher_arrows';
import commonBuffLooks from './common/buff_looks';

// Every skill file under <class>/<skill>/, found at build time: adding a skill is
// adding its file. Helper files in a skill folder (no default export) are skipped.
const files = import.meta.glob<{ default?: SkillDef | MonsterSkillDef }>(['./*/*/*.ts', '!./**/*.test.ts'], { eager: true });

/** Every shared skill, one entry per file, ordered by id. A version picks from this list. */
const SHARED_SKILLS: readonly SkillDef[] = Object.values(files)
  .map(m => m.default)
  .filter((d): d is SkillDef => !!d && 'id' in d && typeof d.id === 'number')
  .sort((a, b) => a.id - b.id);

registerSkills(SHARED_SKILLS);
// A monster's 0x69 looks (`defineMonsterSkill`), by the monsters whose map hook draws them.
registerMonsterSkills(Object.values(files).flatMap(m => (m.default && 'looks' in m.default ? [m.default] : [])));
registerBuffLooks(commonBuffLooks);
registerLauncherArrows(LAUNCHER_ARROWS);
