import { GameOptions } from '@/controllers/settings';
import type { ISystemFactory } from '../world';
import { animationsHeld } from './othersShown';

/**
 * The crowd options that hold other players' and the NPCs' looping clips still
 * (`othersShown.ts`). A held model pauses the way an off-screen one does
 * (`ModelObject.setAnimationsHeld`). Nothing is walked while no option holds anything.
 */
export const AnimationHoldSystem: ISystemFactory = world => {
  const models = world.with('modelObject');
  let holding = false;

  return {
    update: () => {
      if (!holding && GameOptions.otherPlayerAnimations && GameOptions.npcAnimations) return;
      let any = false;
      for (const e of models) {
        const held = animationsHeld(e);
        any ||= held;
        // Only the held, and the ones being let go, are touched.
        if (held || e.modelObject.AnimationsHeld) e.modelObject.setAnimationsHeld(held);
      }
      holding = any;
    },
  };
};
