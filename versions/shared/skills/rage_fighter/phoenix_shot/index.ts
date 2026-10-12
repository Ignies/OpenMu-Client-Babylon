import { defineSkill } from '@/controllers/skills/define';
import { MODEL, RGBS } from '@/controllers/fx/recipes';
import { fanArrows, fireHit, model, seq, tiered, type Step } from '@/controllers/skills/visuals';

/** The original draws nothing: RageCreateEffect's MODEL_PHOENIX_SHOT case is never reached (MonkSystem.cpp:1335-1351). */
const drawNothing: Step = () => {};

export default defineSkill({
  id: 270,
  name: "Phoenix Shot",
  // Skill effects: Enhanced keeps ours, a phoenix arrow, a fire hit and the phoenix model.
  visual: {
    area: tiered(drawNothing, (at, c) => { fanArrows(at, c, 1, MODEL.phoenixShot, RGBS.fire, 0, 1.5); }),
    impact: tiered(drawNothing, seq(fireHit, model({ model: MODEL.phoenix, seconds: 0.8, colour: RGBS.fire, grow: 1.5, scale: 1.5 }))),
  },
});
