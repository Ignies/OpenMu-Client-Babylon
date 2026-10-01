import { defineSkill } from '@/controllers/skills/define';
import { RGBS } from '@/controllers/fx/recipes';
import { flashDrop } from '../_shared';

export default defineSkill({
  id: 68,
  name: "Cancel Stun",
  // 68 Removal Stun / 71 Removal Invisible: BITMAP_FLASH sub0/1 at target +1200 z, width 120, MaxTails 10, LT 40,
  // Vel 70, Angle (90,0,0) - a ribbon dropping from the sky.
  visual: { impact: flashDrop(RGBS.gold) },
});
