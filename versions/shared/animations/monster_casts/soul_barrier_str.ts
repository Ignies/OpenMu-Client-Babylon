import { defineMonsterCast } from '@/controllers/anim';

// ReceiveMagic on a monster caster: SetPlayerMagic, then AnimationFrame = 0.
export default defineMonsterCast({ skill: 403, name: 'AT_SKILL_SOUL_BARRIER_STR', clip: 'magic' });
