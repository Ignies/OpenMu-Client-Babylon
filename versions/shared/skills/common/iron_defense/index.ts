import { defineSkill } from '@/controllers/skills/define';
import { IRON_DEFENSE } from '../../_shared';

export default defineSkill({
  id: 323,
  name: "Iron Defense",
  // 323/521/524 Iron Defense: the reference client predates it (no AT_SKILL, no effect, no sound), so Classic draws
  // nothing. The old stand-in flash waits under `enhanced` for the improve phase.
  visual: IRON_DEFENSE,
});
