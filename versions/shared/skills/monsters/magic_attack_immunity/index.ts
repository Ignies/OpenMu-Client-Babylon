import { defineSkill } from '@/controllers/skills/define';
import { RGBS, TEX } from '@/controllers/fx/recipes';
import { flash } from '@/controllers/skills/visuals';
import { destroyDefense } from '../_shared';

export default defineSkill({
  id: 201,
  name: "Magic Attack Immunity",
  // ReceiveMagicFinish runs SetActionDestroy_Def, then drops eBuff_Defense (WSclient.cpp:3955-3958).
  effect: 2,
  cancel: destroyDefense,
  // 201-204 potions / immunities: a soft shiny flash.
  visual: { impact: flash(TEX.shiny, RGBS.soul, 1.2, 0.5) },
});
