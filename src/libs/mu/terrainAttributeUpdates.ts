import { ChangeTerrainAttributesPacket } from '../../common/packets/ServerToClientPackets';
import { EventBus } from '../eventBus';
import { Store } from '../../store';

/**
 * `ReceiveSetAttribute` (WSclient.cpp:8320-8345): the server rewrites terrain
 * attributes at runtime — the Blood Castle pit opening, the Chaos Castle
 * strips closing, Crywolf's gates. OpenMU sends it as `ChangeTerrainAttributes`
 * (C1 46): one flag, set or clear, over a list of tile rectangles.
 *
 * The write goes through `world.setTerrainFlags` on whatever map is loaded;
 * a map module that wants to *react* (the Blood Castle gate) polls the flag it
 * cares about rather than listening here, so this file stays a one-line port
 * and no map has to unregister anything.
 *
 * Imported for its side effect by `loadMapIntoScene`.
 */
EventBus.on('ChangeTerrainAttributes', packet => {
  const world = Store.world;
  if (!world) return;

  const p = new ChangeTerrainAttributesPacket(packet);
  const set = !p.RemoveAttribute;

  for (const a of p.getAreas()) {
    world.setTerrainFlags(
      a.StartX,
      a.StartY,
      a.EndX - a.StartX + 1,
      a.EndY - a.StartY + 1,
      p.Attribute as number,
      set
    );
  }
});
