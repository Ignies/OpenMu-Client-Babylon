import { defineSkill } from '@/controllers/skills/define';
import { partyBuffClip, partyBuffSound } from '../_shared';

export default defineSkill({
  id: 572,
  name: "DefSuccessRate IncMastery",
  // AT_SKILL_DEF_UP_OURFORCES_MASTERY casts as Increase Block: the coin toss for the clip and its sound (SkillCast.cpp:913-931).
  sound: 'Sound/Ragefighter/Rage_Buff_1', // default; at cast the sound follows the clip toss (clipSound)
  clip: partyBuffClip,
  clipSound: partyBuffSound,
  target: 'self',
});
