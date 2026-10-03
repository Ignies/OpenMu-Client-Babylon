import { defineMonsterCast } from '@/controllers/anim';

// ReceiveMagic on a monster caster: no clip; the one in hand plays on. Its case starts no AttackTime.
export default defineMonsterCast({ skill: 237, name: 'AT_SKILL_GIGANTIC_STORM', attackTime: false });
