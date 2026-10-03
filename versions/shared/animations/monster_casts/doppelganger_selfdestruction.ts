import { defineMonsterCast } from '@/controllers/anim';

// ReceiveMagic on a monster caster: the Appear clip. Its case starts no AttackTime.
export default defineMonsterCast({ skill: 239, name: 'AT_SKILL_DOPPELGANGER_SELFDESTRUCTION', clip: 'appear', attackTime: false });
