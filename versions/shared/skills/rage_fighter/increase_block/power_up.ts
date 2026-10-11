import { defineSkill } from '@/controllers/skills/define';
import { partyBuffClip, partyBuffSound } from '../_shared';

export default defineSkill({
  id: 569,
  name: "Def SuccessRate IncPowUp",
  // AT_SKILL_DEF_UP_OURFORCES_STR casts as Increase Block: the coin toss for the clip and its sound (SkillCast.cpp:913-931).
  sound: 'Sound/Ragefighter/Rage_Buff_1', // default; at cast the sound follows the clip toss (clipSound)
  clip: partyBuffClip,
  clipSound: partyBuffSound,
  target: 'self',
});
