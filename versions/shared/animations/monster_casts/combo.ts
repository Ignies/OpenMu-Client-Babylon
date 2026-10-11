import { defineMonsterCast } from '@/controllers/anim';

// ReceiveMagic on a monster caster: no clip; the one in hand plays on. Its case starts no AttackTime. c->Skill keeps the skill before it.
export default defineMonsterCast({ skill: 59, name: 'AT_SKILL_COMBO', attackTime: false, recordsSkill: false });
