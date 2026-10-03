import { defineSkill } from '@/controllers/skills/define';
import { magicGround } from '@/controllers/skills/visuals';

import { holy } from '@/controllers/lighting/recipes';

/** The weapon link bones (weaponAttachment.ts) and the two above each: `LinkBone`, `LinkBone - 6`, `LinkBone - 7` (ZzzCharacter.cpp:10777). */
const HAND_SHINY_BONES = [33, 27, 26, 42, 36, 35] as const;

export default defineSkill({
  id: 28,
  name: "Greater Damage",
  effect: 1, // MagicEffectCancelled names skill 28: the buff it drops
  // 28 Greater Damage: BITMAP_MAGIC+1 sub3 LT 20.
  visual: { impact: magicGround([1, 0.75, 0.55]) },
  buffs: {
    // 1 Greater Damage, 3 Elf Soldier: BITMAP_SHINY+1 on the hands and forearms, `L * (1, 0.3, 0.2)`, plus the shared knot.
    1: () => ({ handShiny: { bones: HAND_SHINY_BONES, colour: [1, 0.3, 0.2] } }),
    3: () => ({ handShiny: { bones: HAND_SHINY_BONES, colour: [1, 0.3, 0.2] } }),
  },
  light: { impact: { ...holy(3, 1.0), color: [1, 0.75, 0.55] } },
  target: 'allyOrSelf',
});
