import { defineSkill } from '@/controllers/skills/define';
import { RGBS, TEX } from '@/controllers/fx/recipes';
import { flash } from '@/controllers/skills/visuals';
import { destroyDefense } from '../_shared';

export default defineSkill({
  id: 202,
  name: "Physical Attack Immunity",
  // ReceiveMagicFinish runs SetActionDestroy_Def, then drops eBuff_WizDefense (WSclient.cpp:3959-3962).
  effect: 4,
  cancel: destroyDefense,
  visual: { impact: flash(TEX.shiny, RGBS.gold, 1.2, 0.5) },
});
