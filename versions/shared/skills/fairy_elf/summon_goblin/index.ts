import { defineSkill } from '@/controllers/skills/define';
import { SUMMON_GRADED, elfSummon } from '../_shared';

export default defineSkill({
  id: 30,
  name: "Summon Goblin",
  // The old skill -> effect table's row, labelled Greater Fortitude (8); kept as found, the number looks wrong.
  effect: 8,
  // 30-36 Summons (Goblin, Stone Golem, Assassin, Elite Yeti, Dark Knight, Bali, Soldier): 14 ticks after the
  // 0x19, BITMAP_MAGIC+1 sub3 at the caster's feet and its CreateHealing streaks. The summon's own arrival
  // plays from the 0x1F create flag (playSummonArrival).
  // Enhanced: the same, the streaks drawn as glowing comets, a warm pool, embers, and their light.
  visual: { area: elfSummon, impact: elfSummon, enhanced: SUMMON_GRADED },
  // Elf summons: SOUND_SKILL_DEFENSE on every client's 0x19 (WSclient.cpp:4244-4262).
  sound: 'Sound/sKnightDefense', // Summon Goblin
  target: 'self',
});
