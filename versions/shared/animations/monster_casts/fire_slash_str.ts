import { defineMonsterCast } from '@/controllers/anim';

// ReceiveMagic on a monster caster: SetPlayerAttack, then AnimationFrame = 0.
export default defineMonsterCast({ skill: 490, name: 'AT_SKILL_FIRE_SLASH_STR', clip: 'attack' });
