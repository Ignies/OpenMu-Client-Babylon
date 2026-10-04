// Every packet handler lives in its module's net.ts and is registered by installModules below,
// in the order of modules/modules.ts (listener order per packet is kept).
// What this file imported before its handlers moved out, in the same order: loading these
// first keeps every import-time registration (events...) ahead of the nets.
import '../modules/band/bandNet';
import '../controllers/net/pingNet';
import '../i18n';
import '@/core/types';
import '../controllers/actors/deserializeAppearance';
import '../modules/hero/characterStats';
import '../controllers/settings';
import '@versions/shared/items/itemsDatabase';
import '../controllers/item_rules';
import '../controllers/actors/itemAngle';
import '../modules/drops/dropObject';
import '../controllers/assets/itemIconPack';
import '../controllers/actors/mapPlayerNetClassToModelClass';
import '../controllers/actors/modelFactoryPerId';
import '@versions/shared/monsters/monstersDatabase';
import '../i18n/serverText';
import '../controllers/assets/mu/npcNameFile';
import '@versions/shared/objects/enum';
import '@versions/shared/packets/ConnectServerPackets';
import '@versions/shared/packets/ServerToClientPackets';
import '../controllers/net/packets.ts';
import '../modules/marketplace/gameBridge';
import '../controllers/fx/fireworks';
import '../core/inventoryConstants';
import '@versions/shared/packets/ClientToServerPackets';
import '../modules/social/social';
import '../modules/chat/commands';
import '../controllers/interface/nameTags';
import '../modules/warp/warpScopeHold';
import '../modules/events';
import '../modules/economy/economy';
import '../modules/gm/gmPanel';
import '../modules/friends/messenger';
import '../modules/chat/chatRooms';
import '../modules/friends/friendList';
import '../modules/inventory/itemStorage';
import '../controllers/net/roundTrip';
import '../modules/chat/notices';
import '../controllers/interface/slideHelp';
import '../modules/chat/chat';
import '../modules/chat/emojiBubbles';
import '../ecs/systems/emojiBubbleSystem';
import '../modules/chat/chatEmojis';
import '../modules/chat/emojis';
import '../controllers/net/protocols/chatWire';
import '../controllers/anim/playerActionMapper';
import '../controllers/actors/weaponClass';
import '../controllers/actors/wings';
import '../controllers/actors/playerObject';
import '../ecs/world';
import '../core/attributeSystem';
import '../controllers/actors/characterScale';
import '@versions/shared/skills/skillsDatabase';
import '../modules/hero/heroMoveTrace';
import '../modules/skills/skillCasting';
import '../controllers/combat/skillClips';
import '../modules/warp/teleportRules';
import '../ecs/systems/teleportSystem';
import '../modules/skills/magicEffects';
import '@versions/shared/skills/skillVisuals';
import '../controllers/anim/playSpeed';
import '../controllers/anim/monsterAttackClip';
import '../controllers/sound/packetSounds';
import '../controllers/sound/soundsManager';
import '../controllers/fx/core';
import '../controllers/render/babylon/exports';
import '../core/eventBus';
import '../controllers/sound';
import '../controllers/sound/sfx';
import '../controllers/sound/combatSounds';
import '../modules/hero/experience';
import '../modules/session/sessionResume';
import '../controllers/weather/rainState';
import '../controllers/combat';
import '@versions/shared/skills/dark_knight/combo/state';
import '../controllers/combat/recipes';
import '../controllers/pets';
import '../controllers/actors/locomotion';
import '../controllers/actors/transformedBody';
import '../modules/session/sessionExit';
import '../core/devSeams';
import '../modules/inventory/quickItemActions';
import '../modules/servers/serverConfig';
import '../controllers/interface/msgWin';
import '../modules/character_select/messages';
import { summonDisplayName } from '../modules/_shared/net_helpers';


import { PingPacket } from '@versions/shared/packets/ClientToServerPackets';

import { Hero } from '../modules/hero';
import { Session } from '../modules/session';
import { AppState, UIState } from './uiState';
import { Ecs } from '../ecs/current';



import { installModules } from '../modules/module';
import { MODULES } from '../modules/modules';
import { installPingNet } from '../controllers/net/pingNet';
import { loadNpcNames, onNpcNamesChanged } from '../controllers/assets/mu/npcNameFile';
import { monsterDisplayName } from '@versions/shared/monsters/monstersDatabase';


export { spawnPlayer } from '../modules/scope/net';

/**
 * `objectNameInWorld` is a snapshot, and deliberately so: it is also the
 * identity players are matched by (party, guild, chat sender), so it stays a
 * plain string rather than becoming a live lookup. That leaves the monsters
 * and NPCs already in scope holding the name they spawned with, so every
 * change to the `NpcName_*.txt` table - the first load as much as a language
 * change - has to walk them again.
 */
onNpcNamesChanged(() => {
  // The table can land before boot builds the world: nothing to rename yet.
  const world = Ecs.world;
  if (!world) return;

  for (const e of world.with('npcType', 'objectNameInWorld')) {
    e.objectNameInWorld = e.summonedBy
      ? summonDisplayName(e.npcType, e.summonedBy)
      : monsterDisplayName(e.npcType, 'NPC');
  }
});

// The names are wanted from the first monster on screen, not from the first
// time a quest window or a language change asks for them.
void loadNpcNames();



/**
 * C3 0E - `Ping`: the keep-alive the original client sends every few seconds
 * with its tick count and attack speed (the original server's speed-hack
 * check). OpenMU only documents it, but sending it keeps idle NAT/proxy
 * paths warm. The reverse `PingResponse` (C1 71) answers a server ping
 * request, which OpenMU's protocol has no packet for - nothing to respond to.
 */
const PING_INTERVAL_MS = 5000;
setInterval(() => {
  if (AppState.uiState !== UIState.World || !Session.gsSocket) return;
  const p = PingPacket.createPacket();
  p.TickCount = Math.floor(performance.now()) >>> 0;
  p.AttackSpeed = Hero.attackSpeed ?? 0;
  Session.sendToGS(p.buffer);
}, PING_INTERVAL_MS);

// A hot update that reaches this module must reload the page: Vite would
// otherwise re-execute it and hand later-loaded importers a second instance
// of this singleton (same guard as app/store.ts).
const hot = (import.meta as { hot?: { decline(): void } }).hot;
if (hot) hot.decline();

// Every gameplay module's listeners, in list order (see modules/modules.ts).
installModules(MODULES);

// The map ping: the proxy relay listener behind Shift + middle click.
installPingNet({
  selfId: () => Hero.playerId,
  offline: () => Session.isOffline,
  socket: () => Session.gsSocket,
  send: frame => Session.sendPingFrame(frame),
});
