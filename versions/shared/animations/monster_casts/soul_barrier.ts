import { defineMonsterCast } from '@/controllers/anim';

// ReceiveMagic on a monster caster: SetPlayerMagic, then AnimationFrame = 0.
export default defineMonsterCast({ skill: 16, name: 'AT_SKILL_SOUL_BARRIER', clip: 'magic' });
