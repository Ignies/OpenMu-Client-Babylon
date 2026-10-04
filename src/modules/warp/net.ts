import { MuWindows } from '@/controllers/interface/windowManager';
import { ClientReadyAfterMapChangePacket } from '@versions/shared/packets/ClientToServerPackets';
import { ENUM_WORLD } from '@/core/types';
import { Economy } from '../economy/economy';
import { Entity, World } from '@/ecs/world';
import { EventBus } from '@/core/eventBus';
import { InventoryConstants } from '@/core/inventoryConstants';
import { MapChangedPacket } from '@versions/shared/packets/ServerToClientPackets';
import { NetStats } from '@/controllers/net/roundTrip';
import { Notices } from '../chat/notices';
import { QuickItemActions } from '../inventory/quickItemActions';
import { SlideHelp } from '@/controllers/interface/slideHelp';
import { Social } from '../social/social';
import { Store, UIState } from '@/app/store';
import { Ecs } from '@/ecs/current';
import { TELEPORT } from '../skills/skillCasting';
import { addNpcToScope, applyObjectEffect, convertDirectionToAngle } from '../_shared/net_helpers';
import { cancelTeleport, endTeleport } from '@/ecs/systems/teleportSystem';
import { devQuery } from '@/core/devSeams';
import { holdForWarpScope } from './warpScopeHold';
import { runInAction } from 'mobx';

import { teleportGate } from './teleportRules';

/** The hero onto a server square, his walk dropped. */
function placeHero(world: World, hero: Entity, pos: { x: number; y: number }): void {
  const playerPos = hero.transform!.pos;
  playerPos.x = pos.x;
  playerPos.z = pos.y;
  playerPos.y = world.getTerrainHeight(pos.x, pos.y);

  const pathfinding = hero.pathfinding!;
  pathfinding.path = null;
  pathfinding.from = { x: pos.x, y: pos.y };
  pathfinding.to = { x: pos.x, y: pos.y };
}

/**
 * Objects that entered scope while the map was still loading were placed
 * with the previous map's terrain height (or the -9999 stub of a fresh
 * world) because `loadMapIntoScene` swaps `getTerrainHeight` only after
 * the terrain download. Re-snap every net object of the map that just
 * finished loading, so a merchant sent during the load is not left
 * underground and out of sight.
 */
/** Set by a MapChanged / respawn that warps; cleared when the ready packet goes out. */
let awaitingClientReady = false;

/** The economy prompts the dev seam below can raise on their own. */
const PROMPT_DEMOS = [
  'vault-deposit',
  'vault-withdraw',
  'vault-unlock',
  'vault-set-pin',
  'vault-remove-pin',
  'trade-money',
] as const;

