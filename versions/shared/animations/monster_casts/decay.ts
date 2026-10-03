import { defineMonsterCast } from '@/controllers/anim';

// ReceiveMagic on a monster caster: no clip; the one in hand plays on. Its case starts no AttackTime.
export default defineMonsterCast({ skill: 38, name: 'AT_SKILL_DECAY', attackTime: false });
