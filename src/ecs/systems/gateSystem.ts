import type { ISystemFactory } from '../world';
import { Store } from '../../store';
import { findEntranceGateAt, loadGates, type Gate } from '../../libs/mu/gates';
import { EventBus } from '../../libs/eventBus';
import { prefetchWorldTerrain } from '../../libs/mu/prefetchWorld';

export const GateSystem: ISystemFactory = world => {
  let allGates: readonly Gate[] | null = null;
  let gatesOnMap: Gate[] = [];
  let indexedMap: number | null = null;

  let requestedGate: number | null = null;

  loadGates().then(
    gates => {
      allGates = gates;
      indexedMap = null;
    },
    err => console.error('Could not load the gate table:', err)
  );

  EventBus.on('warpCompleted', () => {
    requestedGate = null;
  });

  return {
    update: () => {
      if (!allGates) return;
      if (Store.isOffline) return;
      // A warp is in flight: the hero's position is the old map's until the
      // new terrain is up, and a second EnterGate on top of it double-warps.
      if (Store.sceneLoading) return;

      const playerEntity = world.playerEntity;
      if (!playerEntity) return;

      const map = playerEntity.worldIndex;
      if (map === undefined) return;

      if (indexedMap !== map) {
        gatesOnMap = allGates.filter(gate => gate.map === map);
        indexedMap = map;
        requestedGate = null;
      }

      if (gatesOnMap.length === 0) return;

      // The gate rectangle is in whole tiles and the hero is on tile
      // `trunc(pos)`: `round` fired half a tile before the hero was on it.
      const pos = playerEntity.transform.pos;
      const x = Math.trunc(pos.x);
      const y = Math.trunc(pos.z);

      const gate = findEntranceGateAt(gatesOnMap, map, x, y);

      if (!gate) {
        requestedGate = null;
        return;
      }

      if (requestedGate === gate.index) return;

      requestedGate = gate.index;

      // The exit gate names the destination map: start its terrain download
      // now, so the `MapChanged` answer finds the files already in flight.
      const exit = allGates[gate.target];
      if (exit && exit.map !== map) prefetchWorldTerrain(exit.map);

      Store.enterGateRequest(gate.index);
    },
  };
};
