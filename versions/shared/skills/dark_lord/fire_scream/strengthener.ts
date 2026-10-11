import { defineSkill } from '@/controllers/skills/define';

import { A } from '@/controllers/combat/recipes';
import { MOUNTED_STRIKE } from '../_shared';

export default defineSkill({
  id: 518,
  name: "Fire Scream Stren",
  silentHeroCast: true,
  sound: 'Sound/Darklord_firescream', // Fire Scream Strengthener
  delayMs: 10000, // Fire Scream Strengthener
  clip: { ground: A.PLAYER_ATTACK_STRIKE, ...MOUNTED_STRIKE }, // Fire Scream Str
});
