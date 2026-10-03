import { defineMonsterCast } from '@/controllers/anim';

// ReceiveMagic on a monster caster: SetPlayerMagic, then AnimationFrame = 0.
export default defineMonsterCast({ skill: 420, name: 'AT_SKILL_ATTACK_STR', clip: 'magic' });
