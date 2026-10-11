import { defineMonsterCast } from '@/controllers/anim';

// ReceiveMagic on a monster caster: SetPlayerMagic, then AnimationFrame = 0.
export default defineMonsterCast({ skill: 413, name: 'AT_SKILL_HEALING_STR', clip: 'magic' });
