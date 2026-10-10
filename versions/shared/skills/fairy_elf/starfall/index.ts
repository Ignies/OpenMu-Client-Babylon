import { defineSkill } from '@/controllers/skills/define';
import { MODEL, RGBS } from '@/controllers/fx/recipes';
import { afterRelease, arrow, model, seq, steelHit, ticks } from '@/controllers/skills/visuals';
import { landingSound } from '../../_shared';

import { ARROW_SECONDS } from '@/controllers/lighting/skills';
import { holy } from '@/controllers/lighting/recipes';

export default defineSkill({
  id: 46,
  name: "Starfall",
  checksArrows: true, // CheckArrow() before the shot (SkillCast.cpp:588)
  // AT_SKILL_DEEPIMPACT shoots through SetPlayerHighBowAttack, which advances SwordCount (ZzzInterface.cpp:2523-2527,
  // ZzzCharacter.cpp:1316).
  swing: 'highBow',
  swordCount: true,
  // 46 Deep Impact (Starfall): the arrow at the release (ZzzCharacter.cpp:4906-4909), then MODEL_ARROW_IMPACT at its position.
  visual: { cast: afterRelease(landingSound), travel: { ...arrow(MODEL.arrowLaser, RGBS.holy), release: true }, impact: seq(model({ model: MODEL.arrowImpact, seconds: ticks(20), scale: 1, colour: RGBS.holy, grow: 1.4 }), steelHit) },
  // SOUND_BCS_DEEP_IMPACT with the arrow, at the release (ZzzCharacter.cpp:4906-4909). The original loads it only in
  // Battle Castle (MapManager.cpp:251-279); it plays on every map here, as Lance's does.
  sound: 'Sound/battlecastle/sCFireArrow', // Deep Impact
  soundOnLanding: true,
  // Starfall: MODEL_ARROW_IMPACT lights nothing in the original (:14596);
  // the holy wash riding the shot down is ours.
  light: { arrow: { ...holy(2, ARROW_SECONDS), release: 0.2 } },
});
