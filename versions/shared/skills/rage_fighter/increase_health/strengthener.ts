import { defineSkill } from '@/controllers/skills/define';
import { partyBuffClip, partyBuffSound } from '../_shared';

export default defineSkill({
  id: 573,
  name: "Stamina Increase Strengthener",
  // AT_SKILL_HP_UP_OURFORCES_STR casts as Increase Health: the coin toss for the clip and its sound (SkillCast.cpp:913-931).
  sound: 'Sound/Ragefighter/Rage_Buff_2', // default; at cast the sound follows the clip toss (clipSound)
  clip: partyBuffClip,
  clipSound: partyBuffSound,
  target: 'self',
});
