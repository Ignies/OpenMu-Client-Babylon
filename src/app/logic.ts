// Every packet handler lives in its feature's net.ts; importing them here registers them,
// in the order the handlers had in this file (listener order per packet is kept).
// What this file imported before its handlers moved out, in the same order: loading these
// first keeps every import-time registration (quests, events, skills...) ahead of the nets.
import '../features/band/bandNet';
import '../controllers/net/pingNet';
import '../i18n';
import '@/core/types';
import '../controllers/actors/deserializeAppearance';
import '../features/hero/characterStats';
import '../features/options/gameOptions';
import '@versions/shared/items/itemsDatabase';
import '../features/items/itemLevelLook';
import '../controllers/actors/itemAngle';
import '../features/drops/dropModelProxy';
import '../features/drops/dropObject';
import '../controllers/assets/itemIconPack';
import '../features/items/itemSerializer';
import '../controllers/actors/mapPlayerNetClassToModelClass';
import '../controllers/actors/modelFactoryPerId';
import '@versions/shared/monsters/monstersDatabase';
import '../i18n/serverText';
import '../controllers/assets/mu/npcNameFile';
import '@versions/shared/objects/enum';
import '@versions/shared/packets/ConnectServerPackets';
import '@versions/shared/packets/ServerToClientPackets';
import '../controllers/net/packets.ts';
import '../features/marketplace/gameBridge';
import '../controllers/fx/fireworks';
import '../features/inventory/inventoryConstants';
import '@versions/shared/packets/ClientToServerPackets';
import '../features/social/social';
import '../features/chat/commands';
import '../controllers/interface/nameTags';
import '../features/warp/warpScopeHold';
import '../features/events';
import '../features/economy/economy';
import '../features/gm/gmPanel';
import '../features/friends/messenger';
import '../features/chat/chatRooms';
import '../features/friends/friendList';
import '../features/inventory/itemStorage';
import '../controllers/net/roundTrip';
import '../features/chat/notices';
import '../controllers/interface/slideHelp';
import '../features/chat/chat';
import '../features/chat/emojiBubbles';
import '../ecs/systems/emojiBubbleSystem';
import '../features/chat/chatEmojis';
import '../features/chat/emojis';
import '../controllers/net/protocols/chatWire';
import '../controllers/anim/playerActionMapper';
import '../controllers/actors/weaponClass';
import '../controllers/actors/wings';
import '../controllers/actors/playerObject';
import '../ecs/world';
import '../core/attributeSystem';
import '../controllers/actors/characterScale';
import '@versions/shared/skills/skillsDatabase';
import '../controllers/actors/heroMoveTrace';
import '../features/skills/skillCasting';
import '../controllers/combat/skillClips';
import '../features/warp/teleportRules';
import '../ecs/systems/teleportSystem';
import '../features/skills/magicEffects';
import '@versions/shared/skills/skillVisuals';
import '../controllers/anim/playSpeed';
import '@versions/shared/npcs/trap_npc';
import '../controllers/anim/monsterAttackClip';
import '../controllers/sound/packetSounds';
import '../controllers/sound/soundsManager';
import '../controllers/fx/core';
import '../controllers/render/babylon/exports';
import '../core/eventBus';
import '../controllers/sound';
import '../controllers/sound/sfx';
import '../controllers/sound/combatSounds';
import '../features/hero/experience';
import '../features/session/sessionResume';
import '../controllers/weather/rainState';
import '../controllers/combat';
import '@versions/shared/skills/dark_knight/combo/state';
import '../controllers/combat/recipes';
import '../features/pets/pets';
import '../controllers/actors/locomotion';
import '../controllers/actors/transformedBody';
import '../features/quests';
import '../features/session/sessionExit';
import './store';
import '../core/devSeams';
import '../features/inventory/quickItemActions';
import '../features/servers/serverConfig';
import '../controllers/interface/msgWin';
import '../features/character_select/messages';
import '../features/session/net';
import '../features/character_select/net';
import '../features/hero/net';
import '../features/warp/net';
import '../features/inventory/net';
import '../features/scope/net';
import '../features/chat/net';
import '../features/guild/net';
import '../features/party/net';
import '../features/guild_war/net';
import '../features/friends/net';
import '../features/combat/net';
import '../features/skills/net';
import '../features/drops/net';
import '../features/world/net';
import '../features/marketplace/net';
import '../features/npc_shop/net';
import '../features/vault/net';
import '../features/chaos_mix/net';
import '../features/trade/net';
import '../features/personal_shop/net';
import '../features/options/net';
import '../features/quests/net';
import '../features/pets/net';
import '../features/mu_helper/net';
import { summonDisplayName } from '../features/_shared/net_helpers';


import { PingPacket } from '@versions/shared/packets/ClientToServerPackets';
import { PlayFanfareSoundPacket, ServerCommandPacket, ShowChristmasFireworksPacket, ShowFireworksPacket, ShowSwirlPacket } from '@versions/shared/packets/ServerToClientPackets';
import { SWIRL_BLOOM, SWIRL_BLOOM_SECONDS, SWIRL_START } from '../controllers/sound/packetSounds';

import { Store, UIState } from './store';



import { installBandNet } from '../features/band/bandNet';
import { installPingNet } from '../controllers/net/pingNet';
import { loadNpcNames, onNpcNamesChanged } from '../controllers/assets/mu/npcNameFile';
import { monsterDisplayName } from '@versions/shared/monsters/monstersDatabase';


export { spawnPlayer } from '../features/scope/net';

/**
 * `objectNameInWorld` is a snapshot, and deliberately so: it is also the
 * identity players are matched by (party, guild, chat sender), so it stays a
 * plain string rather than becoming a live lookup. That leaves the monsters
 * and NPCs already in scope holding the name they spawned with, so every
 * change to the `NpcName_*.txt` table - the first load as much as a language
 * change - has to walk them again.
 */
onNpcNamesChanged(() => {
  const world = Store.world;
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
  if (Store.uiState !== UIState.World || !Store.gsSocket) return;
  const p = PingPacket.createPacket();
  p.TickCount = Math.floor(performance.now()) >>> 0;
  p.AttackSpeed = Store.playerData.attackSpeed ?? 0;
  Store.sendToGS(p.buffer);
}, PING_INTERVAL_MS);

// A hot update that reaches this module must reload the page: Vite would
// otherwise re-execute it and hand later-loaded importers a second instance
// of this singleton (same guard as store.ts).
const hot = (import.meta as { hot?: { decline(): void } }).hot;
if (hot) hot.decline();

// The band system: the proxy relay listener and the transport the facade sends through.
installBandNet();

// The map ping: the proxy relay listener behind Shift + middle click.
installPingNet();
