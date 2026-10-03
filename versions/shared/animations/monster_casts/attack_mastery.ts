import { defineMonsterCast } from '@/controllers/anim';

// ReceiveMagic on a monster caster: SetPlayerMagic, then AnimationFrame = 0.
export default defineMonsterCast({ skill: 422, name: 'AT_SKILL_ATTACK_MASTERY', clip: 'magic' });
