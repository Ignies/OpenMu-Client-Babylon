import { defineSkill } from '@/controllers/skills/define';
import { RGBS, TEX } from '@/controllers/fx/recipes';
import { flash } from '@/controllers/skills/visuals';

export default defineSkill({
  id: 201,
  name: "Magic Attack Immunity",
  // ReceiveMagicFinish drops eBuff_Defense (WSclient.cpp:3955-3958); its SetActionDestroy_Def is not ported.
  effect: 2,
  // 201-204 potions / immunities: a soft shiny flash.
  visual: { impact: flash(TEX.shiny, RGBS.soul, 1.2, 0.5) },
});
