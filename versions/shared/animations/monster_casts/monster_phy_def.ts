import { defineMonsterCast } from '@/controllers/anim';

// ReceiveMagic on a monster caster: SetPlayerAttack, without the rewind.
export default defineMonsterCast({ skill: 202, name: 'AT_SKILL_MONSTER_PHY_DEF', clip: 'attackHeld' });
