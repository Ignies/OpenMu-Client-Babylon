import { defineMonsterCast } from '@/controllers/anim';

// ReceiveMagic on a monster caster: SetPlayerAttack, then AnimationFrame = 0.
export default defineMonsterCast({ skill: 55, name: 'AT_SKILL_FIRE_SLASH', clip: 'attack' });
