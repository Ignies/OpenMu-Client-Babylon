import { defineMonsterCast } from '@/controllers/anim';

// ReceiveMagic on a monster caster: SetPlayerAttack, without the rewind. Its case starts no AttackTime.
export default defineMonsterCast({ skill: 200, name: 'AT_SKILL_MONSTER_SUMMON', clip: 'attackHeld', attackTime: false });
