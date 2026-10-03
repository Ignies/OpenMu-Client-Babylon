import { defineMonsterCast } from '@/controllers/anim';

// ReceiveMagic on a monster caster: SetPlayerAttack, then AnimationFrame = 0.
export default defineMonsterCast({ skill: 5, name: 'AT_SKILL_FLAME', clip: 'attack' });
