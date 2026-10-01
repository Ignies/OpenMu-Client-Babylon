import { defineBuffLooks } from '@/controllers/skills/define';
import { type SpearJoints } from '@/controllers/fx/aura';
import { TEX } from '@/controllers/fx/recipes';

/** A seal's three sub10 joints: radius 60, `z = 50 + 60 v.z`, width 12, Light (1, 0.6, 0.6), the bujuckline sheet (:1559, :4480). */
const SEAL_KNOT: SpearJoints = { count: 3, width: 0.12, colour: [1, 0.6, 0.6], texture: TEX.luckySeal, radius: 0.6, base: 0.5, lift: 0.6 };

export default defineBuffLooks({
  // 29-31 the seals: three pink ribbons low round the legs.
  29: () => ({ spearJoints: SEAL_KNOT }),
  30: () => ({ spearJoints: SEAL_KNOT }),
  31: () => ({ spearJoints: SEAL_KNOT }),
  // 0x39 Freeze (eDeBuff_Harden): the ice shell.
  57: () => ({ iceShell: true }),
});
