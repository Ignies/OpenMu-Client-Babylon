import { defineMonsterCast } from '@/controllers/anim';

// ReceiveMagic on a monster caster: SetPlayerAttack, then AnimationFrame = 0.
export default defineMonsterCast({ skill: 480, name: 'AT_SKILL_LIGHTNING_STR_MG', clip: 'attack' });
