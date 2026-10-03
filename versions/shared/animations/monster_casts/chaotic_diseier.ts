import { defineMonsterCast } from '@/controllers/anim';

// ReceiveMagic on a monster caster: SetPlayerAttack, without the rewind. Its case starts no AttackTime.
export default defineMonsterCast({ skill: 238, name: 'AT_SKILL_CHAOTIC_DISEIER', clip: 'attackHeld', attackTime: false });
