import { defineMonsterCast } from '@/controllers/anim';

// ReceiveMagic on a monster caster: SetPlayerAttack, without the rewind.
export default defineMonsterCast({ skill: 201, name: 'AT_SKILL_MONSTER_MAGIC_DEF', clip: 'attackHeld' });
