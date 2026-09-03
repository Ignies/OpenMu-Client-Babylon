import type { ISystemFactory } from '../world';
import { updateMuHelperLoop } from '../../muHelper/loop';

/**
 * MU Helper automation (`CMuHelper::WorkLoop`): steps the helper loop, which
 * writes only the seams the player's input uses (castRequest, pickupTarget,
 * playerMoveTo, store commands). Registered right before AttackSystem so its
 * writes are consumed the same frame. Inactive helper = a boolean check.
 */
export const MuHelperSystem: ISystemFactory = world => ({
  update: dt => updateMuHelperLoop(world, dt),
});
