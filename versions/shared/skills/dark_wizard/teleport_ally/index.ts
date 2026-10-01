import { defineSkill } from '@/controllers/skills/define';
import { teleportColumn, teleportEnhanced } from '../_shared';

export default defineSkill({
  id: 15,
  name: "Teleport Ally",
  // 15 Teleport Ally: CreateTeleportBegin(target) (cast) + CreateTeleportEnd(caster) (impact) - BITMAP_SPARK+1 at both.
  visual: { cast: teleportColumn, impact: teleportColumn, enhanced: { cast: teleportEnhanced('begin'), impact: teleportEnhanced('end') } },
  sound: 'Sound/eTelekinesis', // Teleport Ally
});
