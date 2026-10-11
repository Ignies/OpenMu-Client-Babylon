import { defineMonsterCast } from '@/controllers/anim';

// ReceiveMagic on a monster caster: SetPlayerAttack, then AnimationFrame = 0.
export default defineMonsterCast({ skill: 378, name: 'AT_SKILL_FLAME_STR', clip: 'attack' });
