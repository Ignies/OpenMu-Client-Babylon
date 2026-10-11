import { defineMonsterCast } from '@/controllers/anim';

// ReceiveMagic on a monster caster: SetPlayerMagic, then AnimationFrame = 0.
export default defineMonsterCast({ skill: 423, name: 'AT_SKILL_DEFENSE_MASTERY', clip: 'magic' });