/** Registers this module's packet listeners (see ../module.ts). */
export function installNet(): void {
  EventBus.on('MapChanged', packet => {
    // Answers a warp the player asked for; a server-initiated one pairs with
    // nothing and is ignored (controllers/net/roundTrip.ts).
    NetStats.markAnswered('warp');

    const p = new MapChangedPacket(packet);
    const pos = { x: p.PositionX, y: p.PositionY };
    const verdict = teleportGate.onMapChanged(p.IsMapChange, pos.x, pos.y, performance.now() / 1000);
    const playerEntity = Ecs.world?.playerEntity;

    // The packet's byte 9 is the arrival facing (`gate.angle`, the exit gate's
    // `Rotation` column, 0-7 × 45°); the generated class has no accessor for it.
    const rotation = packet.byteLength > 9 ? packet.getUint8(9) : undefined;

    if (p.IsMapChange) {
      // HideAll on warp: the merchant stays behind.
      Store.closeNpcShop();
      // `ReceiveMapChange` (WSclient.cpp:622): the notice stack and the minimap
      // sheet do not survive a warp.
      Notices.clear();
      SlideHelp.clear();
      runInAction(() => {
        MuWindows.setOpen('minimap', false);
      });
      // The soccer scoreboard does not survive a warp off the stadium.
      if (p.MapNumber !== ENUM_WORLD.WD_6STADIUM) {
        runInAction(() => {
          Social.battleSoccer = null;
        });
      }
      if (playerEntity) {
        cancelTeleport(playerEntity);
        // The hero entity survives the warp, so the yaw can be set right away.
        if (rotation !== undefined) playerEntity.transform.rot.y = convertDirectionToAngle(rotation);
      }
      awaitingClientReady = true;
      EventBus.emit('requestWarp', { map: p.MapNumber, pos });
      return;
    }

    if (!playerEntity) return;

    const world = Ecs.world!;
    const playerPos = playerEntity.transform.pos;
    const onSquare = Math.floor(playerPos.x) === pos.x && Math.floor(playerPos.z) === pos.y;

    // The server's late answer to the hero's own teleport (OpenMU sends it 1.8 s
    // after the request): he already stands there, so nothing moves, turns or
    // stops. Only a hero knocked off the square since is put back on it.
    if (verdict === 'confirm') {
      if (!onSquare) placeHero(world, playerEntity, pos);
      return;
    }

    // Refused, or moved by someone else (Teleport Ally, a GM): Flag 0 of
    // `ReceiveTeleport` (WSclient.cpp:2193-2197, 2300-2304) - position, angle,
    // `CreateTeleportEnd` and the hero stops. No UI is closed: that is the
    // map-change branch only (2199-2295).
    placeHero(world, playerEntity, pos);
    if (rotation !== undefined) playerEntity.transform.rot.y = convertDirectionToAngle(rotation);
    world.attackTarget = null;
    world.castApproach = null;
    endTeleport(playerEntity, TELEPORT);
  });

  EventBus.on('warpCompleted', ({ map }) => {
    // OpenMU parks the character (`CurrentMap = null`, PlayerMapTransitions.cs)
    // after a MapChanged until the client says the map is up; without this no
    // NPC / monster ever enters scope after a warp. Sent once the terrain and
    // objects are in (`ClientReadyAfterMapChange`, C1 04 F3 12).
    // Only after a server-initiated MapChanged: on the first world entry OpenMU
    // already placed us and logs "Ignoring client-ready packet" otherwise.
    if (awaitingClientReady && !Store.isOffline && Store.uiState === UIState.World) {
      awaitingClientReady = false;
      Store.sendToGS(ClientReadyAfterMapChangePacket.createPacket().buffer);
      holdForWarpScope();
    }

    const world = Ecs.world;
    if (!world) return;

    for (const e of world.netObjsQuery.entities) {
      if (e.localPlayer) continue;
      if (e.worldIndex !== map) continue;
      const t = e.transform;
      if (!t) continue;
      t.pos.y = world.getTerrainHeight(t.pos.x, t.pos.z);
    }
  });

  /**
   * `?offline&npcs=232@222,27;233@216,27` (dev builds): NPCs stood in the
   * offline scene, which the server would otherwise be the only source of,
   * so an NPC class can be looked at without a live server. Type, tile x,
   * tile y, and an optional direction (0-7), `;`-separated.
   */
  EventBus.on('warpCompleted', () => {
    if (!Store.isOffline) return;

    const spec = devQuery('npcs');
    const world = Ecs.world;

    if (!spec || !world) return;

    let id = 0x7000;

    for (const item of spec.split(';')) {
      const m = /^(\d+)@(\d+(?:\.\d+)?),(\d+(?:\.\d+)?)(?:,(\d))?$/.exec(item.trim());

      if (!m) continue;

      const x = Number(m[2]);
      const y = Number(m[3]);

      addNpcToScope(world, {
        Id: id++,
        TypeNumber: Number(m[1]),
        CurrentPositionX: x,
        CurrentPositionY: y,
        TargetPositionX: x,
        TargetPositionY: y,
        Rotation: m[4] ? Number(m[4]) : 0,
      });
    }
  });

  /**
   * `?offline&buffs=2,4,8` (dev builds): MagicEffectStatus ids applied to the
   * test character once the map is up, so a buff's persistent look can be shot
   * without a server granting it.
   */
  EventBus.on('warpCompleted', () => {
    if (!Store.isOffline) return;

    const spec = devQuery('buffs');
    const hero = Ecs.world?.playerEntity;

    if (!spec || !hero) return;

    for (const raw of spec.split(',')) {
      const id = Number(raw.trim());
      if (!Number.isInteger(id) || id <= 0) continue;
      Store.setBuff(id, true);
      applyObjectEffect(hero, id, true);
    }
  });

  /**
   * `?offline&quickItems=sell|buy|<prompt kind>` (dev builds): the merchant open
   * on the test loadout with the sell confirmation or the buy quantity prompt
   * already up, or one of the vault / trade prompts on its own. There is no
   * server offline, so this is the only way to look at any of them without one.
   */
  EventBus.on('warpCompleted', () => {
    if (!Store.isOffline) return;

    const demo = devQuery('quickItems');
    if (!demo) return;

    const promptDemo = PROMPT_DEMOS.find(kind => kind === demo);
    if (promptDemo) {
      Economy.openPrompt({ kind: promptDemo });
      return;
    }

    Store.talkToNpc({ netId: 0, name: 'Merchant', npcType: 0 });

    if (demo === 'buy') {
      const slot = Store.npcShop?.items.findIndex(entry => !!entry) ?? -1;
      if (slot >= 0) QuickItemActions.promptBuy(slot);
      return;
    }

    QuickItemActions.fromInventory(InventoryConstants.LastEquippableItemSlotIndex + 1);
  });
}
