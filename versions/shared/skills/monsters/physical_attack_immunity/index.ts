import { defineSkill } from '@/controllers/skills/define';
import { RGBS, TEX } from '@/controllers/fx/recipes';
import { flash } from '@/controllers/skills/visuals';

export default defineSkill({
  id: 202,
  name: "Physical Attack Immunity",
  // ReceiveMagicFinish drops eBuff_WizDefense (WSclient.cpp:3959-3962); its SetActionDestroy_Def is not ported.
  effect: 4,
  visual: { impact: flash(TEX.shiny, RGBS.gold, 1.2, 0.5) },
});
