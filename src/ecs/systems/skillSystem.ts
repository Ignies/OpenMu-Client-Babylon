import type { ISystemFactory } from '../world';
import { skills } from '../../skills';

/**
 * The skill layer's per-frame call site : steps `skills`
 * — buff clocks, re-use delays — once a frame, before SkillCastSystem asks
 * `skills.canUse` and before the hotbar draws this frame's sweep.
 */
export const SkillSystem: ISystemFactory = world => ({
  update: dt => {
    skills.update(world.mapIndex, dt);
  },
});
