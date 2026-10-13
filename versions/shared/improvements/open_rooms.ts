import { defineImprovement } from '@/controllers/fidelity';

/**
 * Inside a room (the Lorencia pub, the other interiors) the town stays drawn around it, not black.
 * Classic and Enhanced: the room mask blacks everything outside the room. Read in
 * `src/controllers/render/scenes/roomMask.ts` (`syncRoomMask`).
 */
export default defineImprovement({
  id: 'openRooms',
  preset: 'ultra',
  labelKey: 'fidelity.openRooms',
  hintKey: 'fidelity.openRooms.hint',
});
