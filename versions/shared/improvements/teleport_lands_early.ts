import { defineImprovement } from '@/controllers/fidelity';

/**
 * The hero's own Teleport lands him on the square as soon as he has faded out (or after 0.2 s),
 * without waiting for the server. Classic: he stays faded on the old square until ReceiveTeleport
 * places him and plays CreateTeleportEnd (WSclient.cpp:2157-2197). Read in
 * `src/ecs/systems/teleportSystem.ts` and `src/modules/warp/net.ts` (`MapChanged`).
 */
export default defineImprovement({
  id: 'teleportLandsEarly',
  preset: 'enhanced',
  labelKey: 'fidelity.teleportLandsEarly',
  hintKey: 'fidelity.teleportLandsEarly.hint',
});
