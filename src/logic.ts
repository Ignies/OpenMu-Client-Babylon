import { runInAction } from 'mobx';
import { t, type TextKey } from './i18n';
import { CharacterClassNumber, ENUM_WORLD } from './common';
import {
  APPEARANCE_EXTENDED_LENGTH,
  deserializeAppearance,
  deserializeAppearanceExtended,
  itemLevelFromGlow,
  emptyAppearance,
  isAppearanceBlank,
  withAppearanceClass,
} from './common/deserializeAppearance';
import { StatType } from './common/characterStats';
import { ItemsDatabase } from './common/itemsDatabase';
import {
  ItemGroup,
  itemRestHeight,
  itemRestPose,
  itemRestRotation,
} from './common/itemAngle';
import { dropModelProxy } from './common/dropModelProxy';
import { prefetchItemIcons } from './common/itemIconPack';
import { ItemSerializer } from './common/itemSerializer';
import { isFemaleClass } from './common/mapPlayerNetClassToModelClass';
import {
  isKnownObjectType,
  resolveModelFactory,
} from './common/modelFactoryPerId';
import { ModelObject } from './common/modelObject';
import { MonstersDatabase, monsterDisplayName } from './common/monstersDatabase';
import { onLanguageChanged } from './i18n';
import { loadNpcNames } from './libs/mu/npcNameFile';
import {
  MonsterActionType,
  PlayerAction,
  ServerPlayerActionType,
} from './common/objects/enum';
import {
  ConnectionInfoPacket,
  HelloPacket,
  ServerListResponsePacket,
} from './common/packets/ConnectServerPackets';
import {
  AddCharactersToScopePacket,
  AddCharacterToScopeExtendedPacket,
  AddNpcsToScopePacket,
  AddSummonedMonstersToScopePacket,
  SummonHealthUpdatePacket,
  CharacterClassCreationUnlockPacket,
  CharacterCreationSuccessfulPacket,
  CharacterDeleteResponseCharacterDeleteResultEnum,
  CharacterDeleteResponsePacket,
  CharacterInformationPacket,
  CharacterInventoryPacket,
  CharacterLevelUpdatePacket,
  CharacterStatIncreaseResponsePacket,
  ChatMessagePacket,
  CurrentHealthAndShieldPacket,
  CurrentManaAndAbilityPacket,
  ExperienceGainedPacket,
  ShowEffectPacket,
  ShowEffectEffectTypeEnum,
  ShowSwirlPacket,
  GameServerEnteredPacket,
  InventoryItemUpgradedPacket,
  InventoryMoneyUpdatePacket,
  ItemAddedToInventoryPacket,
  ItemDropRemovedPacket,
  ItemDropResponsePacket,
  ItemDurabilityChangedPacket,
  ItemMovedPacket,
  ItemPickUpRequestFailedItemPickUpFailReasonEnum,
  ItemPickUpRequestFailedPacket,
  ItemRemovedPacket,
  ItemsDroppedPacket,
  LoginResponseLoginResultEnum,
  LoginResponsePacket,
  MapChangedPacket,
  MapObjectOutOfScopePacket,
  ObjectAnimationPacket,
  ObjectGotKilledPacket,
  SkillAddedPacket,
  SkillListUpdatePacket,
  SkillRemovedPacket,
  SkillAnimationPacket,
  AreaSkillAnimationPacket,
  MagicEffectStatusPacket,
  MagicEffectCancelledPacket,
  ObjectMovedPacket,
  ObjectHitPacket,
  ObjectWalkedPacket,
  PoisonDamagePacket,
  RespawnAfterDeath075Packet,
  RespawnAfterDeath095Packet,
  RespawnAfterDeathExtendedPacket,
  RespawnAfterDeathPacket,
  ExperienceGainedExtendedPacket,
  CharacterLevelUpdateExtendedPacket,
  CharacterInformationExtendedPacket,
  CurrentStatsExtendedPacket,
  MaximumStatsExtendedPacket,
  MaximumHealthAndShieldPacket,
  MaximumManaAndAbilityPacket,
  ObjectHitExtendedPacket,
  MoneyDroppedExtendedPacket,
  MasterCharacterLevelUpdatePacket,
  WeatherStatusUpdatePacket,
  HeroStateChangedPacket,
  GuildInformationPacket,
  AssignCharacterToGuildPacket,
  GuildMemberLeftGuildPacket,
  ChatMessageChatMessageTypeEnum,
  ObjectMessagePacket,
  PlayFanfareSoundPacket,
  ServerMessagePacket,
  PartyRequestPacket,
  PartyListPacket,
  RemovePartyMemberPacket,
  PartyHealthUpdatePacket,
  GuildJoinRequestPacket as GuildJoinRequestS2CPacket,
  GuildJoinResponsePacket as GuildJoinResponseS2CPacket,
  GuildJoinResponseGuildJoinRequestResultEnum,
  GuildListPacket,
  GuildKickResponsePacket,
  GuildKickResponseGuildKickSuccessEnum,
  GuildCreationResultPacket,
  GuildCreationResultGuildCreationErrorTypeEnum,
  GuildWarRequestPacket,
  GuildWarRequestResultPacket,
  GuildWarRequestResultRequestResultEnum,
  GuildWarDeclaredPacket,
  GuildWarScoreUpdatePacket,
  GuildWarEndedPacket,
  GuildWarEndedGuildWarResultEnum,
  GuildWarTypeEnum,
  GuildSoccerScoreUpdatePacket,
  GuildSoccerTimeUpdatePacket,
  GuildRelationshipRequestPacket,
  GuildRelationshipRequestTypeEnum,
  GuildRelationshipTypeEnum,
  GuildRelationshipChangeResultPacket,
  GuildRelationshipChangeResultGuildRelationshipChangeResultTypeEnum,
  AllianceListPacket,
  RemoveAllianceGuildResultPacket,
  MessengerInitializationPacket,
  FriendAddedPacket,
  FriendDeletedPacket,
  FriendOnlineStateUpdatePacket,
  FriendRequestPacket,
  FriendInvitationResultPacket,
  ChatRoomConnectionInfoPacket,
  AddLetterPacket,
  AddLetterLetterStateEnum,
  OpenLetterPacket,
  RemoveLetterPacket,
  LetterSendResponsePacket,
  LetterSendResponseLetterSendRequestResultEnum,
  RageAttackRangeResponsePacket,
  ApplyKeyConfigurationPacket,
  LogoutResponsePacket,
  CharacterStatIncreaseResponseExtendedPacket,
  MasterCharacterLevelUpdateExtendedPacket,
  OpenNpcDialogPacket,
  FruitConsumptionResponsePacket,
  FruitConsumptionResponseFruitConsumptionResultEnum,
  FruitConsumptionResponseFruitStatTypeEnum,
  AppearanceChangedPacket,
  AppearanceChangedExtendedPacket,
  PetInfoResponsePacket,
  PetModePacket,
  MuHelperStatusUpdatePacket,
  MuHelperConfigurationDataPacket,
  RageAttackPacket,
  BaseStatsExtendedPacket,
  ChainLightningHitInfoPacket,
  ServerCommandPacket,
  ShowFireworksPacket,
  ShowChristmasFireworksPacket,
} from './common/packets/ServerToClientPackets';
import { ChangeMapServerInfoPacket } from './common/packets';
import { spawnFireworks } from './common/fireworks';
import { InventoryConstants } from './common/inventoryConstants';
import {
  ItemBoughtPacket,
  NpcItemBuyFailedPacket,
  NpcItemSellResultPacket,
  NpcWindowResponseNpcWindowEnum,
  NpcWindowResponsePacket,
  StoreItemListItemWindowEnum,
  StoreItemListPacket,
} from './common/packets/ServerToClientPackets';
import {
  ClosePlayerShopDialogPacket,
  ItemCraftingResultPacket,
  PlayerShopBuyResultPacket,
  PlayerShopClosedPacket,
  PlayerShopItemListPacket,
  PlayerShopItemSoldToPlayerPacket,
  PlayerShopOpenSuccessfulPacket,
  PlayerShopSetItemPriceResponsePacket,
  PlayerShopSetItemPriceResponseItemPriceSetResultEnum,
  PlayerShopsPacket,
  TradeButtonStateChangedPacket,
  TradeFinishedPacket,
  TradeItemAddedPacket,
  TradeItemRemovedPacket,
  TradeMoneyUpdatePacket,
  TradeRequestAnswerPacket,
  TradeRequestPacket as TradeRequestS2CPacket,
  VaultMoneyUpdatePacket,
  VaultProtectionInformationPacket,
} from './common/packets/ServerToClientPackets';
import {
  ClientReadyAfterMapChangePacket,
  CloseNpcRequestPacket,
  GuildInfoRequestPacket,
  PingPacket,
} from './common/packets/ClientToServerPackets';
import { Social } from './social';
import { heroStateMessage } from './common/nameTags';
import { events } from './events';
import { Economy, type ShopStock } from './economy';
import { Messenger } from './messenger';
import { ChatRooms } from './chatRooms';
import { FRIEND_OFFLINE } from './common/messenger';
import {
  CHAOS_CARD_WIRE_STORAGE,
  PERSONAL_SHOP_SLOTS,
  StorageKind,
  localIndexOf,
} from './common/itemStorage';
import { Notices } from './common/notices';
import { SlideHelp } from './common/slideHelp';
import { ChatLineType, classifyInboundChat, cleanName } from './common/chat';
import {
  matchEmojiBubbleWord,
  type EmojiBubbleId,
} from './common/emojiBubbles';
import { startEmojiBubble } from './ecs/systems/emojiBubbleSystem';
import {
  chooseAttackAction,
  resolveGenderedAction,
  ServerToClientActionMap,
} from './common/playerActionMapper';
import { PlayerObject, npcClassOf } from './common/playerObject';
import { Entity, type Item, World } from './ecs/world';
import { createAttributeSystem } from './libs/attributeSystem';
import { classWorldScale } from './common/characterScale';
import { skillDefinition } from './common/skillsDatabase';
import { chooseSkillAction } from './common/skillCasting';
import { getBaseClass, BaseClass } from './common/characterStats';
import { SKILL_TO_EFFECT } from './common/magicEffects';
import { playAreaSkillVisual, playTargetedSkillVisual, setBuffVisual } from './common/skillVisuals';
import { Vector3 } from './libs/babylon/exports';
import { EventBus } from './libs/eventBus';
import type { Events } from './libs/eventBus/events';
import { sound, type Sounds } from './sound';
import { playSfx, playUiSound, UI_SOUND_KEYS } from './libs/sfx';
import {
  hitSound,
  pickupSound,
  skillSound,
  usesMissileWeapon,
} from './common/combatSounds';
import { experienceForLevel } from './common/experience';
import { WEATHER_RAIN } from './weather/rainState';
import { combat } from './combat';
import { COMBO_SOUND } from './combat/combo';
import { SHOCK_IMMUNE_CLIPS } from './combat/recipes';
import { isRidingMount, mountKind } from './common/pets';
import { quests } from './quests';
import { Store, UIState } from './store';
import { gameServerTarget } from './common/serverConfig';
import { MsgWinCode } from './common/msgWin';
import { CREATE_MESSAGES } from './ui/pages/charactersPage/layout';

/** MoveSpeed 10 x REFERENCE_FPS 25 / 100 units per tile (ZzzCharacter.cpp:11530). */
const MONSTER_WALK_TILES_PER_SECOND = 2.5;

function convertDirectionToAngle(direction: number): number {
  return (direction * Math.PI) / 4 - Math.PI / 4;
}

export function spawnPlayer(
  world: World,
  { cls }: { cls?: CharacterClassNumber } = {}
) {
  const playerEntity = world.add({
    transform: {
      pos: new Vector3(),
      rot: Vector3.Zero(),
      // Object.Scale per class (ZzzCharacter.cpp:11925-11933).
      scale: classWorldScale(cls ?? CharacterClassNumber.DarkKnight),
      posOffset: new Vector3(0.5, 0, 0.5),
    },
    modelFactory: PlayerObject,
    pathfinding: {
      from: { x: 0, y: 0 },
      to: { x: 0, y: 0 },
      path: [],
      calculated: true,
    },
    playerMoveTo: {
      point: { x: 0, y: 0 },
      handled: true as boolean,
    },
    movement: {
      velocity: { x: 0, y: 0 },
    },
    playerAnimation: {
      action: PlayerAction.PLAYER_SET,
      run: 0,
    },
    attributeSystem: createAttributeSystem(),
    visibility: {
      state: 'hidden',
      lastChecked: 0,
    },
    screenPosition: {
      worldOffsetZ: 2.5,
      x: 0,
      y: 0,
    },
    objectNameInWorld: 'Player',
    charAppearance: {
      helm: null,
      armor: null,
      gloves: null,
      pants: null,
      boots: null,
      leftHand: null,
      rightHand: null,
      wings: null,
      pet: null,
      charClass: cls ?? CharacterClassNumber.DarkKnight,
      changed: true,
    } satisfies NonNullable<Entity['charAppearance']> as NonNullable<
      Entity['charAppearance']
    >,
  });
  playerEntity.transform.pos.z = 1.7;

  playerEntity.attributeSystem.setValue(
    'isFemale',
    isFemaleClass(cls ?? CharacterClassNumber.DarkKnight) ? 1 : 0
  );
  playerEntity.attributeSystem.setValue('isFlying', 0);
  playerEntity.attributeSystem.setValue('currentHealth', 0);
  playerEntity.attributeSystem.setValue('currentMana', 0);
  playerEntity.attributeSystem.setValue('maxHealth', 1);
  playerEntity.attributeSystem.setValue('maxMana', 1);
  playerEntity.attributeSystem.setValue('totalMovementSpeed', 3);
  playerEntity.attributeSystem.setValue(
    'playerNetClass',
    cls ?? CharacterClassNumber.DarkKnight
  );

  return playerEntity;
}

let serverListRequested = false;
EventBus.on('Hello', packet => {
  const p = new HelloPacket(packet);
  if (serverListRequested) return;
  serverListRequested = true;
  Store.updateServerListRequest();
});

EventBus.on('GameServerEntered', bytes => {
  const p = new GameServerEnteredPacket(bytes);

  // The game server answered, so the address we dialled is the right one: no
  // fallback attempt is pending any more.
  Store.onGameServerReached();

  const id = p.PlayerId & 0x7fff;
  runInAction(() => {
    Store.playerId = id;
  });
  console.log(`PlayerID: ${Store.playerId}`);

  // A map-server switch re-authenticates on the new server instead of
  // showing the login form (CSMServer::SendChangeMapServer); the server
  // answers with the character state and the world carries on.
  if (Store.sendServerChangeAuthentication()) return;

  runInAction(() => {
    Store.uiState = UIState.Login;
  });
});

EventBus.on('ServerListResponse', bytes => {
  const p = new ServerListResponsePacket(bytes);
  const servers = p.getServers(p.ServerCount);
  runInAction(() => {
    Store.serverList = servers;
  });
});

// A socket we did not close ourselves went away: `Store.onSocketLost` ignores
// sockets that were already handed off (deliberate closes clear the field
// first) and otherwise starts over at the server list with a notice. Errors
// are always followed by a close, so only the close is acted on (App.tsx
// already logs the error line).
EventBus.on('wsClosed', ({ socket }) => {
  Store.closeNpcShop();
  quests.closeAll();
  Store.onSocketLost(socket);
});

// Packet handlers are synchronous on purpose: `createSocket` emits packets in
// wire order from one loop, so a handler that awaits would let the packets
// behind it run first (and with two `async` handlers, in whichever order the
// microtasks resolve). Nothing below needs to await — the socket calls are
// fire-and-forget — so none does.
EventBus.on('ConnectionInfo', bytes => {
  const p = new ConnectionInfoPacket(bytes);
  // The server names the game server it wants us on — a separate box on any
  // real deployment. `gameServerTarget` weighs that against the connect-server
  // host we just used (see its comment: an address only the internet can route
  // to is not believed from a server we reached locally) and hands back the
  // loser as the address to retry on.
  const { host, fallback } = gameServerTarget(p.IpAddress);

  console.log(
    `connection info: ${host}:${p.Port} (server said "${p.IpAddress}")`
  );

  Store.connectToGameServer(host, p.Port, fallback);
});

EventBus.on('LoginResponse', bytes => {
  const p = new LoginResponsePacket(bytes);

  runInAction(() => {
    Store.loginProcessing = false;
  });

  if (p.Success === LoginResponseLoginResultEnum.Okay) {
    runInAction(() => {
      Store.loginError = undefined;
    });
    Store.saveLoginData();
    Store.disconnectFromConnectServer();
    runInAction(() => {
      Store.uiState = UIState.Characters;
    });
    return;
  }

  runInAction(() => {
    Store.loginError = `Error: ${LoginResponseLoginResultEnum[p.Success]}`;
    Store.uiState = UIState.Login;
  });
});

EventBus.on('CharacterDeleteResponse', bytes => {
  const p = new CharacterDeleteResponsePacket(bytes);

  const name = Store.deletingChar;
  Store.deletingChar = null;

  switch (p.Result) {
    case CharacterDeleteResponseCharacterDeleteResultEnum.Successful:
      runInAction(() => {
        Store.charactersList = Store.charactersList.filter(c => c.Name !== name);
        if (Store.focusedChar === name) Store.focusedChar = '';
      });

      Store.popUpMsgWin(MsgWinCode.DeleteCharacterSuccess);
      break;

    case CharacterDeleteResponseCharacterDeleteResultEnum.Unsuccessful:
      Store.popUpMsgWin(MsgWinCode.DeleteCharacterGuildWarning);
      break;

    case CharacterDeleteResponseCharacterDeleteResultEnum.WrongSecurityCode:
      Store.popUpMsgWin(MsgWinCode.StorageResidentWrong);
      break;

    default:
      if (p.Result === 3) {
        Store.popUpMsgWin(MsgWinCode.DeleteCharacterItemBlock);
        break;
      }

      console.warn(`unknown CharacterDeleteResponse result ${p.Result}`);
      Store.popUpMsgWin(MsgWinCode.StorageResidentWrong);
      break;
  }
});

EventBus.on('CharacterClassCreationUnlock', bytes => {
  const p = new CharacterClassCreationUnlockPacket(bytes);

  Store.creationUnlockFlags = p.UnlockFlags;
});

EventBus.on('CharacterCreationSuccessful', bytes => {
  const p = new CharacterCreationSuccessfulPacket(bytes);

  if (!p.Success) {
    Store.charCreationPending = false;
    Store.addNotification(CREATE_MESSAGES.failed, 'error');
    return;
  }

  const preview = p.PreviewData;

  Store.addCreatedCharacter({
    SlotIndex: p.CharacterSlot,
    Name: p.CharacterName,
    Level: p.Level,
    Status: p.CharacterStatus,
    Appearance: isAppearanceBlank(preview)
      ? emptyAppearance(p.Class)
      : withAppearanceClass(preview, p.Class),
  });
});

EventBus.on('CharacterCreationFailed', () => {
  Store.charCreationPending = false;
  Store.addNotification(CREATE_MESSAGES.failed, 'error');
});

type CharacterInformationView = Pick<
  CharacterInformationPacket,
  | 'Money'
  | 'X'
  | 'Y'
  | 'MapId'
  | 'CurrentExperience'
  | 'ExperienceForNextLevel'
  | 'LevelUpPoints'
  | 'Strength'
  | 'Agility'
  | 'Vitality'
  | 'Energy'
  | 'Leadership'
  | 'UsedFruitPoints'
  | 'MaxFruitPoints'
  | 'UsedNegativeFruitPoints'
  | 'MaxNegativeFruitPoints'
  | 'CurrentHealth'
  | 'MaximumHealth'
  | 'CurrentMana'
  | 'MaximumMana'
  | 'CurrentShield'
  | 'MaximumShield'
  | 'CurrentAbility'
  | 'MaximumAbility'
> & { AttackSpeed?: number; MagicSpeed?: number };

function applyCharacterInformation(p: CharacterInformationView) {
  const playerData = Store.playerData;

  // Chat, party, guild and messenger state belong to the character: clear on
  // select, before the new values land. MessengerInitialization arrives
  // right after and refills the lists.
  Social.reset();
  Messenger.reset();
  Economy.reset();

  runInAction(() => {
    playerData.money = p.Money;
    playerData.x = p.X;
    playerData.y = p.Y;

    playerData.exp = Number(p.CurrentExperience);
    playerData.expToNextLvl = Number(p.ExperienceForNextLevel);
    // The packet carries no level; it was taken from the character list on
    // selection. The bar's lower bound is the start of the current bracket.
    playerData.currentLvlExp = experienceForLevel(playerData.level);
    playerData.points = p.LevelUpPoints;

    playerData.str = p.Strength;
    playerData.agi = p.Agility;
    playerData.sta = p.Vitality;
    playerData.eng = p.Energy;
    playerData.leadership = p.Leadership;

    playerData.usedFruitPoints = p.UsedFruitPoints;
    playerData.maxFruitPoints = p.MaxFruitPoints;
    playerData.usedNegativeFruitPoints = p.UsedNegativeFruitPoints;
    playerData.maxNegativeFruitPoints = p.MaxNegativeFruitPoints;

    playerData.currentHP = p.CurrentHealth;
    playerData.maxHP = p.MaximumHealth;

    playerData.currentMP = p.CurrentMana;
    playerData.maxMP = p.MaximumMana;

    playerData.currentSD = p.CurrentShield;
    playerData.maxSD = p.MaximumShield;

    playerData.currentAG = p.CurrentAbility;
    playerData.maxAG = p.MaximumAbility;

    // Only the extended packet carries the server's speed values.
    playerData.attackSpeed = p.AttackSpeed ?? null;
    playerData.magicSpeed = p.MagicSpeed ?? null;

    // No HeroState in this packet; neutral until the scope add carries it.
    playerData.heroState = 3;

    Store.uiState = UIState.World;
    // Lazy: preloadSprites pulls the window layouts in, and logic.ts sits under them.
    void import('./libs/mu/preloadSprites').then(m => m.preloadWorldSprites());

    EventBus.emit('requestWarp', { map: p.MapId, pos: { x: p.X, y: p.Y } });
  });
}

EventBus.on('CharacterInformation', packet =>
  applyCharacterInformation(new CharacterInformationPacket(packet))
);
// F3 03 with 92 bytes: the server runs the extended plug-ins (stat values > 65535).
EventBus.on('CharacterInformationExtended', packet =>
  applyCharacterInformation(new CharacterInformationExtendedPacket(packet))
);

EventBus.on('MapChanged', packet => {
  // HideAll on warp: the merchant stays behind.
  Store.closeNpcShop();
  // `ReceiveMapChange` (WSclient.cpp:622): the notice stack and the minimap
  // sheet do not survive a warp.
  Notices.clear();
  SlideHelp.clear();
  runInAction(() => {
    Store.minimapEnabled = false;
  });

  const p = new MapChangedPacket(packet);

  // The soccer scoreboard does not survive a warp off the stadium.
  if (p.IsMapChange && p.MapNumber !== ENUM_WORLD.WD_6STADIUM) {
    runInAction(() => {
      Social.battleSoccer = null;
    });
  }

  const pos = { x: p.PositionX, y: p.PositionY };

  // The packet's byte 9 is the arrival facing (`gate.angle`, the exit gate's
  // `Rotation` column, 0-7 × 45°); the generated class has no accessor for it.
  // The hero entity survives the warp, so the yaw can be set right away.
  const rotation = packet.byteLength > 9 ? packet.getUint8(9) : undefined;
  const playerEntity = Store.world?.playerEntity;
  if (playerEntity && rotation !== undefined) {
    playerEntity.transform.rot.y = convertDirectionToAngle(rotation);
  }

  if (p.IsMapChange) {
    awaitingClientReady = true;
    EventBus.emit('requestWarp', { map: p.MapNumber, pos });
    return;
  }

  if (!playerEntity) return;

  const world = Store.world!;
  const playerPos = playerEntity.transform.pos;

  playerPos.x = pos.x;
  playerPos.z = pos.y;
  playerPos.y = world.getTerrainHeight(pos.x, pos.y);

  const { pathfinding } = playerEntity;
  pathfinding.path = null;
  pathfinding.from = { x: pos.x, y: pos.y };
  pathfinding.to = { x: pos.x, y: pos.y };
});

EventBus.on('CharacterInventory', packet => {
  const p = new CharacterInventoryPacket(packet);
  const entries = p.getItems(p.ItemCount).map(item => ({
    slot: item.ItemSlot,
    item: ItemSerializer.DeserializeItem(new Uint8Array(item.ItemData.buffer)),
  }));

  runInAction(() => {
    const items = Store.playerData.items;
    for (const { slot, item } of entries) {
      // The personal store lives behind `FirstStoreItemSlotIndex` in the
      // same storage (OpenMU) - those squares belong to the stall grid.
      if (slot >= InventoryConstants.FirstStoreItemSlotIndex) {
        Economy.myShopItems[localIndexOf(StorageKind.PersonalShop, slot)] = item;
        continue;
      }
      items[slot] = item;
    }
  });

  Store.syncPlayerAppearance();
  // Inventory icons start loading now, before the window is ever opened.
  prefetchItemIcons(entries.map(entry => entry.item));
});

EventBus.on('CurrentHealthAndShield', packet => {
  const p = new CurrentHealthAndShieldPacket(packet);

  const playerEntity = Store.world?.playerEntity;
  if (!playerEntity) return;
  playerEntity.attributeSystem.setValue('currentHealth', p.Health);
  runInAction(() => {
    Store.playerData.currentHP = Math.floor(p.Health);
    Store.playerData.currentSD = Math.floor(p.Shield);
  });
});

EventBus.on('CurrentStatsExtended', packet => {
  const p = new CurrentStatsExtendedPacket(packet);
  const playerEntity = Store.world?.playerEntity;
  playerEntity?.attributeSystem.setValue('currentHealth', p.Health);
  playerEntity?.attributeSystem.setValue('currentMana', p.Mana);
  runInAction(() => {
    const pd = Store.playerData;
    pd.currentHP = Math.floor(p.Health);
    pd.currentSD = Math.floor(p.Shield);
    pd.currentMP = Math.floor(p.Mana);
    pd.currentAG = Math.floor(p.Ability);
    pd.attackSpeed = p.AttackSpeed;
    pd.magicSpeed = p.MagicSpeed;
  });
});

EventBus.on('MaximumStatsExtended', packet => {
  const p = new MaximumStatsExtendedPacket(packet);
  runInAction(() => {
    const pd = Store.playerData;
    pd.maxHP = p.Health;
    pd.maxSD = p.Shield;
    pd.maxMP = p.Mana;
    pd.maxAG = p.Ability;
  });
});

EventBus.on('MaximumHealthAndShield', packet => {
  const p = new MaximumHealthAndShieldPacket(packet);
  runInAction(() => {
    Store.playerData.maxHP = p.Health;
    Store.playerData.maxSD = p.Shield;
  });
});

EventBus.on('MaximumManaAndAbility', packet => {
  const p = new MaximumManaAndAbilityPacket(packet);
  runInAction(() => {
    Store.playerData.maxMP = p.Mana;
    Store.playerData.maxAG = p.Ability;
  });
});

EventBus.on('CurrentManaAndAbility', packet => {
  const p = new CurrentManaAndAbilityPacket(packet);

  const playerEntity = Store.world?.playerEntity;
  if (!playerEntity) return;

  playerEntity.attributeSystem.setValue('currentMana', p.Mana);
  runInAction(() => {
    Store.playerData.currentMP = Math.floor(p.Mana);
    Store.playerData.currentAG = Math.floor(p.Ability);
  });
});

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
  }

  const world = Store.world;
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
 * `objectNameInWorld` is a snapshot, and deliberately so: it is also the
 * identity players are matched by (party, guild, chat sender), so it stays a
 * plain string rather than becoming a live lookup. That leaves the monsters
 * and NPCs already in scope holding the name of the language they spawned in,
 * so a language change has to walk them once the new `NpcName_*.txt` is in.
 */
onLanguageChanged(() => {
  void loadNpcNames().then(() => {
    const world = Store.world;
    if (!world) return;

    for (const e of world.with('npcType', 'objectNameInWorld')) {
      e.objectNameInWorld = e.summonedBy
        ? summonDisplayName(e.npcType, e.summonedBy)
        : monsterDisplayName(e.npcType, 'NPC');
    }
  });
});

/**
 * ReceiveCreateSummonViewport (WSclient.cpp:2718-2727): the tag is the
 * monster name plus "Of" + owner (GlobalText 485); the Castle Siege
 * gates/statues (types 152-158) keep their plain name.
 */
function summonDisplayName(type: number, owner: string): string {
  const base = monsterDisplayName(type, 'NPC');
  if (type >= 152 && type <= 158) return base;
  return `${base} of ${owner}`;
}

type ScopeNpc = {
  Id: number;
  TypeNumber: number;
  CurrentPositionX: number;
  CurrentPositionY: number;
  Rotation: number;
  /** AddSummonedMonstersToScope only: name of the summoning player. */
  OwnerCharacterName?: string;
};

function addNpcToScope(world: World, npc: ScopeNpc) {
  const id = npc.Id & 0x7fff;

  removeNetObject(world, id);

  if (!isKnownObjectType(npc.TypeNumber)) {
    console.warn(
      `No model mapping for NPC type ${npc.TypeNumber} (${
        monsterDisplayName(npc.TypeNumber, 'unnamed')
      }). Falling back to the Bull Fighter, as the original's default: arm does.`
    );
  }

  const modelFactory = resolveModelFactory(npc.TypeNumber);
  const owner = npc.OwnerCharacterName;

  const npcEntity = world.add({
    netId: id,
    worldIndex: world.mapIndex,
    npcType: npc.TypeNumber,
    transform: {
      pos: new Vector3(
        npc.CurrentPositionX,
        world.getTerrainHeight(npc.CurrentPositionX, npc.CurrentPositionY),
        npc.CurrentPositionY
      ),
      rot: new Vector3(0, convertDirectionToAngle(npc.Rotation), 0),
      scale: modelFactory.OverrideScale >= 0 ? modelFactory.OverrideScale : 1,
    },
    modelFactory,
    pathfinding: {
      from: { x: 0, y: 0 },
      to: { x: 0, y: 0 },
      path: [],
      calculated: true,
    },
    playerMoveTo: {
      point: { x: 0, y: 0 },
      handled: true as boolean,
    },
    movement: {
      velocity: { x: 0, y: 0 },
    },
    monsterAnimation: {
      action: MonsterActionType.Stop1,
    },
    attributeSystem: createAttributeSystem(),
    visibility: {
      lastChecked: 0,
      state: 'hidden',
    },
    screenPosition: {
      worldOffsetZ: 2.5,
      x: 0,
      y: 0,
    },
    objectNameInWorld: owner
      ? summonDisplayName(npc.TypeNumber, owner)
      : monsterDisplayName(npc.TypeNumber, 'NPC'),
    interactable: true,
  });

  if (owner) world.addComponent(npcEntity, 'summonedBy', owner);

  // Player-rig NPCs (the Elf Soldier, the guards) carry a class; monsters
  // do not. Hard-zeroing isFemale here made every one of them animate male.
  const npcClass = npcClassOf(modelFactory);
  npcEntity.attributeSystem.setValue(
    'isFemale',
    npcClass !== null && isFemaleClass(npcClass) ? 1 : 0
  );
  npcEntity.attributeSystem.setValue('isFlying', 0);
  // Original: every character starts with MoveSpeed = 10 units per 25-fps
  // frame (ZzzCharacter.cpp:11530, MoveCharacterPosition:6259) and monsters
  // never change it -> 10 * 25 / 100 = 2.5 tiles/s. The server sends no
  // monster speed; without this the attribute reads 0 and the walk stalls.
  npcEntity.attributeSystem.setValue(
    'totalMovementSpeed',
    MONSTER_WALK_TILES_PER_SECOND
  );

  const monsterHP = MonstersDatabase.get(npc.TypeNumber)?.HP ?? 0;
  npcEntity.attributeSystem.setValue('maxHealth', monsterHP);
  npcEntity.attributeSystem.setValue('currentHealth', monsterHP);
}

EventBus.on('AddNpcsToScope', packet => {
  const p = new AddNpcsToScopePacket(packet);

  const world = Store.world;
  if (!world) return;

  p.getNPCs().forEach(npc => addNpcToScope(world, npc));
});

// 0x1F (ReceiveCreateSummonViewport): a player's summons enter scope. Same
// spawn path as monsters, with the owner's name carried on the entity.
EventBus.on('AddSummonedMonstersToScope', packet => {
  const p = new AddSummonedMonstersToScopePacket(packet);

  const world = Store.world;
  if (!world) return;

  p.getSummonedMonsters().forEach(m => addNpcToScope(world, m));
});

// F3 20 (ReceiveSummonLife): percent health of the hero's own summon. The
// original shows it as a gauge in the endurance panel; here it drives the
// summon's health bar directly.
EventBus.on('SummonHealthUpdate', packet => {
  const p = new SummonHealthUpdatePacket(packet);

  const world = Store.world;
  if (!world) return;

  const owner = Store.playerData.name;
  for (const e of world.with('summonedBy', 'attributeSystem')) {
    if (e.summonedBy !== owner || e.objOutOfScope) continue;
    const max = e.attributeSystem.getValue('maxHealth');
    if (max > 0) {
      e.attributeSystem.setValue('currentHealth', (max * p.HealthPercent) / 100);
    }
  }
});

function removeNetObject(world: World, netId: number) {
  // The index holds the newest entity for an id; a stale one that shared it
  // surfaces again once the newer entry is gone, so loop until none is left.
  for (let entity = world.getByNetId(netId); entity; entity = world.getByNetId(netId)) {
    world.remove(entity);
    entity.onDispose?.();
    entity.modelObject?.dispose();
  }
}

type ScopeCharacter = {
  Id: number;
  CurrentPositionX: number;
  CurrentPositionY: number;
  Rotation: number;
  Name: string;
  appearance: ReturnType<typeof deserializeAppearance>;
  /** Server-computed speeds (extended protocol only). */
  attackSpeed?: number;
  magicSpeed?: number;
  /** Visible magic effect ids (extended protocol only). */
  effects?: number[];
  /** PK / hero status byte (`c->PK`; OpenMU CharacterHeroState, same values). */
  HeroState?: number;
};

EventBus.on('AddCharactersToScope', packet => {
  const p = new AddCharactersToScopePacket(packet);
  const chars = p.getCharacters();

  const world = Store.world;
  if (!world) return;

  chars.forEach(char => {
    addCharacterToScope(world, {
      ...char,
      appearance: deserializeAppearance(char.Appearance),
    });
  });
});

// Extended protocol (client >= 106.3): one character per packet, extended
// appearance layout, followed by a count + list of visible effect ids.
EventBus.on('AddCharacterToScopeExtended', packet => {
  const p = new AddCharacterToScopeExtendedPacket(packet);

  const world = Store.world;
  if (!world) return;

  const data = p.AppearanceAndEffects;
  const effects: number[] = [];
  if (data.byteLength > APPEARANCE_EXTENDED_LENGTH) {
    const count = data.getUint8(APPEARANCE_EXTENDED_LENGTH);
    for (
      let i = 0;
      i < count && APPEARANCE_EXTENDED_LENGTH + 1 + i < data.byteLength;
      i++
    ) {
      effects.push(data.getUint8(APPEARANCE_EXTENDED_LENGTH + 1 + i));
    }
  }

  addCharacterToScope(world, {
    Id: p.Id,
    CurrentPositionX: p.CurrentPositionX,
    CurrentPositionY: p.CurrentPositionY,
    Rotation: p.Rotation,
    Name: p.Name.replace(/ +$/, ''),
    appearance: deserializeAppearanceExtended(data),
    attackSpeed: p.AttackSpeed,
    magicSpeed: p.MagicSpeed,
    effects,
    HeroState: p.HeroState,
  });
});

function addCharacterToScope(world: World, char: ScopeCharacter) {
  const worldIndex = world.mapIndex;
  {
    const maskedId = char.Id & 0x7fff;
    console.log(
      `[scope] character "${char.Name}" id=${maskedId} at (${char.CurrentPositionX},${char.CurrentPositionY}) map=${worldIndex} class=${char.appearance.cls} local=${Store.playerId === maskedId}`
    );

    removeNetObject(world, maskedId);

    const appearance = char.appearance;
    const playerEntity = spawnPlayer(world, { cls: appearance.cls });
    world.addComponent(playerEntity, 'netId', maskedId);
    world.addComponent(playerEntity, 'worldIndex', worldIndex);
    playerEntity.transform.pos.x = char.CurrentPositionX;
    playerEntity.transform.pos.z = char.CurrentPositionY;
    playerEntity.transform.pos.y = world.getTerrainHeight(
      char.CurrentPositionX,
      char.CurrentPositionY
    );

    playerEntity.transform.rot.y = convertDirectionToAngle(char.Rotation);

    playerEntity.objectNameInWorld = char.Name;
    // `c->PK = Data->PK` (WSclient.cpp:804): tints the name balloon.
    if (char.HeroState != null) playerEntity.heroState = char.HeroState;

    if (Store.playerId === maskedId) {
      world.addComponent(playerEntity, 'localPlayer', true);
      console.log(`Local player spawned: ${maskedId} - ${char.Name}`);
      if (char.attackSpeed != null) Store.playerData.attackSpeed = char.attackSpeed;
      if (char.magicSpeed != null) Store.playerData.magicSpeed = char.magicSpeed;
      if (char.HeroState != null) Store.playerData.heroState = char.HeroState;
    }

    if (char.effects?.length) {
      world.addComponent(playerEntity, 'buffs', new Set(char.effects));
      if (Store.playerId === maskedId) {
        char.effects.forEach(id => Store.setBuff(id, true));
      }
    }

    const cApp = playerEntity.charAppearance;

    cApp.leftHand = appearance.leftHand;
    cApp.rightHand = appearance.rightHand;
    cApp.helm = appearance.helm;
    cApp.armor = appearance.armor;
    cApp.pants = appearance.pants;
    cApp.gloves = appearance.gloves;
    cApp.boots = appearance.boots;
    // Both layouts carry them — the legacy one in the wing / pet bits of the
    // preview (`deserializeAppearance`), the extended one in its own slots.
    cApp.wings = appearance.wings ?? null;
    cApp.pet = appearance.pet ?? null;

    cApp.changed = true;
  }
}

EventBus.on('MapObjectOutOfScope', packet => {
  const p = new MapObjectOutOfScopePacket(packet);
  p.getObjects(p.ObjectCount).forEach(obj => {
    const maskedId = obj.Id & 0x7fff;

    // `RemoveShopTitle`: the stall title goes with the player who left.
    Economy.setShopTitle(maskedId, null);
    Economy.dropBrowsedShop(maskedId);

    const world = Store.world;
    if (!world) return;

    let objEntity = world.getByNetId(maskedId);
    if (objEntity?.objOutOfScope) objEntity = undefined;
    if (objEntity) {
      world.addComponent(objEntity, 'objOutOfScope', true);
    }
  });
});

EventBus.on('ObjectMoved', packet => {
  const p = new ObjectMovedPacket(packet);

  const world = Store.world;
  if (!world) return;

  const maskedId = p.ObjectId & 0x7fff;
  const obj = world.getByNetId(maskedId);
  if (!obj) return;
  if (isDeadMonster(obj)) return;

  obj.transform.pos.x = p.PositionX;
  obj.transform.pos.z = p.PositionY;
  obj.transform.pos.y = world.getTerrainHeight(p.PositionX, p.PositionY);

  if (obj.playerMoveTo) {
    obj.playerMoveTo.point.x = p.PositionX;
    obj.playerMoveTo.point.y = p.PositionY;
    obj.playerMoveTo.handled = true;
  }

  if (obj.pathfinding) {
    obj.pathfinding.path = null;
    obj.pathfinding.from = { x: p.PositionX, y: p.PositionY };
    obj.pathfinding.to = { x: p.PositionX, y: p.PositionY };
  }

  if (obj.movement) {
    obj.movement.velocity.x = 0;
    obj.movement.velocity.y = 0;
  }
});

EventBus.on('ObjectWalked', packet => {
  const p = new ObjectWalkedPacket(packet);

  const world = Store.world;
  if (!world) return;

  const maskedId = p.ObjectId & 0x7fff;

  const obj = world.getByNetId(maskedId);
  if (!obj) return;

  if (obj.localPlayer) return;
  if (isDeadMonster(obj)) return;

  if (obj.playerMoveTo) {
    obj.playerMoveTo.handled = false;
    obj.playerMoveTo.point.x = p.TargetX;
    obj.playerMoveTo.point.y = p.TargetY;
  } else {
    obj.transform.pos.x = p.TargetX;
    obj.transform.pos.z = p.TargetY;
  }

  obj.transform.rot.y = convertDirectionToAngle(p.TargetRotation);
});

/**
 * ChatMessage: `ReceiveChat` / `ReceiveChatWhisper` (WSclient.cpp:1435).
 * Party / guild / alliance lines arrive as normal chat with a prefix that
 * picks the log colour; only plain chat (and GM shouts) gets a balloon
 * (`AssignChat`, ZzzInterface.cpp:1183).
 */
EventBus.on('ChatMessage', packet => {
  const p = new ChatMessagePacket(packet);
  const sender = cleanName(p.Sender);
  const message = p.Message.replace(/\0+$/, '');

  if (p.Type === ChatMessageChatMessageTypeEnum.Whisper) {
    // SOUND_WHISPER for an incoming whisper; the name is offered as the next
    // whisper target (`RegistWhisperID`).
    if (Social.blockWhisper) return;
    playUiSound('whisper');
    Social.addChatLine(sender, message, ChatLineType.Whisper);
    if (!Social.whisperTarget) Social.setWhisperTarget(sender);
    return;
  }

  // OpenMU's `/post` arrives from the pseudo-sender "[POST]" as a Gens-type
  // message; it is a server-wide shout, so it takes the gens colour.
  if (sender === '[POST]') {
    Social.addChatLine(sender, message, ChatLineType.Gens);
    return;
  }

  const { type, text, balloon } = classifyInboundChat(message);
  Social.addChatLine(sender, text, type);

  // A plain chat line that is nothing but an emoji token is a bubble, not
  // speech (common/emojiBubbles.ts): pop it over the sender and drop the
  // balloon, or the glyph and the text it stands for would sit on top of each
  // other. The log line stays - it is what a client that draws no bubbles
  // shows, and it is what the player actually sent.
  //
  // Only `Chat`: party / guild / gens lines reach members anywhere on the
  // server, and a GM shout is an announcement that has to stay readable.
  const bubble =
    type === ChatLineType.Chat ? matchEmojiBubbleWord(text) : null;
  if (bubble) {
    popEmojiBubble(sender, bubble);
    return;
  }

  // `bGmMode` (RenderBoolean): the original reads `CtlCode` off its character
  // structure, which OpenMU never sends. A `#` shout is the one GM signal it
  // does give, so the sender's balloon turns into the GM one from here on.
  if (type === ChatLineType.GM) markAsGm(sender);

  if (!balloon) return;
  EventBus.emit('chatMessage', { sender, message: text, whisper: false });
});

/**
 * Play an inbound emoji bubble over the player with this name.
 *
 * The hero is skipped: the bubble was popped the moment the wheel was clicked
 * (or the token typed), and the server echoes our own chat back, which would
 * restart the pop-in a round trip late - the same reason ObjectAnimation
 * ignores its own echo.
 */
function popEmojiBubble(name: string, id: EmojiBubbleId): void {
  const world = Store.world;
  if (!world) return;
  const obj = world.netObjsQuery.entities.find(
    e => e.playerAnimation && e.objectNameInWorld === name
  );
  if (!obj || obj.localPlayer || obj.objOutOfScope) return;
  startEmojiBubble(world, obj, id);
}

/** Raise the GM flag on the player in scope with this name, if any. */
function markAsGm(name: string): void {
  const world = Store.world;
  if (!world) return;
  const obj = world.netObjsQuery.entities.find(
    e => e.playerAnimation && e.objectNameInWorld === name
  );
  if (obj && !obj.isGm) world.addComponent(obj, 'isGm', true);
}

/**
 * GuildInformation: the original's `GuildMark[]` table (`ReceiveGuildViewport`),
 * keyed by guild id so AssignCharacterToGuild members can print `[Guild]`
 * and draw the mark.
 */
EventBus.on('GuildInformation', packet => {
  const p = new GuildInformationPacket(packet);
  Store.guilds.set(p.GuildId, {
    name: cleanName(p.GuildName),
    alliance: cleanName(p.AllianceGuildName),
    logo: Array.from(new Uint8Array(p.Logo.buffer)),
  });
});

EventBus.on('AssignCharacterToGuild', packet => {
  const p = new AssignCharacterToGuildPacket(packet);
  const world = Store.world;
  if (!world) return;
  const requested = new Set<number>();
  p.getMembers().forEach(member => {
    const maskedId = member.PlayerId & 0x7fff;
    const obj = world.getByNetId(maskedId);
    if (obj) {
      world.addComponent(obj, 'guild', { id: member.GuildId, role: member.Role });
      obj.guild = { id: member.GuildId, role: member.Role };
    }
    if (maskedId === Store.playerId) {
      runInAction(() => {
        Social.myGuild = { id: member.GuildId, role: member.Role };
      });
    }
    // Unknown guild: ask for its name/mark, as the original does for a new GuildMarkIndex.
    if (!Store.guilds.has(member.GuildId) && !requested.has(member.GuildId)) {
      requested.add(member.GuildId);
      const req = GuildInfoRequestPacket.createPacket();
      req.GuildId = member.GuildId;
      Store.sendToGS(req.buffer);
    }
  });
});

/**
 * The hero is out of a guild: `ReceiveGuildLeave` clears the window, the
 * member list and the mark. When the guild itself is gone (disband) every
 * member in scope loses its mark too, not just the hero.
 */
function leaveGuild(guildId: number, disbanded: boolean): void {
  const world = Store.world;
  if (world) {
    const gone = world.netObjsQuery.entities.filter(
      e => e.guild && (disbanded ? e.guild.id === guildId : e.netId === Store.playerId)
    );
    for (const obj of gone) world.removeComponent(obj, 'guild');
  }
  if (disbanded) Store.guilds.delete(guildId);
  runInAction(() => {
    Social.myGuild = null;
    Social.guildMembers = [];
    Social.allianceGuilds = [];
    Social.guildWar = null;
    Social.battleSoccer = null;
    Social.guildRivalName = '';
    Social.guildTotalScore = 0;
    Social.guildCurrentScore = 0;
    Social.guildWindowEnabled = false;
  });
}

EventBus.on('GuildMemberLeftGuild', packet => {
  const p = new GuildMemberLeftGuildPacket(packet);
  const world = Store.world;
  if (!world) return;
  const maskedId = p.PlayerId & 0x7fff;
  const obj = world.getByNetId(maskedId);
  if (obj?.guild) world.removeComponent(obj, 'guild');
  if (maskedId === Store.playerId) {
    // `ReceiveGuildLeave` 1 / 4: no guild, window closed. The disband
    // response may have cleared it already - then there is nothing to say.
    const mine = Social.myGuild;
    if (!mine) return;
    leaveGuild(mine.id, p.IsGuildMaster);
    Social.errorMessage(t(p.IsGuildMaster ? 'guild.disbanded' : 'guild.youLeft'));
  } else if (obj?.objectNameInWorld && Social.myGuild) {
    Social.systemMessage(
      t('guild.memberLeft', { name: obj.objectNameInWorld })
    );
    if (Social.guildWindowEnabled) Social.requestGuildList();
  }
});

/** Name of a player in scope by net id, for the invite prompts. */
function playerNameById(netId: number): string {
  const obj = Store.world?.getByNetId(netId);
  return obj?.objectNameInWorld ?? `#${netId}`;
}

// ---- party (`ReceiveParty*`, WSclient.cpp:6839) -----------------------------

EventBus.on('PartyRequest', packet => {
  const p = new PartyRequestPacket(packet);
  const requesterId = p.RequesterId & 0x7fff;
  playUiSound('window');
  runInAction(() => {
    Social.partyRequest = {
      requesterId,
      requesterName: playerNameById(requesterId),
    };
  });
});

EventBus.on('PartyList', packet => {
  const p = new PartyListPacket(packet);
  const wasInParty = Social.inParty;
  Social.setPartyMembers(
    p.getMembers().map(m => ({
      name: cleanName(m.Name),
      index: m.Index,
      mapId: m.MapId,
      x: m.PositionX,
      y: m.PositionY,
      currentHealth: m.CurrentHealth,
      maximumHealth: m.MaximumHealth,
      healthStep: -1,
    }))
  );
  if (!wasInParty && Social.inParty) {
    Social.systemMessage(t('party.joined'));
    runInAction(() => {
      Social.partyWindowEnabled = true;
    });
  }
});

EventBus.on('RemovePartyMember', packet => {
  const p = new RemovePartyMemberPacket(packet);
  Social.removePartyMember(p.Index);
});

EventBus.on('PartyHealthUpdate', packet => {
  const p = new PartyHealthUpdatePacket(packet);
  Social.setPartyHealth(
    p.getMembers().map(m => ({ index: m.Index, value: m.Value }))
  );
});

// ---- guild (`ReceiveGuild*`, WSclient.cpp:6987) -----------------------------

EventBus.on('GuildJoinRequest', packet => {
  const p = new GuildJoinRequestS2CPacket(packet);
  const requesterId = p.RequesterId & 0x7fff;
  playUiSound('window');
  runInAction(() => {
    Social.guildJoinRequest = {
      requesterId,
      requesterName: playerNameById(requesterId),
    };
  });
});

const GUILD_JOIN_RESULTS: Record<GuildJoinResponseGuildJoinRequestResultEnum, TextKey> = {
  [GuildJoinResponseGuildJoinRequestResultEnum.Refused]: 'guild.joinRefused',
  [GuildJoinResponseGuildJoinRequestResultEnum.Accepted]: 'guild.joined',
  [GuildJoinResponseGuildJoinRequestResultEnum.GuildFull]: 'guild.isFull',
  [GuildJoinResponseGuildJoinRequestResultEnum.Disconnected]: 'guild.masterUnavailable',
  [GuildJoinResponseGuildJoinRequestResultEnum.NotTheGuildMaster]: 'guild.notGuildMaster',
  [GuildJoinResponseGuildJoinRequestResultEnum.AlreadyHaveGuild]: 'guild.alreadyInGuild',
  [GuildJoinResponseGuildJoinRequestResultEnum.GuildMasterOrRequesterIsBusy]:
    'guild.masterBusy',
  [GuildJoinResponseGuildJoinRequestResultEnum.MinimumLevel6]: 'guild.needLevel6',
};

EventBus.on('GuildJoinResponse', packet => {
  const p = new GuildJoinResponseS2CPacket(packet);
  const text = t(GUILD_JOIN_RESULTS[p.Result] ?? 'guild.requestFailed');
  if (p.Result === GuildJoinResponseGuildJoinRequestResultEnum.Accepted) {
    Social.systemMessage(text);
  } else {
    Social.errorMessage(text);
  }
});

EventBus.on('GuildList', packet => {
  const p = new GuildListPacket(packet);
  runInAction(() => {
    Social.guildMembers = p.IsInGuild
      ? p.getMembers().map(m => ({
          name: cleanName(m.Name),
          // `(0x80 & CurrentServer) ? (0x7F & CurrentServer) : -1`: the
          // flagged byte is the *second* server field - OpenMU writes the raw
          // id into ServerId and `0x80 + id` (0x7F offline) into ServerId2
          // (ShowGuildListPlugIn.cs:60), and server 0 has no bit at all in
          // the first one, so every member read as offline before.
          server: m.ServerId2 & 0x80 ? m.ServerId2 & 0x7f : -1,
          role: m.Role,
        }))
      : [];
    Social.guildTotalScore = Math.max(0, p.TotalScore);
    Social.guildCurrentScore = p.CurrentScore;
    Social.guildRivalName = cleanName(p.RivalGuildName);
  });
});

EventBus.on('GuildKickResponse', packet => {
  const p = new GuildKickResponsePacket(packet);
  switch (p.Result) {
    case GuildKickResponseGuildKickSuccessEnum.KickSucceeded:
      // OpenMU answers the *kicked* player and a member who left with the
      // same code, right after GuildMemberLeftGuild has already cleared
      // `myGuild` and printed "You have left the guild" (verified live) -
      // only the master, still in the guild, gets the removal line.
      if (Social.myGuild) {
        Social.systemMessage(t('guild.memberRemoved'));
        if (Social.guildWindowEnabled) Social.requestGuildList();
      }
      break;
    case GuildKickResponseGuildKickSuccessEnum.GuildDisband: {
      // `GameServer.GuildDeletedAsync` drops the guild from `_playersByGuild`
      // *before* it walks the members, so `ForEachGuildPlayerAsync` finds
      // nobody and the GuildMemberLeftGuild / KickSucceeded that should
      // follow are never sent (OpenMU, verified 2026-08-31). This response is
      // the whole story: clear the guild here.
      const mine = Social.myGuild;
      if (!mine) break;
      leaveGuild(mine.id, true);
      Social.errorMessage(t('guild.disbanded'));
      break;
    }
    case GuildKickResponseGuildKickSuccessEnum.GuildMemberWithdrawn:
      // `ReceiveGuildLeave` 5: re-read the list.
      Social.requestGuildList();
      break;
    case GuildKickResponseGuildKickSuccessEnum.KickFailedBecausePlayerIsNotGuildMaster:
      Social.errorMessage(t('guild.onlyMasterRemoves'));
      break;
    case GuildKickResponseGuildKickSuccessEnum.FailedPasswordIncorrect:
      Social.errorMessage(t('guild.wrongPassword'));
      break;
    default:
      Social.errorMessage(t('guild.requestFailed'));
      break;
  }
});

EventBus.on('ShowGuildMasterDialog', () => {
  playUiSound('window');
  runInAction(() => {
    Social.guildMasterDialog = true;
  });
});

EventBus.on('ShowGuildCreationDialog', () => {
  playUiSound('window');
  runInAction(() => {
    Social.guildMasterDialog = false;
    Social.guildCreationDialog = true;
    Social.guildCreationPending = false;
  });
});

EventBus.on('GuildCreationResult', packet => {
  const p = new GuildCreationResultPacket(packet);
  runInAction(() => {
    Social.guildCreationPending = false;
  });
  if (p.Success) {
    // `ReceiveCreateGuildResult` 1: the dialog goes; AssignCharacterToGuild
    // brings the new guild in.
    runInAction(() => {
      Social.guildCreationDialog = false;
    });
    Social.systemMessage(t('guild.created'));
    return;
  }
  Social.errorMessage(
    t(
      p.Error === GuildCreationResultGuildCreationErrorTypeEnum.GuildNameAlreadyTaken
        ? 'guild.nameTaken'
        : 'guild.createFailed'
    )
  );
});


// ---- guild war / alliance (`ReceiveGuildWar*`, `ReceiveUnion*`) -------------

/**
 * GuildWarRequest (0x61): another guild master asks for a war. The original
 * puts up `CGuildWar_MsgBoxLayout` (NewUICommonMessageBox.cpp:1418) with the
 * Battle Soccer wording when `Type` is Soccer.
 */
EventBus.on('GuildWarRequest', packet => {
  const p = new GuildWarRequestPacket(packet);
  playUiSound('window');
  runInAction(() => {
    Social.guildWarRequest = {
      guildName: cleanName(p.GuildName),
      soccer: p.Type === GuildWarTypeEnum.Soccer,
    };
  });
});

const GUILD_WAR_RESULTS: Record<GuildWarRequestResultRequestResultEnum, TextKey> = {
  [GuildWarRequestResultRequestResultEnum.GuildNotFound]: 'guild.warNotFound',
  [GuildWarRequestResultRequestResultEnum.RequestSentToGuildMaster]:
    'guild.warRequestSent',
  [GuildWarRequestResultRequestResultEnum.GuildMasterOffline]: 'guild.warMasterOffline',
  [GuildWarRequestResultRequestResultEnum.NotInGuild]: 'guild.warNotInGuild',
  [GuildWarRequestResultRequestResultEnum.Failed]: 'guild.warRequestFailed',
  [GuildWarRequestResultRequestResultEnum.NotTheGuildMaster]: 'guild.warOnlyMaster',
  [GuildWarRequestResultRequestResultEnum.AlreadyInWar]: 'guild.warAlready',
};

EventBus.on('GuildWarRequestResult', packet => {
  const p = new GuildWarRequestResultPacket(packet);
  const text = t(GUILD_WAR_RESULTS[p.Result] ?? 'guild.warRequestFailed');
  if (p.Result === GuildWarRequestResultRequestResultEnum.RequestSentToGuildMaster) {
    Social.systemMessage(text);
  } else {
    Social.errorMessage(text);
  }
});

/** `EnableGuildWar = true` plus `GuildWarName` / `GuildWarTeam`. */
EventBus.on('GuildWarDeclared', packet => {
  const p = new GuildWarDeclaredPacket(packet);
  const enemy = cleanName(p.GuildName);
  runInAction(() => {
    Social.guildWar = {
      enemyGuild: enemy,
      soccer: p.Type === GuildWarTypeEnum.Soccer,
      team: p.TeamCode,
      ownScore: 0,
      enemyScore: 0,
    };
  });
  Social.systemMessage(
    t(p.Type === GuildWarTypeEnum.Soccer ? 'guild.soccerStarted' : 'guild.warStarted', {
      name: enemy,
    })
  );
});

EventBus.on('GuildWarScoreUpdate', packet => {
  const p = new GuildWarScoreUpdatePacket(packet);
  runInAction(() => {
    if (!Social.guildWar) return;
    Social.guildWar.ownScore = p.ScoreOfOwnGuild;
    Social.guildWar.enemyScore = p.ScoreOfEnemyGuild;
  });
});

/**
 * GuildSoccerScoreUpdate (F3 23): at the start of the match and on every
 * goal. Also reaches observers on the stadium, who have no `guildWar`.
 */
EventBus.on('GuildSoccerScoreUpdate', packet => {
  const p = new GuildSoccerScoreUpdatePacket(packet);
  runInAction(() => {
    Social.battleSoccer = {
      redTeam: cleanName(p.RedTeamName),
      blueTeam: cleanName(p.BlueTeamName),
      redGoals: p.RedTeamGoals,
      blueGoals: p.BlueTeamGoals,
      seconds: Social.battleSoccer?.seconds ?? -1,
    };
  });
});

/** GuildSoccerTimeUpdate (F3 22): every second while the match runs. */
EventBus.on('GuildSoccerTimeUpdate', packet => {
  const p = new GuildSoccerTimeUpdatePacket(packet);
  runInAction(() => {
    if (Social.battleSoccer) Social.battleSoccer.seconds = p.Seconds;
  });
});

const GUILD_WAR_ENDINGS: Record<GuildWarEndedGuildWarResultEnum, TextKey> = {
  [GuildWarEndedGuildWarResultEnum.Won]: 'guild.warWon',
  [GuildWarEndedGuildWarResultEnum.Lost]: 'guild.warLost',
  [GuildWarEndedGuildWarResultEnum.CancelledWar]: 'guild.warCancelled',
  [GuildWarEndedGuildWarResultEnum.OtherGuildMasterCancelledWar]:
    'guild.warCancelledByOther',
};

/** `InitGuildWar`: the war state goes and every GuildTeam is recomputed. */
EventBus.on('GuildWarEnded', packet => {
  const p = new GuildWarEndedPacket(packet);
  runInAction(() => {
    Social.guildWar = null;
    Social.battleSoccer = null;
    Social.guildWarRequest = null;
  });
  Social.systemMessage(t(GUILD_WAR_ENDINGS[p.Result] ?? 'guild.warEnded'));
});

/** GuildRelationshipRequest (0xE5): an alliance or hostility offer. */
EventBus.on('GuildRelationshipRequest', packet => {
  const p = new GuildRelationshipRequestPacket(packet);
  const senderId = p.SenderId & 0x7fff;
  playUiSound('window');
  runInAction(() => {
    Social.guildRelationRequest = {
      senderId,
      senderName: playerNameById(senderId),
      relationship: p.RelationshipType,
      join: p.RequestType === GuildRelationshipRequestTypeEnum.Join,
    };
  });
});

/** The failure reasons the original prints (GlobalText 1313 / 1326-1333). */
const RELATIONSHIP_ERRORS: Partial<
  Record<GuildRelationshipChangeResultGuildRelationshipChangeResultTypeEnum, TextKey>
> = {
  [GuildRelationshipChangeResultGuildRelationshipChangeResultTypeEnum.Failed]:
    'guild.relFailed',
  [GuildRelationshipChangeResultGuildRelationshipChangeResultTypeEnum.GuildNotFound]:
    'guild.relNotFound',
  [GuildRelationshipChangeResultGuildRelationshipChangeResultTypeEnum.NoAuthorization]:
    'guild.relNoAuthorization',
  [GuildRelationshipChangeResultGuildRelationshipChangeResultTypeEnum.AlreadyInAlliance]:
    'guild.relAlreadyAlliance',
  [GuildRelationshipChangeResultGuildRelationshipChangeResultTypeEnum.AlreadyInHostility]:
    'guild.relAlreadyHostile',
  [GuildRelationshipChangeResultGuildRelationshipChangeResultTypeEnum.GuildAllianceExists]:
    'guild.relAllianceExists',
  [GuildRelationshipChangeResultGuildRelationshipChangeResultTypeEnum.HostileGuildExists]:
    'guild.relHostileExists',
  [GuildRelationshipChangeResultGuildRelationshipChangeResultTypeEnum.GuildAllianceDoesNotExist]:
    'guild.relNoAlliance',
  [GuildRelationshipChangeResultGuildRelationshipChangeResultTypeEnum.HostileGuildDoesNotExist]:
    'guild.relNoHostility',
  [GuildRelationshipChangeResultGuildRelationshipChangeResultTypeEnum.NotMasterOfGuildAlliance]:
    'guild.relNotAllianceMaster',
  [GuildRelationshipChangeResultGuildRelationshipChangeResultTypeEnum.NotGuildRival]:
    'guild.relNotRival',
  [GuildRelationshipChangeResultGuildRelationshipChangeResultTypeEnum
    .IncompleteRequirementsToCreateAlliance]: 'guild.relIncomplete',
  [GuildRelationshipChangeResultGuildRelationshipChangeResultTypeEnum
    .MaximumNumberOfGuildsInAllianceReached]: 'guild.relAllianceFull',
  [GuildRelationshipChangeResultGuildRelationshipChangeResultTypeEnum.RequestCancelled]:
    'guild.relCancelled',
};

EventBus.on('GuildRelationshipChangeResult', packet => {
  const p = new GuildRelationshipChangeResultPacket(packet);
  const alliance = p.RelationshipType === GuildRelationshipTypeEnum.Alliance;
  const joining = p.RequestType === GuildRelationshipRequestTypeEnum.Join;

  if (
    p.Result ===
    GuildRelationshipChangeResultGuildRelationshipChangeResultTypeEnum.Success
  ) {
    Social.systemMessage(
      t(
        alliance
          ? joining
            ? 'guild.allianceFormed'
            : 'guild.allianceDissolved'
          : joining
            ? 'guild.nowHostile'
            : 'guild.hostilityEnded'
      )
    );
    // The `<Alliance>` line over every head comes out of GuildInformation,
    // and the alliance name in it has just changed for both guilds.
    Store.guilds.clear();
    Social.requestGuildList();
    if (Social.guildTab === 'alliance') Social.requestAllianceList();
    return;
  }

  Social.errorMessage(t(RELATIONSHIP_ERRORS[p.Result] ?? 'guild.requestFailed'));
});

/** `ReceiveUnionList` (WSclient.cpp:7502). */
EventBus.on('AllianceList', packet => {
  const p = new AllianceListPacket(packet);
  runInAction(() => {
    Social.allianceGuilds = p.Success
      ? p.getGuilds().map(g => ({
          name: cleanName(g.GuildName),
          memberCount: g.MemberCount,
          logo: Array.from(new Uint8Array(g.Logo.buffer)),
        }))
      : [];
  });
});

EventBus.on('RemoveAllianceGuildResult', packet => {
  const p = new RemoveAllianceGuildResultPacket(packet);
  if (p.Result) {
    Social.systemMessage(t('guild.allianceRemoved'));
    Store.guilds.clear();
    Social.requestAllianceList();
  } else {
    Social.errorMessage(t('guild.allianceRemoveFailed'));
  }
});


// ---- friends & letters (`ReceiveFriend*` / `ReceiveLetter*`) ----------------

/** The friend `Server` byte: 0xFF is offline, anything else a game server. */
const friendServer = (serverId: number) =>
  serverId === FRIEND_OFFLINE ? -1 : serverId;

/**
 * MessengerInitialization (C2 0xC0): sent right after entering the game with
 * the whole friend list and the size of the letter box. The letters
 * themselves follow one AddLetter at a time.
 */
EventBus.on('MessengerInitialization', packet => {
  const p = new MessengerInitializationPacket(packet);
  Messenger.setFriends(
    p.getFriends().map(f => ({
      name: cleanName(f.Name),
      server: friendServer(f.ServerId),
    }))
  );
  runInAction(() => {
    Messenger.maxLetters = p.MaximumLetterCount;
    Messenger.letters = [];
  });
});

EventBus.on('FriendAdded', packet => {
  const p = new FriendAddedPacket(packet);
  const name = cleanName(p.FriendName);
  Messenger.addFriend(name, friendServer(p.ServerId));
  Social.systemMessage(t('friends.added', { name }));
});

EventBus.on('FriendDeleted', packet => {
  const p = new FriendDeletedPacket(packet);
  Messenger.removeFriend(cleanName(p.FriendName));
});

EventBus.on('FriendOnlineStateUpdate', packet => {
  const p = new FriendOnlineStateUpdatePacket(packet);
  Messenger.setFriendState(cleanName(p.FriendName), friendServer(p.ServerId));
});

/** FriendRequest (0xC2): another player wants to add the hero. */
EventBus.on('FriendRequest', packet => {
  const p = new FriendRequestPacket(packet);
  playUiSound('window');
  runInAction(() => {
    Messenger.friendRequest = { name: cleanName(p.Requester) };
  });
});

/**
 * FriendInvitationResult (C3 0xCB): the answer to ChatRoomInvitationRequest,
 * echoing the RequestId the invite went out with. Anything with an unknown
 * id is kept on the old friend-request path.
 */
EventBus.on('FriendInvitationResult', packet => {
  const p = new FriendInvitationResultPacket(packet);
  if (ChatRooms.inviteResult(p.Success, p.RequestId)) return;
  if (!p.Success) Social.errorMessage(t('friends.requestFailed'));
});

/**
 * ChatRoomConnectionInfo (C3 0xCA): the game server brokered a chat room on
 * the separate chat server and hands over host, room id and token. The
 * packet carries no port; OpenMU's chat server listens on 55980.
 */
EventBus.on('ChatRoomConnectionInfo', packet => {
  const p = new ChatRoomConnectionInfoPacket(packet);
  ChatRooms.onConnectionInfo({
    host: cleanName(p.ChatServerIp),
    roomId: p.ChatRoomId,
    token: p.AuthenticationToken,
    friendName: cleanName(p.FriendName),
    success: p.Success,
  });
});

/** AddLetter (C3 0xC6): one row of the letter box. */
EventBus.on('AddLetter', packet => {
  const p = new AddLetterPacket(packet);
  const isNew = p.State === AddLetterLetterStateEnum.New;
  Messenger.addLetter({
    index: p.LetterIndex,
    sender: cleanName(p.SenderName),
    subject: cleanName(p.Subject),
    timestamp: p.Timestamp.replace(/\0+$/, '').trim(),
    read: p.State === AddLetterLetterStateEnum.Read,
    isNew,
  });
  // `New` means it landed while the hero was online, so it is announced.
  if (isNew) {
    playUiSound('whisper');
    Social.systemMessage(
      t('friends.letterArrived', { name: cleanName(p.SenderName) })
    );
  }
});

/** OpenLetter (C4 0xC7): the body of the letter that was asked for. */
EventBus.on('OpenLetter', packet => {
  const p = new OpenLetterPacket(packet);
  Messenger.setLetterBody(p.LetterIndex, p.Message.replace(/\0+$/, ''));
});

EventBus.on('RemoveLetter', packet => {
  const p = new RemoveLetterPacket(packet);
  if (p.RequestSuccessful) Messenger.removeLetter(p.LetterIndex);
  else Social.errorMessage(t('friends.letterDeleteFailed'));
});

const LETTER_SEND_RESULTS: Record<
  LetterSendResponseLetterSendRequestResultEnum,
  TextKey
> = {
  [LetterSendResponseLetterSendRequestResultEnum.Success]: 'friends.letterSent',
  [LetterSendResponseLetterSendRequestResultEnum.TryAgain]: 'friends.letterTryAgain',
  [LetterSendResponseLetterSendRequestResultEnum.MailboxFull]: 'friends.mailboxFull',
  [LetterSendResponseLetterSendRequestResultEnum.ReceiverNotExists]:
    'friends.noSuchCharacter',
  [LetterSendResponseLetterSendRequestResultEnum.CantSendToYourself]:
    'friends.cannotLetterSelf',
  [LetterSendResponseLetterSendRequestResultEnum.NotEnoughMoney]:
    'friends.letterNeedsZen',
};

EventBus.on('LetterSendResponse', packet => {
  const p = new LetterSendResponsePacket(packet);
  const ok = p.Result === LetterSendResponseLetterSendRequestResultEnum.Success;
  Messenger.sendFinished(ok);
  const text = t(LETTER_SEND_RESULTS[p.Result] ?? 'friends.letterFailed');
  if (ok) Social.systemMessage(text);
  else Social.errorMessage(text);
});

/** A killed monster keeps its corpse pose until it is despawned; late packets must not revive it. */
/** c->Dead > 0: killed (possibly still waiting for the Die clip) or dead. */
function isDeadMonster(obj: Entity): boolean {
  return !!obj.dying || obj.monsterAnimation?.action === MonsterActionType.Die;
}

function markKilled(
  world: World,
  obj: Entity,
  killedByHero: boolean,
  skill: number,
  killerNetId: number
) {
  if (obj.dying) return;
  world.addComponent(obj, 'dying', {
    time: 0,
    started: false,
    rot: 0,
    alpha: 1,
    sink: 0,
    killedByHero,
    skill,
    killerNetId,
    shattered: false,
    offset: { x: 0, y: 0, z: 0 },
    pitch: 0,
  });
}

function stopNetObjectAtTarget(obj: Entity) {
  const { pathfinding, playerMoveTo, movement, transform } = obj;

  const pendingMove = playerMoveTo && !playerMoveTo.handled;
  const walking = pendingMove || (pathfinding?.path?.length ?? 0) > 0;
  if (!walking || !transform) return;

  const targetX = pendingMove ? ~~playerMoveTo.point.x : pathfinding!.to.x;
  const targetY = pendingMove ? ~~playerMoveTo.point.y : pathfinding!.to.y;

  transform.pos.x = targetX;
  transform.pos.z = targetY;
  transform.pos.y = Store.world?.getTerrainHeight(targetX, targetY) ?? 0;

  if (playerMoveTo) playerMoveTo.handled = true;

  if (pathfinding) {
    pathfinding.path = null;
    pathfinding.calculated = true;
    pathfinding.from.x = targetX;
    pathfinding.from.y = targetY;
    pathfinding.to.x = targetX;
    pathfinding.to.y = targetY;
  }

  if (movement) {
    movement.velocity.x = 0;
    movement.velocity.y = 0;
  }
}

EventBus.on('ObjectAnimation', packet => {
  const p = new ObjectAnimationPacket(packet);

  const maskedId = p.ObjectId & 0x7fff;
  const obj = Store.world?.getByNetId(maskedId);

  if (!obj) return;

  let serverActionId = p.Animation as ServerPlayerActionType;
  let clientActionToPlay = serverActionId;
  if (obj.monsterAnimation) {
    clientActionToPlay = ((serverActionId & 0xe0) >> 5) & 0xff;
  }

  console.log(
    `ObjectAnimation: ${maskedId}, action: ${clientActionToPlay}, target: ${p.TargetId}, dir:${p.Direction}`,
    packet
  );

  // The hero is driven locally: AttackSystem / EmoteSystem / RestObjectSystem
  // already play the clip and face the target every frame, and the original
  // client never applies its own viewport animation packets to the Hero.
  // Applying the echo restarted the swing mid-clip (action === CurrentAction
  // is true while swinging) and snapped rot.y to the server's 45°-quantised,
  // often stale, direction.
  if (obj.localPlayer) return;

  if (obj.monsterAnimation) {
    if (isDeadMonster(obj)) return;
    const monsterAction = clientActionToPlay as unknown as MonsterActionType;
    if (
      obj.monsterAnimation.action === monsterAction &&
      obj.modelObject?.CurrentAction === monsterAction
    ) {
      // Same one-shot clip again (e.g. repeated attacks): restart it.
      obj.modelObject.restartAction();
    }
    obj.monsterAnimation.action = monsterAction;
  } else if (obj.playerAnimation) {
    let action = ServerToClientActionMap[clientActionToPlay];
    if (
      clientActionToPlay === ServerPlayerActionType.Attack1 ||
      clientActionToPlay === ServerPlayerActionType.Attack2
    ) {
      action = chooseAttackAction(
        obj.charAppearance,
        clientActionToPlay === ServerPlayerActionType.Attack2
      );
      if (
        obj.playerAnimation.action === action &&
        obj.modelObject?.CurrentAction === action
      ) {
        obj.modelObject.restartAction();
      }
    }
    if (action !== undefined) {
      if (
        action >= PlayerAction.PLAYER_SIT1 &&
        action <= PlayerAction.PLAYER_POSE_FEMALE1
      ) {
        stopNetObjectAtTarget(obj);
      }

      obj.playerAnimation.action = resolveGenderedAction(
        action,
        obj.attributeSystem?.isAboveZero('isFemale') ?? false
      );
    }
  }

  obj.transform.rot.y = convertDirectionToAngle(p.Direction);
});

/**
 * F3 11 carries three shapes behind one sub-code: the full list, and the
 * add/remove notifications flagged by count 0xFE / 0xFF (OpenMU
 * SkillListUpdate / SkillAdded / SkillRemoved). The dispatcher may pick any
 * of the three names for a 10-byte packet, so all route here.
 */
function applySkillListPacket(packet: DataView) {
  const flag = packet.getUint8(4);
  if (flag === 0xfe) {
    const p = new SkillAddedPacket(packet);
    Store.addSkill({ index: p.SkillIndex, number: p.SkillNumber, level: p.SkillLevel });
  } else if (flag === 0xff) {
    const p = new SkillRemovedPacket(packet);
    Store.removeSkill(p.SkillNumber);
  } else {
    const p = new SkillListUpdatePacket(packet);
    Store.setSkillList(
      p.getSkills().map(s => ({
        index: s.SkillIndex,
        number: s.SkillNumber,
        level: s.SkillLevel,
      }))
    );
  }
}

/** Cast clip for an object in scope (SetPlayerMagic / monster Attack1). */
function playCastAnimation(caster: Entity, skill: number) {
  const def = skillDefinition(skill);
  // ExecuteSkill's cast sound for everyone else (the hero's plays in SkillCastSystem).
  if (!caster.localPlayer && caster.transform) {
    const sfx = skillSound(skill);
    if (sfx) playSfx(sfx, caster.transform.pos);
  }
  if (caster.playerAnimation) {
    if (caster.localPlayer) return; // SkillCastSystem already started the clip
    const cls =
      caster.charAppearance?.charClass ??
      (caster.attributeSystem?.getValue('playerNetClass') as CharacterClassNumber);
    // The same context the hero's cast builds: mount (none in a safe zone),
    // IsFemale(Class), the active world, and the coin toss for the male
    // hand cast — everyone in scope plays the same clip for the same skill.
    const ctx = {
      mount: mountKind(
        caster.charAppearance?.pet,
        !!caster.attributeSystem?.isAboveZero('inSafeZone')
      ),
      isFemale: isFemaleClass(cls),
      world: Store.world?.mapIndex,
      alternate: Math.random() < 0.5,
    };
    const action = def
      ? chooseSkillAction(def, caster.charAppearance, ctx)
      : PlayerAction.PLAYER_SKILL_HAND1;
    if (caster.playerAnimation.action === action) caster.modelObject?.restartAction();
    caster.playerAnimation.action = action;
    if (caster.pathfinding) caster.pathfinding.path = null;
  } else if (caster.monsterAnimation && !isDeadMonster(caster)) {
    caster.monsterAnimation.action = MonsterActionType.Attack1;
  }
}

EventBus.on('SkillAnimation', packet => {
  const p = new SkillAnimationPacket(packet);
  const world = Store.world;
  if (!world) return;
  const casterId = p.PlayerId & 0x7fff;
  const targetId = p.TargetId & 0x7fff;
  const caster = world.getByNetId(casterId);
  if (!caster) return;
  const target = world.getByNetId(targetId) ?? null;

  if (target && target !== caster && !caster.localPlayer) {
    const dx = target.transform.pos.x - caster.transform.pos.x;
    const dz = target.transform.pos.z - caster.transform.pos.z;
    if (dx * dx + dz * dz > 0.01) {
      caster.transform.rot.y = Math.atan2(dz, dx) + Math.PI / 2;
    }
  }
  playCastAnimation(caster, p.SkillId);
  // AT_SKILL_COMBO: the server announces a landed DK combo (ReceiveMagic, WSclient.cpp:4436).
  if (combat.observeSkillAnimation(p.SkillId, target?.netId)) {
    playSfx(COMBO_SOUND, caster.transform.pos);
  }
  playTargetedSkillVisual(world.scene, p.SkillId, caster, target);
});

EventBus.on('AreaSkillAnimation', packet => {
  const p = new AreaSkillAnimationPacket(packet);
  const world = Store.world;
  if (!world) return;
  const casterId = p.PlayerId & 0x7fff;
  const caster = world.getByNetId(casterId);
  if (!caster) return;

  if (!caster.localPlayer) {
    // Rotation byte: Angle / 360 * 256 of the caster's yaw.
    caster.transform.rot.y = (p.Rotation / 256) * Math.PI * 2;
  }
  playCastAnimation(caster, p.SkillId);
  playAreaSkillVisual(
    world.scene,
    p.SkillId,
    caster,
    { x: p.PointX, y: p.PointY },
    (x, y) => world.getTerrainHeight(x, y),
    objectOnTile(world, caster, p.PointX, p.PointY)
  );
});

/** The object (not `except`) standing nearest to tile (x, y), within a tile of it. */
function objectOnTile(world: World, except: Entity, x: number, y: number): Entity | null {
  let best: Entity | null = null;
  let bestD = 1.5 * 1.5;
  for (const e of world.netObjsQuery.entities) {
    if (e === except || !e.transform || e.dying) continue;
    const dx = e.transform.pos.x - x;
    const dz = e.transform.pos.z - y;
    const d = dx * dx + dz * dz;
    if (d < bestD) {
      bestD = d;
      best = e;
    }
  }
  return best;
}

function setObjectEffect(objectId: number, effectId: number, active: boolean) {
  const world = Store.world;
  if (!world) return;
  const maskedId = objectId & 0x7fff;
  if (maskedId === Store.playerId) Store.setBuff(effectId, active);
  const obj = world.getByNetId(maskedId);
  if (!obj) return;
  if (!obj.buffs) world.addComponent(obj, 'buffs', new Set<number>());
  if (active) obj.buffs!.add(effectId);
  else obj.buffs!.delete(effectId);
  // The persistent look of the buff (Soul Barrier bubble, elf orbits) — effects layer consumer.
  setBuffVisual(world.scene, obj, effectId, active);
}

EventBus.on('MagicEffectStatus', packet => {
  const p = new MagicEffectStatusPacket(packet);
  setObjectEffect(p.PlayerId, p.EffectId, p.IsActive);
});

EventBus.on('MagicEffectCancelled', packet => {
  const p = new MagicEffectCancelledPacket(packet);
  const effect = SKILL_TO_EFFECT[p.SkillId];
  if (effect !== undefined) setObjectEffect(p.TargetId, effect, false);
});

EventBus.on('SkillListUpdate', applySkillListPacket);
EventBus.on('SkillAdded', applySkillListPacket);
EventBus.on('SkillRemoved', applySkillListPacket);

EventBus.on('ObjectGotKilled', packet => {
  const p = new ObjectGotKilledPacket(packet);

  const world = Store.world;
  if (!world) return;

  const killedId = p.KilledId & 0x7fff;
  const obj = world.getByNetId(killedId);

  if (!obj) {
    if (killedId === Store.playerId) {
      runInAction(() => {
        Store.playerData.currentHP = 0;
      });
      const playerEntity = world.playerEntity;
      if (playerEntity) {
        playerEntity.attributeSystem.setValue('currentHealth', 0);
        playerEntity.playerAnimation.action = PlayerAction.PLAYER_DIE1;
      }
    }
    return;
  }

  if (obj.pathfinding) obj.pathfinding.path = null;
  if (obj.movement) {
    obj.movement.velocity.x = 0;
    obj.movement.velocity.y = 0;
  }
  if (world.attackTarget === obj) {
    world.attackTarget = null;
  }
  obj.attributeSystem?.setValue('currentHealth', 0);

  if (obj.localPlayer) {
    runInAction(() => {
      Store.playerData.currentHP = 0;
    });
  }
  if (world.currentPointerTarget === obj) {
    world.currentPointerTarget = null;
  }

  // Dead = 1; the Die clip itself starts in DeathSystem (at once, or when
  // the hero's killing swing connects — WSclient.cpp:5362-5384).
  const killerId = p.KillerId & 0x7fff;
  markKilled(world, obj, killerId === Store.playerId, p.SkillId, killerId);
});

type ObjectHitView = Pick<
  ObjectHitPacket,
  | 'ObjectId'
  | 'HealthDamage'
  | 'ShieldDamage'
  | 'Kind'
  | 'IsDoubleDamage'
  | 'IsTripleDamage'
  | 'IsRageFighterStreakHit'
  | 'IsRageFighterStreakFinalHit'
>;

/** Bytes before the target list of RageAttackRangeResponse (C1 header 3 + skill 2 + count 1). */
const RAGE_RANGE_TARGETS_OFFSET = 6;

/** Dark Side (0x4B): the targets the server chose for the follow-up blows. */
EventBus.on('RageAttackRangeResponse', packet => {
  const p = new RageAttackRangeResponsePacket(packet);
  const count = Math.floor((p.buffer.byteLength - RAGE_RANGE_TARGETS_OFFSET) / 2);
  combat.observeDarkSideTargets(
    p.SkillId,
    p.getTargets(count).map(t => t.TargetId & 0x7fff)
  );
});

function applyObjectHit(p: ObjectHitView) {
  const world = Store.world;
  if (!world) return;

  const maskedId = p.ObjectId & 0x7fff;
  const obj = world.getByNetId(maskedId);
  if (!obj) return;

  const totalDamage = p.HealthDamage + p.ShieldDamage;
  combat.observeRageHit(p.IsRageFighterStreakHit, p.IsRageFighterStreakFinalHit);

  // AttackEffect (ZzzCharacter.cpp:5176-5190): a landed blow clinks; the
  // hero's bow/crossbow hits use the missile set.
  if (totalDamage > 0) {
    const hero = world.playerEntity;
    const missile =
      world.attackTarget === obj && !!hero && usesMissileWeapon(hero.charAppearance);
    playSfx(hitSound(missile), obj.transform.pos);
  }

  if (!obj.localPlayer && obj.attributeSystem?.hasAttribute('currentHealth')) {
    const hp = obj.attributeSystem.getValue('currentHealth');
    obj.attributeSystem.setValue(
      'currentHealth',
      Math.max(0, hp - p.HealthDamage)
    );
  }

  // SetPlayerShock (ZzzCharacter.cpp:1283-1310): `Hit` is the health damage;
  // nothing flinches once dead, a rider never does, a player finishing one
  // of the SHOCK_IMMUNE_CLIPS is not interrupted — every other clip is.
  if (
    obj.playerAnimation &&
    p.HealthDamage > 0 &&
    !obj.dying &&
    !isRidingMount(obj.charAppearance?.pet) &&
    !SHOCK_IMMUNE_CLIPS.has(obj.playerAnimation.action)
  ) {
    const anim = obj.playerAnimation;
    if (anim.action !== PlayerAction.PLAYER_DIE1) {
      if (
        anim.action === PlayerAction.PLAYER_SHOCK &&
        obj.modelObject?.CurrentAction === PlayerAction.PLAYER_SHOCK
      ) {
        obj.modelObject.restartAction();
      }
      anim.action = PlayerAction.PLAYER_SHOCK;
      if (obj.pathfinding) obj.pathfinding.path = null; // c->Movement = false
    }
  }

  if (obj.monsterAnimation && totalDamage > 0 && !obj.dying) {
    const anim = obj.monsterAnimation;
    const swinging =
      anim.action === MonsterActionType.Attack1 ||
      anim.action === MonsterActionType.Attack2;
    if (anim.action !== MonsterActionType.Die && !swinging) {
      if (
        anim.action === MonsterActionType.Shock &&
        obj.modelObject?.CurrentAction === MonsterActionType.Shock
      ) {
        // Hit again mid-flinch: restart the clip so every hit reads.
        obj.modelObject.restartAction();
      }
      // One-shot: AnimationSystem returns the monster to Stop1 when the clip ends.
      anim.action = MonsterActionType.Shock;
    }
  }

  if (obj.screenPosition) {
    EventBus.emit('objectDamaged', {
      entity: obj as any,
      healthDamage: p.HealthDamage,
      shieldDamage: p.ShieldDamage,
      kind: p.Kind,
      isDouble: p.IsDoubleDamage,
      isTriple: p.IsTripleDamage,
    });
  }
}

EventBus.on('ObjectHit', packet => applyObjectHit(new ObjectHitPacket(packet)));
// Extended plug-in variant (damage > 65535, health/shield status percentages).
EventBus.on('ObjectHitExtended', packet =>
  applyObjectHit(new ObjectHitExtendedPacket(packet))
);

/** MoneyDropped (0x20) / MoneyDroppedExtended (0x2F): a zen pile on the ground. */
function spawnMoneyDrop(id: number, x: number, y: number, fresh: boolean | Boolean) {
  const world = Store.world;
  if (!world) return;
  const maskedId = id & 0x7fff;
  removeNetObject(world, maskedId);
  const itemConfig = ItemsDatabase.getItem(ZEN_GROUP, ZEN_NUM);
  const rot = itemRestRotation(ZEN_GROUP, ZEN_NUM);
  world.add({
    netId: maskedId,
    worldIndex: world.mapIndex,
    transform: {
      pos: new Vector3(
        x,
        world.getTerrainHeight(x, y) + itemRestHeight(ZEN_GROUP),
        y
      ),
      rot: new Vector3(rot.x, rot.y, rot.z),
      scale: 1,
    },
    modelFactory: ModelObject,
    modelFilePath: itemConfig.szModelFolder + itemConfig.szModelName,
    visibility: { state: 'hidden', lastChecked: 0 },
    attributeSystem: createAttributeSystem(),
    interactable: true,
    screenPosition: { worldOffsetZ: DROP_LABEL_HEIGHT, x: 0, y: 0 },
    droppedItem: {
      isMoney: true,
      fresh: !!fresh,
      group: ZEN_GROUP,
      num: ZEN_NUM,
    },
    objectNameInWorld: 'Zen',
  });
}

EventBus.on('MoneyDropped', packet => {
  // Same bytes as a one-item ItemsDropped (the dispatcher chose this class by
  // length alone), and that item is not always zen: let the item path decide.
  applyItemsDropped(new ItemsDroppedPacket(packet));
});
EventBus.on('MoneyDroppedExtended', packet => {
  const p = new MoneyDroppedExtendedPacket(packet);
  if (p.IsFreshDrop) {
    playSfx('Sound/pDropMoney', { x: p.PositionX, z: p.PositionY });
  }
  spawnMoneyDrop(p.Id, p.PositionX, p.PositionY, p.IsFreshDrop);
});

/** The "rain, intensity 0" value is logged once per session, not per packet. */
let weatherZeroReported = false;

EventBus.on('WeatherStatusUpdate', packet => {
  const p = new WeatherStatusUpdatePacket(packet);
  const weather = p.Weather;
  const variation = p.Variation;

  // The packet is the only thing that can start rain anywhere but Icarus, and
  // nothing in the client reports when it does not arrive — so a weather
  // change is worth one line. Only on change: the proxy heartbeats.
  if (
    weather !== Store.weather.weather ||
    variation !== Store.weather.variation
  ) {
    if (weather === WEATHER_RAIN && variation === 0) {
      // `RainTarget = (Value & 15) * 6` is zero: the original client simply
      // shows no rain for this value. The proxy never emits it, but OpenMU
      // itself does (kind 1 / variation 0 on map entry), several times a
      // session — treated as clear, said once.
      if (!weatherZeroReported) {
        weatherZeroReported = true;
        console.debug('[weather] rain with intensity 0 received — treated as clear');
      }
    } else {
      console.log(
        `[weather] ${weather === WEATHER_RAIN ? `rain ${variation}/15` : `clear (kind ${weather})`}`
      );
    }
  }

  runInAction(() => {
    Store.weather = { weather, variation };
  });
});

EventBus.on('HeroStateChanged', packet => {
  const p = new HeroStateChangedPacket(packet);
  const world = Store.world;
  if (!world) return;
  const maskedId = p.PlayerId & 0x7fff;
  const obj = world.getByNetId(maskedId);
  if (!obj) return;
  obj.heroState = p.NewState;
  if (obj.localPlayer) Store.playerData.heroState = p.NewState;
  // `ReceivePK` (WSclient.cpp:6609): the change is announced in the log.
  const msg = obj.objectNameInWorld
    ? heroStateMessage(obj.objectNameInWorld, p.NewState)
    : null;
  if (msg) {
    if (msg.error) Social.errorMessage(msg.text);
    else Social.systemMessage(msg.text);
  }
});

EventBus.on('ObjectMessage', packet => {
  const p = new ObjectMessagePacket(packet);
  EventBus.emit('objectMessage', { netId: p.ObjectId & 0x7fff, message: p.Message });
});

// F3/0x40 (length 7) is shared by PlayFanfareSound (EffectType 2), ShowSwirl
// (58), ShowFireworks (0), ShowChristmasFireworks (59) and ServerCommand; the
// dispatcher can only pick one of them by header, so route on byte 4 here.
EventBus.on('PlayFanfareSound', packet => {
  const effectType = packet.getUint8(4);
  switch (effectType) {
    case 58: {
      const swirl = new ShowSwirlPacket(packet);
      emitObjectEffect(swirl.TargetObjectId & 0x7fff, 'swirl');
      return;
    }
    case 2: {
      const p = new PlayFanfareSoundPacket(packet);
      EventBus.emit('fanfare', { effectType: p.EffectType, x: p.X, y: p.Y });
      return;
    }
    case 0: {
      const p = new ShowFireworksPacket(packet);
      spawnFireworksAt(p.X, p.Y, false);
      return;
    }
    case 59: {
      const p = new ShowChristmasFireworksPacket(packet);
      spawnFireworksAt(p.X, p.Y, true);
      return;
    }
    default: {
      // The other command types open GlobalText message boxes the client has
      // no texts for (ReceiveServerCommand, WSclient.cpp:7744).
      const p = new ServerCommandPacket(packet);
      console.warn(
        `unhandled ServerCommand ${p.CommandType} (${p.Parameter1}, ${p.Parameter2})`
      );
      return;
    }
  }
});

/** ShowFireworks / ShowChristmasFireworks: the burst at the given tile. */
function spawnFireworksAt(x: number, y: number, christmas: boolean) {
  const world = Store.world;
  if (!world) return;
  const at = new Vector3(x, world.getTerrainHeight(x, y), y);
  spawnFireworks(world.scene, at, christmas);
}

// ReceivePlaySoundEffect (WSclient.cpp:9680-9697): 0 ready / 1 start / 2 end.
const FANFARE_SOUNDS = [
  'Sound/iEvent3min',
  'Sound/iEventStart',
  'Sound/iEventEnd',
] as const;
EventBus.on('fanfare', ({ effectType }) => {
  const sfx = FANFARE_SOUNDS[effectType];
  if (sfx) playSfx(sfx);
});

function handleRespawnAfterDeath(packet: DataView) {
  const isExtended = packet.byteLength >= RespawnAfterDeathExtendedPacket.Length;
  const isS6 = packet.byteLength >= RespawnAfterDeathPacket.Length;
  const is095 = packet.byteLength >= RespawnAfterDeath095Packet.Length;
  const p = isExtended
    ? new RespawnAfterDeathExtendedPacket(packet)
    : isS6
      ? new RespawnAfterDeathPacket(packet)
      : is095
        ? new RespawnAfterDeath095Packet(packet)
        : new RespawnAfterDeath075Packet(packet);

  const pos = { x: p.PositionX, y: p.PositionY };

  runInAction(() => {
    Store.playerData.currentHP = p.CurrentHealth;
    Store.playerData.currentMP = p.CurrentMana;
    if (!(p instanceof RespawnAfterDeath075Packet)) {
      Store.playerData.currentAG = p.CurrentAbility;
    }
    if (!(p instanceof RespawnAfterDeath075Packet) && !(p instanceof RespawnAfterDeath095Packet)) {
      Store.playerData.currentSD = p.CurrentShield;
    }
    Store.playerData.money = p.Money;
    // The generated reader hands back a BigInt (S6 / Extended: 8 bytes big-endian at offset 16,
    // matching OpenMU's `RespawnAfterDeath` struct) or a uint32 (0.75 / 0.95); the store (and
    // `expPercent`) work in Number. OpenMU fills the field from `Character.Experience`, which is
    // 0 for a character lifted to the cap by hand (`/level`, admin panel) and for a master-class
    // hero on `MasterExperience`; a zero here never means "you lost everything", so the last
    // known value is kept - `CharacterInformation` / `ExperienceGained` remain the source of truth.
    const exp = Number(p.Experience ?? 0);
    if (exp > 0) Store.playerData.exp = exp;
  });

  const world = Store.world;
  const playerEntity = world?.playerEntity;
  if (playerEntity) {
    playerEntity.attributeSystem.setValue('currentHealth', p.CurrentHealth);
    playerEntity.attributeSystem.setValue('currentMana', p.CurrentMana);
    playerEntity.playerAnimation.action = PlayerAction.PLAYER_STOP_MALE;
    if (playerEntity.dying) {
      world!.removeComponent(playerEntity, 'dying');
      playerEntity.modelObject?.setAlpha(1);
    }
  }

  if (!world || world.mapIndex !== p.MapNumber) {
    EventBus.emit('requestWarp', { map: p.MapNumber, pos });
    return;
  }

  if (!playerEntity) return;

  const playerPos = playerEntity.transform.pos;
  playerPos.x = pos.x;
  playerPos.z = pos.y;
  playerPos.y = world.getTerrainHeight(pos.x, pos.y);
  playerEntity.transform.rot.y = convertDirectionToAngle(p.Direction);

  // Whatever the hero was doing when it died is over: a pending approach walk
  // or attack target would otherwise drag the client hero back to the death
  // tile with no WalkRequest (seen once live: 46-tile resync).
  playerEntity.playerMoveTo.handled = true;
  if (playerEntity.movement) {
    playerEntity.movement.velocity.x = 0;
    playerEntity.movement.velocity.y = 0;
  }
  world.attackTarget = null;
  world.talkTarget = null;
  world.pickupTarget = null;

  const { pathfinding } = playerEntity;
  pathfinding.path = null;
  pathfinding.from = { x: pos.x, y: pos.y };
  pathfinding.to = { x: pos.x, y: pos.y };
}

// OpenMU Season 6 sends the 28-byte `RespawnAfterDeath` (0xF3/0x04); 075/095
// are the old-client layouts and `Extended` (36 bytes) is client >= 106.3.
// The dispatcher tells them apart by sub-code + length.
EventBus.on('RespawnAfterDeath', handleRespawnAfterDeath);
EventBus.on('RespawnAfterDeathExtended', handleRespawnAfterDeath);
EventBus.on('RespawnAfterDeath075', handleRespawnAfterDeath);
EventBus.on('RespawnAfterDeath095', handleRespawnAfterDeath);

EventBus.on('PoisonDamage', packet => {
  const p = new PoisonDamagePacket(packet);

  runInAction(() => {
    Store.playerData.currentHP = Math.max(
      0,
      Store.playerData.currentHP - p.HealthDamage
    );
    Store.playerData.currentSD = p.CurrentShield;
  });

  const playerEntity = Store.world?.playerEntity;
  if (playerEntity) {
    playerEntity.attributeSystem.setValue(
      'currentHealth',
      Store.playerData.currentHP
    );
  }
});

/**
 * ItemsDropped (0x20): items and zen piles coming into view or just landing.
 * A zen pile (and a single-item drop) is 21 bytes, the same wire shape as
 * MoneyDropped, which the dispatcher picks by length — so both handlers end
 * up here.
 */
function applyItemsDropped(p: ItemsDroppedPacket) {
  const world = Store.world;

  if (!world) return;

  console.log(`ItemsDropped: ${p.ItemCount} items dropped`, p);

  p.getItems(p.ItemCount).forEach(item => {
    const maskedId = item.Id & 0x7fff;
    console.log(item);
    const data = item.ItemData;

    const id = data.getUint8(0);
    const group = data.getUint8(5) >> 4;

    const isMoney = data.byteLength >= 6 && id === 15 && group === 14;

    const itemConfig = ItemsDatabase.getItem(group, id);

    console.log(itemConfig);

    let amount = 0;

    if (isMoney) {
      amount =
        (data.getUint8(1) << 16) | (data.getUint8(2) << 8) | data.getUint8(4);

      console.log(`Dropped Money: Amount=${amount}, ID=${maskedId}`);
} else {
      console.log(`Dropped Item: DataLen=${data.byteLength}, ID=${maskedId}`);
}

    const parsed = isMoney
      ? undefined
      : ItemSerializer.DeserializeItem(
          new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
        );

    // CreateItem / CreateMoneyDrop (ZzzObject.cpp:5997-6002 / :6198): a fresh
    // drop lands with a thud, zen jingles, jewels ring.
    if (item.IsFreshDrop) {
      playSfx(dropSound(isMoney, parsed), { x: item.PositionX, z: item.PositionY });
    }

    removeNetObject(world, maskedId);
    // CreateItem's per-level model swap (common/dropModelProxy.ts): the
    // shown model and its pose may come from another item's row.
    const proxy = parsed ? dropModelProxy(group, id, parsed.lvl ?? 0) : null;
    const poseGroup = proxy?.group ?? group;
    const poseNum = proxy?.num ?? id;
    // ItemAngle (common/itemAngle.ts): the resting pose and height for this
    // item's class — armour face-down, a sword leaning back, everything 30 cm
    // (a weapon 70) off the terrain.
    const rot = itemRestRotation(poseGroup, poseNum);
    world.add({
      netId: maskedId,
      worldIndex: world.mapIndex,
      transform: {
        pos: new Vector3(
          item.PositionX,
          world.getTerrainHeight(item.PositionX, item.PositionY) +
            itemRestHeight(poseGroup),
          item.PositionY
        ),
        rot: new Vector3(rot.x, rot.y, rot.z),
        scale: itemRestPose(poseGroup, poseNum).scale,
      },
      modelFactory: ModelObject,
      modelFilePath:
        proxy?.modelFilePath ?? itemConfig.szModelFolder + itemConfig.szModelName,
      visibility: {
        state: 'hidden',
        lastChecked: 0,
      },
      attributeSystem: createAttributeSystem(),
      interactable: true,
      screenPosition: { worldOffsetZ: DROP_LABEL_HEIGHT, x: 0, y: 0 },
      droppedItem: {
        isMoney,
        item: parsed,
        fresh: !!item.IsFreshDrop,
        group: poseGroup,
        num: poseNum,
      },
      objectNameInWorld: dropName(isMoney, amount, itemConfig.ItemName, parsed),
    });
  });
}

/** Label anchor above a drop lying on the ground (RenderItemName: ScreenY - 15). */
const DROP_LABEL_HEIGHT = 0.6;

/** `ITEM_ZEN` (`ITEM_GROUP_POTION`, index 15): the zen pile's own item id. */
const ZEN_GROUP = ItemGroup.Potion;
const ZEN_NUM = 15;

/** RenderItemName (ZzzInventory.cpp:6714): "Zen 1234", "Short Sword +4". */
function dropName(
  isMoney: boolean,
  amount: number,
  baseName: unknown,
  item: Item | undefined
): string {
  if (isMoney) return amount > 0 ? `Zen ${amount}` : 'Zen';
  const name = String(baseName);
  const lvl = item?.lvl ?? 0;
  return lvl > 0 ? `${name} +${lvl}` : name;
}

function dropSound(isMoney: boolean, item: Item | undefined): Sounds {
  if (isMoney || !item) return 'Sound/pDropMoney';
  const kind = pickupSound(item);
  return kind === 'getItem' ? 'Sound/pDropItem' : UI_SOUND_KEYS[kind];
}

EventBus.on('ItemsDropped', packet => {
  applyItemsDropped(new ItemsDroppedPacket(packet));
});

EventBus.on('ItemDropRemoved', packet => {
  const world = Store.world;
  if (!world) return;

  const p = new ItemDropRemovedPacket(packet);
  p.getItemData(p.ItemCount).forEach(item => {
    const maskedId = item.Id & 0x7fff;
    const itemEntity = world.getByNetId(maskedId);
    if (itemEntity) {
      world.addComponent(itemEntity, 'objOutOfScope', true);
      console.log(`Removed item entity with netId: ${maskedId}`);
    } else {
      console.warn(`Item entity with netId ${maskedId} not found.`);
    }
  });
});

EventBus.on('ServerMessage', packet => {
  const p = new ServerMessagePacket(packet);
  // The text is server-built; only its packet padding is ours to strip -
  // plus OpenMU's nine-zero prefix (`ShowMessagePlugIn.cs`: "000000000" +
  // message for every Season > 0 client), which the original client skips.
  const text = cleanName(p.Message).replace(/^0{9}/, '');

  // `ReceiveNotice` (WSclient.cpp:1605): 0 = golden notice banner, 1 = the
  // system log line, 2 = guild notice (banner in green + the guild window).
  // 10..15 are the slide-help marquee, which has no window here yet.
  switch (p.Type) {
    case 0:
      Notices.create(text);
      break;
    case 1:
      // OpenMU's only self-defense signal is this blue line
      // (SelfDefensePlugIn.cs); keep the state alongside showing it.
      Social.trackSelfDefense(text);
      Social.systemMessage(text);
      break;
    case 2:
      Notices.createGuildNotice(text);
      Social.systemMessage(text);
      break;
    default:
      if (p.Type >= 10 && p.Type <= 15) {
        // `PRECEIVE_NOTICE` (WSclient.h:471): for the slide types the
        // message is preceded by Count (BYTE), Delay (WORD seconds), Color
        // (DWORD, R + G<<8 + B<<16 + A<<24) and Speed (BYTE, tenths).
        const b = p.buffer;
        const count = b.getUint8(4);
        const delay = b.getUint16(5, true);
        const color = b.getUint32(7, true);
        const speed = b.getUint8(11);
        let end = 12;
        while (end < b.byteLength && b.getUint8(end) !== 0) end++;
        const slideText = new TextDecoder('utf-8').decode(
          new Uint8Array(b.buffer, b.byteOffset + 12, end - 12)
        );
        SlideHelp.add(count, delay, slideText, p.Type - 10, speed / 10, color);
        break;
      }
      console.log(`ServerMessage type ${p.Type}: ${text}`);
      Social.systemMessage(text);
      break;
  }
});

// Chat, party, guild and messenger state belong to the character: clear on
// select. MessengerInitialization arrives right after and refills the lists.
// (Folded into `applyCharacterInformation`, so each packet has exactly one
// handler and the order between them is not import luck.)

const KNOWN_STORAGES: number[] = [
  StorageKind.Inventory,
  StorageKind.Trade,
  StorageKind.Vault,
  StorageKind.ChaosMachine,
  StorageKind.PersonalShop,
];

/**
 * `ReceiveInventoryItemMove`: the server says where the item ended up, and
 * only then is it painted. `TargetStorageType` picks the grid - the same
 * packet lands an item in the inventory, the vault, the trade tray, the
 * chaos machine or the personal shop.
 */
EventBus.on('ItemMoved', packet => {
  const p = new ItemMovedPacket(packet);

  // The Chaos Card Master's tray is the same local grid as the chaos
  // machine; only the wire byte differs (itemStorage.ts).
  const storage = (
    p.TargetStorageType === CHAOS_CARD_WIRE_STORAGE
      ? StorageKind.ChaosMachine
      : p.TargetStorageType
  ) as StorageKind;

  if (!KNOWN_STORAGES.includes(storage)) {
    console.warn(`ItemMoved into unknown storage ${storage}`);
    Store.confirmItemMove(-1, null);
    return;
  }

  const item = ItemSerializer.DeserializeItem(new Uint8Array(p.ItemData.buffer));

  console.log(`ItemMoved -> storage ${storage} slot ${p.TargetSlot}`, item);

  // OpenMU keeps the personal store inside the inventory storage and its
  // ItemMovedPlugIn (RemoteView/Inventory/ItemMovedPlugIn.cs:43) rewrites
  // `PlayerShop` to `Inventory` before sending, so a move into the stall
  // comes back as storage 0, slot `FirstStoreItemSlotIndex + square`
  // (verified live: request ToStorage 4 / ToSlot 204 → `24 00 cc`).
  const shopStorage = storeStorageOf(storage, p.TargetSlot);
  const slot = localIndexOf(shopStorage, p.TargetSlot);

  Store.confirmItemMove(slot, item, shopStorage);

  // A newly stocked shop square starts unpriced (`AddPersonalItemPrice`).
  if (shopStorage === StorageKind.PersonalShop) Economy.stockedShopSquare(slot);
});

/**
 * An inventory-storage slot at or past `FirstStoreItemSlotIndex` is a
 * personal-shop square on OpenMU's wire, whatever storage byte came with it.
 */
function storeStorageOf(storage: StorageKind, wireSlot: number): StorageKind {
  return storage === StorageKind.Inventory &&
    wireSlot >= InventoryConstants.FirstStoreItemSlotIndex
    ? StorageKind.PersonalShop
    : storage;
}

EventBus.on('ItemMoveRequestFailed', () => {
  console.warn('ItemMoveRequestFailed - rolling the item back');
  Store.rollbackItemMove();
  Store.addNotification(t('notify.cannotMoveItem'), 'error');
});

EventBus.on('ItemAddedToInventory', packet => {
  const p = new ItemAddedToInventoryPacket(packet);

  const item = ItemSerializer.DeserializeItem(new Uint8Array(p.ItemData.buffer));

  // ReceiveItemPickUp (WSclient.cpp:5727-5734) / buy / trade: the pickup clink.
  playUiSound(pickupSound(item));

  runInAction(() => {
    Store.playerData.items[p.InventorySlot] = item;
  });

  Store.syncPlayerAppearance();
});

EventBus.on('ItemRemoved', packet => {
  const p = new ItemRemovedPacket(packet);

  runInAction(() => {
    Store.playerData.items[p.InventorySlot] = null;
  });

  Store.syncPlayerAppearance();
});

/**
 * A jewel was applied (OpenMU `ItemUpgradedPlugIn`): the item at the slot is
 * replaced by the serialised result. The jewel stack itself arrives as
 * `ItemDurabilityChanged` (one less) or `ItemRemoved` (last one), handled
 * above.
 */
EventBus.on('InventoryItemUpgraded', packet => {
  const p = new InventoryItemUpgradedPacket(packet);

  const item = ItemSerializer.DeserializeItem(new Uint8Array(p.ItemData.buffer));

  console.log(`InventoryItemUpgraded slot ${p.InventorySlot}`, item);

  Store.upgradeInventoryItem(p.InventorySlot, item);
});

/**
 * 0x26 0xFD: the use was refused; nothing in the inventory changed. One red
 * system-log line per refusal (`Social` drops an identical line within a
 * second, so a burst of clicks reads as one).
 */
EventBus.on('ItemConsumptionFailed', () => {
  Store.consumptionFailed();
  Store.addNotification(t('notify.cannotUseItem'), 'error');
});

EventBus.on('ItemDurabilityChanged', packet => {
  const p = new ItemDurabilityChangedPacket(packet);

  runInAction(() => {
    const item = Store.playerData.items[p.InventorySlot];
    if (!item) return;

    item.durability = p.Durability;

    if (item.raw && item.raw.length > 2) item.raw[2] = p.Durability;
  });
});

// --- NPC shop (ReceiveTalk / ReceiveShopItemList, WSclient.cpp) ---------------

EventBus.on('NpcWindowResponse', packet => {
  const p = new NpcWindowResponsePacket(packet);

  switch (p.Window) {
    case NpcWindowResponseNpcWindowEnum.Merchant:
    case NpcWindowResponseNpcWindowEnum.Merchant1:
      Store.openNpcShop();
      break;
    case NpcWindowResponseNpcWindowEnum.VaultStorage:
      Store.dropNpcTalk();
      Economy.openVault();
      break;
    case NpcWindowResponseNpcWindowEnum.ChaosMachine:
      Store.dropNpcTalk();
      Economy.openMix();
      break;
    case NpcWindowResponseNpcWindowEnum.ChaosCardCombination:
      Store.dropNpcTalk();
      Economy.openMix('chaosCard');
      break;
    case NpcWindowResponseNpcWindowEnum.DevilSquare:
      Store.dropNpcTalk();
      events.openDevilSquare();
      break;
    case NpcWindowResponseNpcWindowEnum.BloodCastle:
      Store.dropNpcTalk();
      events.openBloodCastle();
      break;
    case NpcWindowResponseNpcWindowEnum.DoorkeeperTitusDuelWatch:
      Store.dropNpcTalk();
      events.openDuelWatch();
      break;
    case NpcWindowResponseNpcWindowEnum.LugardDoppelgangerEntry:
      Store.dropNpcTalk();
      events.openDoppelganger();
      break;
    default:
      // A legacy quest NPC (Sebina, Marlon, Apostle Devin…): the dialog is
      // client-side, from Quest_eng.bmd (quests/legacyQuests.ts).
      if (quests.openNpcWindow(p.Window, Store.pendingNpcType)) break;
      // Lahap, the refineries…: not ported yet.
      console.warn(`NpcWindowResponse: window ${p.Window} is not supported yet`);
      Store.dropNpcTalk();
      Store.addNotification(t('notify.npcNothingYet'), 'info');
      // OpenMU keeps the player in NpcDialogOpened after opening ANY window
      // (TalkNpcAction.cs) — without this reset it ignores every later
      // TalkToNpcRequest until relogin (the "one refusal bricks all NPCs" bug).
      Store.sendToGS(CloseNpcRequestPacket.createPacket().buffer);
      break;
  }
});

/**
 * `ReceiveShopItemList`: the same 0x31 carries the merchant's stock, the
 * vault's contents and the chaos machine's tray. `Normal` goes to whichever
 * of the two storage windows is open, the merchant otherwise.
 */
EventBus.on('StoreItemList', packet => {
  const p = new StoreItemListPacket(packet);

  const entries = p.getItems().map(entry => ({
    slot: entry.ItemSlot,
    item: ItemSerializer.DeserializeItem(new Uint8Array(entry.ItemData.buffer)),
  }));

  if (p.Type === StoreItemListItemWindowEnum.ChaosMachine) {
    Economy.setMixItems(entries);
    return;
  }

  if (p.Type !== StoreItemListItemWindowEnum.Normal) return;

  if (Economy.vaultOpen) {
    Economy.setVaultItems(entries);
    return;
  }

  Store.setNpcShopItems(entries);
});

EventBus.on('ItemBought', packet => {
  const p = new ItemBoughtPacket(packet);

  const item = ItemSerializer.DeserializeItem(new Uint8Array(p.ItemData.buffer));

  // ReceiveBuyResult (WSclient.cpp): the pickup clink for the new item.
  playUiSound(pickupSound(item));

  runInAction(() => {
    Store.playerData.items[p.InventorySlot] = item;
  });

  Store.finishShopBuy();
  Store.syncPlayerAppearance();
});

EventBus.on('NpcItemBuyFailed', () => {
  Store.finishShopBuy();
  Store.addNotification(t('notify.cannotBuy'), 'error');
});

EventBus.on('NpcItemSellResult', packet => {
  const p = new NpcItemSellResultPacket(packet);
  Store.itemSoldToNpc(p.Success, p.Money);
});

// --- Vault (CNewUIStorageInventory) ------------------------------------------

EventBus.on('VaultMoneyUpdate', packet => {
  const p = new VaultMoneyUpdatePacket(packet);
  Economy.vaultMoneyUpdate(p.Success, p.VaultMoney, p.InventoryMoney);
});

EventBus.on('VaultProtectionInformation', packet => {
  const p = new VaultProtectionInformationPacket(packet);
  Economy.vaultProtectionState(p.ProtectionState);
});

// The server confirms our own `VaultClosed`; nothing is left to do but make
// sure the window is really down (`ProcessClosing`).
EventBus.on('VaultClosed', () => Economy.closeVault(false));

// --- Chaos machine (CNewUIMixInventory) --------------------------------------

EventBus.on('ItemCraftingResult', packet => {
  const p = new ItemCraftingResultPacket(packet);

  const data = new Uint8Array(p.ItemData.buffer);
  const item =
    data.length >= ItemSerializer.NeededSpace
      ? ItemSerializer.DeserializeItem(data)
      : null;

  Economy.craftingResult(p.Result, item);
});

EventBus.on('CraftingDialogClosed075', () => Economy.closeMix(false));

// --- Trade (CNewUITrade) -----------------------------------------------------

EventBus.on('TradeRequest', packet => {
  const p = new TradeRequestS2CPacket(packet);
  Economy.incomingTradeRequest(cleanName(p.Name));
});

EventBus.on('TradeRequestAnswer', packet => {
  const p = new TradeRequestAnswerPacket(packet);

  if (!p.Accepted) {
    Social.errorMessage(t('trade.refused'));
    return;
  }

  Economy.openTrade({
    name: cleanName(p.Name),
    level: p.TradePartnerLevel,
    guildId: p.GuildId,
  });
});

EventBus.on('TradeItemAdded', packet => {
  const p = new TradeItemAddedPacket(packet);
  const item = ItemSerializer.DeserializeItem(new Uint8Array(p.ItemData.buffer));
  Economy.setYourTradeItem(p.ToSlot, item);
});

EventBus.on('TradeItemRemoved', packet => {
  const p = new TradeItemRemovedPacket(packet);
  Economy.setYourTradeItem(p.Slot, null);
});

EventBus.on('TradeMoneySetResponse', () => Economy.tradeMoneyAccepted());

EventBus.on('TradeMoneyUpdate', packet => {
  const p = new TradeMoneyUpdatePacket(packet);
  Economy.partnerTradeMoney(p.MoneyAmount);
});

EventBus.on('TradeButtonStateChanged', packet => {
  const p = new TradeButtonStateChangedPacket(packet);
  Economy.partnerConfirm(p.State);
});

EventBus.on('TradeFinished', packet => {
  const p = new TradeFinishedPacket(packet);
  Economy.tradeFinished(p.Result);
});

// --- Personal shop (CNewUIMyShopInventory / CNewUIPurchaseShopInventory) -----

EventBus.on('PlayerShopSetItemPriceResponse', packet => {
  const p = new PlayerShopSetItemPriceResponsePacket(packet);
  const E = PlayerShopSetItemPriceResponseItemPriceSetResultEnum;

  const reason: Partial<Record<number, TextKey>> = {
    [E.Failed]: 'personalShop.disabled',
    [E.ItemSlotOutOfRange]: 'personalShop.slotNotInShop',
    [E.ItemNotFound]: 'personalShop.itemGone',
    [E.PriceNegative]: 'notify.negativePrice',
    [E.ItemIsBlocked]: 'personalShop.cannotSell',
    [E.CharacterLevelTooLow]: 'personalShop.needLevel',
  };

  Economy.itemPriceResult(
    p.InventorySlot,
    p.Result === E.Success,
    t(reason[p.Result] ?? 'personalShop.priceNotSet')
  );
});

EventBus.on('PlayerShopOpenSuccessful', packet => {
  const p = new PlayerShopOpenSuccessfulPacket(packet);
  Economy.sellingStarted(p.Success);
});

EventBus.on('PlayerShopItemSoldToPlayer', packet => {
  const p = new PlayerShopItemSoldToPlayerPacket(packet);
  Economy.itemSold(p.InventorySlot, cleanName(p.BuyerName));
});

// `PlayerShops` (0x3F 0x00): the shop titles floating over players in scope.
// The ids here carry the same 0x8000 flag bit as the scope packets, so they
// are masked down to the net id the world entities are keyed by - the name
// tags look a shop title up by `entity.netId`.
EventBus.on('PlayerShops', packet => {
  const p = new PlayerShopsPacket(packet);
  for (const shop of p.getShops()) {
    Economy.setShopTitle(shop.PlayerId & 0x7fff, cleanName(shop.StoreName));
  }
});

EventBus.on('PlayerShopClosed', packet => {
  const p = new PlayerShopClosedPacket(packet);
  const maskedId = p.PlayerId & 0x7fff;
  Economy.setShopTitle(maskedId, null);
  Economy.dropBrowsedShop(maskedId);

  // The server's confirmation of our own close (or a forced close): state
  // only. `stopSelling()` would send PlayerShopClose again, which OpenMU
  // answers with another PlayerShopClosed - 600 round trips in one second
  // (verified live).
  if (Store.playerId === maskedId) Economy.sellingStopped();
});

EventBus.on('ClosePlayerShopDialog', packet => {
  const p = new ClosePlayerShopDialogPacket(packet);
  Economy.dropBrowsedShop(p.PlayerId & 0x7fff);
});

/**
 * The stall list quotes its slots the way `CNewUIPurchaseShopInventory`
 * indexes them - `MAX_MY_INVENTORY_EX_INDEX` + square. A slot that is
 * already inside the 8×4 grid is taken as a square, so a server that counts
 * from zero still fills the window instead of leaving it empty.
 */
function shopSquareOf(slot: number): number {
  if (slot >= 0 && slot < PERSONAL_SHOP_SLOTS) return slot;
  return localIndexOf(StorageKind.PersonalShop, slot);
}

EventBus.on('PlayerShopItemList', packet => {
  const p = new PlayerShopItemListPacket(packet);

  if (!p.Success) {
    Social.errorMessage(t('personalShop.openFailed'));
    return;
  }

  const items = new Array<ShopStock | null>(PERSONAL_SHOP_SLOTS).fill(null);

  for (const entry of p.getItems()) {
    const square = shopSquareOf(entry.ItemSlot);
    if (square < 0 || square >= PERSONAL_SHOP_SLOTS) continue;

    items[square] = {
      slot: entry.ItemSlot,
      item: ItemSerializer.DeserializeItem(new Uint8Array(entry.ItemData.buffer)),
      price: entry.Price,
    };
  }

  Economy.showShop({
    playerId: p.PlayerId & 0x7fff,
    playerName: cleanName(p.PlayerName),
    shopName: cleanName(p.ShopName),
    items,
  });
});

EventBus.on('PlayerShopBuyResult', packet => {
  const p = new PlayerShopBuyResultPacket(packet);
  Economy.shopBuyResult(p.Result);
});

EventBus.on('InventoryMoneyUpdate', packet => {
  const p = new InventoryMoneyUpdatePacket(packet);

  runInAction(() => {
    Store.playerData.money = p.Money;
  });
});

EventBus.on('ItemDropResponse', packet => {
  const p = new ItemDropResponsePacket(packet);

  if (!p.Success) {
    console.warn(`Drop of slot ${p.InventorySlot} refused`);
    Store.rollbackItemMove();
    Store.addNotification(t('notify.cannotDropItem'), 'error');
    return;
  }

  runInAction(() => {
    Store.playerData.items[p.InventorySlot] = null;
  });

  // ZzzInterface.cpp:3876: SOUND_DROP_ITEM01 when the hero lets go of an item.
  playUiSound('dropItem');
  Store.confirmItemMove(-1, null);
});

EventBus.on('ItemPickUpRequestFailed', packet => {
  const p = new ItemPickUpRequestFailedPacket(packet);

  const reason = p.FailReason;

  if (reason === ItemPickUpRequestFailedItemPickUpFailReasonEnum.ItemStacked) {
    return;
  }

  Store.addNotification(
    reason ===
      ItemPickUpRequestFailedItemPickUpFailReasonEnum.__MaximumInventoryMoneyReached
      ? t('notify.carryingTooMuchZen')
      : t('notify.cannotPickUp'),
    'error'
  );
});

EventBus.on('CharacterStatIncreaseResponse', packet => {
  const p = new CharacterStatIncreaseResponsePacket(packet);

  if (!p.Success) {
    Store.addNotification(t('notify.pointNotAdded'), 'error');
    return;
  }

  const playerData = Store.playerData;

  runInAction(() => {
    switch (p.Attribute) {
      case StatType.Strength:
        playerData.str++;
        break;
      case StatType.Agility:
        playerData.agi++;
        break;
      case StatType.Vitality:
        playerData.sta++;
        playerData.maxHP = p.UpdatedDependentMaximumStat;
        break;
      case StatType.Energy:
        playerData.eng++;
        playerData.maxMP = p.UpdatedDependentMaximumStat;
        break;
      case StatType.Leadership:
        playerData.leadership++;
        break;
    }

    playerData.maxSD = p.UpdatedMaximumShield;
    playerData.maxAG = p.UpdatedMaximumAbility;

    if (playerData.points > 0) playerData.points--;
  });
});

type LevelUpdateView = Pick<
  CharacterLevelUpdatePacket,
  | 'Level'
  | 'LevelUpPoints'
  | 'MaximumHealth'
  | 'MaximumMana'
  | 'MaximumShield'
  | 'MaximumAbility'
  | 'FruitPoints'
  | 'MaximumFruitPoints'
  | 'NegativeFruitPoints'
  | 'MaximumNegativeFruitPoints'
>;

function applyLevelUpdate(p: LevelUpdateView) {
  const playerData = Store.playerData;

  runInAction(() => {
    playerData.level = p.Level;
    playerData.points = p.LevelUpPoints;
    playerData.maxHP = p.MaximumHealth;
    playerData.maxMP = p.MaximumMana;
    playerData.maxSD = p.MaximumShield;
    playerData.maxAG = p.MaximumAbility;
    playerData.usedFruitPoints = p.FruitPoints;
    playerData.maxFruitPoints = p.MaximumFruitPoints;
    playerData.usedNegativeFruitPoints = p.NegativeFruitPoints;
    playerData.maxNegativeFruitPoints = p.MaximumNegativeFruitPoints;
    // The packet has no experience fields: move the bar to the new bracket.
    playerData.currentLvlExp = experienceForLevel(p.Level);
    playerData.expToNextLvl = experienceForLevel(p.Level + 1);
    if (playerData.exp < playerData.currentLvlExp) {
      playerData.exp = playerData.currentLvlExp;
    }
  });

  Store.addNotification(t('notify.levelUp', { level: p.Level }));
}

EventBus.on('CharacterLevelUpdate', packet =>
  applyLevelUpdate(new CharacterLevelUpdatePacket(packet))
);
EventBus.on('CharacterLevelUpdateExtended', packet =>
  applyLevelUpdate(new CharacterLevelUpdateExtendedPacket(packet))
);

EventBus.on('MasterCharacterLevelUpdate', packet => {
  const p = new MasterCharacterLevelUpdatePacket(packet);
  runInAction(() => {
    Store.playerData.masterLevel = p.MasterLevel;
  });
  Store.addNotification(t('notify.masterLevelUp', { level: p.MasterLevel }));
});

// C3 16 — sent for every kill share. Without this handler the exp bar only
// moved on relog (CharacterInformation).
function applyExperienceGained(p: { AddedExperience: number; KilledObjectId: number }) {
  const added = p.AddedExperience;
  if (added <= 0) return;

  runInAction(() => {
    Store.playerData.exp += added;
  });

  EventBus.emit('experienceGained', {
    added,
    killedNetId: p.KilledObjectId & 0x7fff,
  });
}

EventBus.on('ExperienceGained', packet =>
  applyExperienceGained(new ExperienceGainedPacket(packet))
);
// Extended plug-in variant (exp > 65535 per kill, master exp).
EventBus.on('ExperienceGainedExtended', packet =>
  applyExperienceGained(new ExperienceGainedExtendedPacket(packet))
);

function emitObjectEffect(
  netId: number,
  effect: Events['objectEffect']['effect']
) {
  const world = Store.world;
  if (!world) return;
  const entity = world.getByNetId(netId);
  if (!entity) return;
  EventBus.emit('objectEffect', { entity, effect });
}

// C1 48 — level-up beam, shield potion, shield lost.
EventBus.on('ShowEffect', packet => {
  const p = new ShowEffectPacket(packet);
  const netId = p.PlayerId & 0x7fff;

  switch (p.Effect) {
    case ShowEffectEffectTypeEnum.LevelUp:
      emitObjectEffect(netId, 'levelUp');
      if (netId === Store.playerId) {
        sound.play('Sound/pLevelUp');
      }
      break;
    case ShowEffectEffectTypeEnum.ShieldPotion:
      emitObjectEffect(netId, 'shieldPotion');
      break;
    case ShowEffectEffectTypeEnum.ShieldLost:
      emitObjectEffect(netId, 'shieldLost');
      break;
  }
});

// C1 67 — swirl effect (used e.g. on teleport / certain skills).
EventBus.on('ShowSwirl', packet => {
  const p = new ShowSwirlPacket(packet);
  emitObjectEffect(p.TargetObjectId & 0x7fff, 'swirl');
});

// ---------------------------------------------------------------------------
// Packets OpenMU S6 sends that had no handler.
// ---------------------------------------------------------------------------

/**
 * F3 30 — `ReceiveOption` (`LPPRECEIVE_OPTION`): the key configuration the
 * server saved for this character. Layout after the sub-code: `HotKey[20]`
 * (ten big-endian words, skill *numbers*, 0xFFFF = empty), `GameOption`
 * (auto-attack / whisper sound / slide help bits), `KeyQWE[3]`, `ChatLogBox`,
 * `KeyR`, `QWERLevel`. Only the hot keys are restored; the rest has no
 * consumer here yet (the Q/W/E/R potion slots are inventory-driven).
 */
EventBus.on('ApplyKeyConfiguration', packet => {
  const p = new ApplyKeyConfigurationPacket(packet);
  const data = p.Configuration;
  if (data.byteLength < 20) return;

  const hotkeys: number[] = [];
  for (let i = 0; i < 10; i++) {
    const word = (data.getUint8(i * 2) << 8) | data.getUint8(i * 2 + 1);
    hotkeys.push(word === 0xffff ? -1 : word);
  }
  Store.applyKeyConfiguration(hotkeys);
});

/**
 * F1 02 — `ReceiveLogOut`. OpenMU `LogoutType`: 0 CloseGame, 1
 * BackToCharacterSelection (the connection stays, the player is back to
 * `Authenticated`), 2 BackToServerSelection (the server closes the socket).
 */
EventBus.on('LogoutResponse', packet => {
  if (packet.byteLength < LogoutResponsePacket.Length!) return;
  const p = new LogoutResponsePacket(packet);

  Store.closeNpcShop();
  quests.closeAll();

  switch (p.Type) {
    case 1:
      // Case 1 of the original: back to the character scene; the page asks
      // for the list again on mount.
      runInAction(() => {
        Store.uiState = UIState.Characters;
      });
      // The window sheets go with the world; decoded again on the next entry.
      void import('./libs/mu/preloadSprites').then(m => m.clearWorldSprites());
      break;
    case 0:
    case 2:
    default:
      // Case 0 destroys the window, case 2 closes the socket and shows the
      // login scene: both become "start over at the server list" here.
      Store.disconnectFromGameServer();
      Store.playOnline();
      break;
  }
});

/**
 * F3 06 extended (client >= 106.3) — `ReceiveAddPointExtended`: the same as
 * the short form, with a 16-bit amount and 32-bit maximums for all four
 * pools. `Attribute` uses the same `StatType` order (str 0 … cmd 4).
 */
EventBus.on('CharacterStatIncreaseResponseExtended', packet => {
  if (packet.byteLength < CharacterStatIncreaseResponseExtendedPacket.Length!) return;
  const p = new CharacterStatIncreaseResponseExtendedPacket(packet);
  const added = p.AddedAmount;

  if (added === 0) {
    Store.addNotification(t('notify.pointNotAdded'), 'error');
    return;
  }

  const playerData = Store.playerData;

  runInAction(() => {
    switch (p.Attribute) {
      case StatType.Strength:
        playerData.str += added;
        break;
      case StatType.Agility:
        playerData.agi += added;
        break;
      case StatType.Vitality:
        playerData.sta += added;
        break;
      case StatType.Energy:
        playerData.eng += added;
        break;
      case StatType.Leadership:
        playerData.leadership += added;
        break;
    }

    playerData.maxHP = p.UpdatedMaximumHealth;
    playerData.maxMP = p.UpdatedMaximumMana;
    playerData.maxSD = p.UpdatedMaximumShield;
    playerData.maxAG = p.UpdatedMaximumAbility;
    playerData.points = Math.max(0, playerData.points - added);
  });
});

/**
 * F3 51 extended — `Receive_Master_LevelUp` with `LPPMSG_MASTERLEVEL_UP_EXTENDED`:
 * the master level plus 32-bit maximum life / mana / shield / BP. The level
 * and points go to `skills/masterLevel.ts` (its own handler); the maximums
 * belong to the hero's stats here.
 */
EventBus.on('MasterCharacterLevelUpdateExtended', packet => {
  if (packet.byteLength < MasterCharacterLevelUpdateExtendedPacket.Length!) return;
  const p = new MasterCharacterLevelUpdateExtendedPacket(packet);
  runInAction(() => {
    Store.playerData.masterLevel = p.MasterLevel;
    Store.playerData.maxHP = p.MaximumHealth;
    Store.playerData.maxMP = p.MaximumMana;
    Store.playerData.maxSD = p.MaximumShield;
    Store.playerData.maxAG = p.MaximumAbility;
  });
  Store.addNotification(t('notify.masterLevelUp', { level: p.MasterLevel }));
});

/**
 * F9 01 — `ReceiveNPCDlgUIStart`: the server opened the Season 6 NPC
 * dialogue (`g_QuestMng.SetNPC`, `INTERFACE_NPC_DIALOGUE`). Routed to the
 * quests facade, which opens what it can for that NPC number.
 */
EventBus.on('OpenNpcDialog', packet => {
  if (packet.byteLength < OpenNpcDialogPacket.Length!) return;
  const p = new OpenNpcDialogPacket(packet);
  quests.openNpcDialog(p.NpcNumber, p.GensContributionPoints);
});

/** GlobalText 166…169 / 1900: the stat names of `ReceiveUseStateItem`. */
const FRUIT_STAT_NAMES: Record<number, string> = {
  [FruitConsumptionResponseFruitStatTypeEnum.Energy]: 'Energy',
  [FruitConsumptionResponseFruitStatTypeEnum.Vitality]: 'Vitality',
  [FruitConsumptionResponseFruitStatTypeEnum.Agility]: 'Agility',
  [FruitConsumptionResponseFruitStatTypeEnum.Strength]: 'Strength',
  [FruitConsumptionResponseFruitStatTypeEnum.Leadership]: 'Command',
};

/**
 * 2C — `ReceiveUseStateItem` (`LPPMSG_USE_STAT_FRUIT`): the result of eating
 * a Jewel of Life fruit. A success moves the stat by `StatPoints` and counts
 * the fruit points (`AddPoint`); everything else is the original's OK box,
 * shown as a notification. The server sends the current stats again anyway.
 */
EventBus.on('FruitConsumptionResponse', packet => {
  if (packet.byteLength < FruitConsumptionResponsePacket.Length!) return;
  const p = new FruitConsumptionResponsePacket(packet);
  const points = p.StatPoints;
  const statName = FRUIT_STAT_NAMES[p.StatType] ?? 'stat';
  const R = FruitConsumptionResponseFruitConsumptionResultEnum;

  const move = (sign: 1 | -1) => {
    const d = Store.playerData;
    runInAction(() => {
      switch (p.StatType) {
        case FruitConsumptionResponseFruitStatTypeEnum.Energy:
          d.eng = Math.max(0, d.eng + sign * points);
          break;
        case FruitConsumptionResponseFruitStatTypeEnum.Vitality:
          d.sta = Math.max(0, d.sta + sign * points);
          break;
        case FruitConsumptionResponseFruitStatTypeEnum.Agility:
          d.agi = Math.max(0, d.agi + sign * points);
          break;
        case FruitConsumptionResponseFruitStatTypeEnum.Strength:
          d.str = Math.max(0, d.str + sign * points);
          break;
        case FruitConsumptionResponseFruitStatTypeEnum.Leadership:
          d.leadership = Math.max(0, d.leadership + sign * points);
          break;
      }
      if (sign > 0) d.usedFruitPoints += points;
      else {
        d.usedNegativeFruitPoints += points;
        d.points += points;
      }
    });
  };

  switch (p.Result) {
    case R.PlusSuccess:
      move(1);
      Store.addNotification(t('notify.fruitAdd', { stat: statName, points }));
      break;
    case R.MinusSuccess:
    case R.MinusSuccessCashShopFruit:
      move(-1);
      Store.addNotification(t('notify.fruitRemove', { stat: statName, points }));
      break;
    case R.PlusFailed:
    case R.MinusFailed:
      Store.addNotification(t('notify.fruitNoEffect'), 'error');
      break;
    case R.PlusPreventedByMaximum:
    case R.MinusPreventedByMaximum:
      Store.addNotification(t('notify.fruitLimit'), 'error');
      break;
    case R.MinusPreventedByDefault:
      Store.addNotification(t('notify.fruitFloor', { stat: statName }), 'error');
      break;
    case R.PreventedByEquippedItems:
      Store.addNotification(t('notify.fruitEquipped'), 'error');
      break;
    case R.PlusPrevented:
    case R.MinusPrevented:
    default:
      Store.addNotification(t('notify.fruitNotNow'), 'error');
      break;
  }
});

/**
 * 0x25 — `ReceiveChangePlayer`: one equipment slot of a player in scope
 * changed. Slot numbers are the inventory's (`InventoryConstants`); a group
 * of 0xFF means the slot was emptied. The hero's own appearance is driven by
 * the inventory (`Store.syncPlayerAppearance`), so it is left alone here.
 */
function applyAppearanceChange(
  playerId: number,
  slot: number,
  item: Item | null
): void {
  const world = Store.world;
  if (!world) return;
  const netId = playerId & 0x7fff;
  if (netId === Store.playerId) return;

  const entity = world.getByNetId(netId);
  const cApp = entity?.charAppearance;
  if (!cApp) return;

  switch (slot) {
    case InventoryConstants.LeftHandSlot:
      cApp.leftHand = item;
      break;
    case InventoryConstants.RightHandSlot:
      cApp.rightHand = item;
      break;
    case InventoryConstants.HelmSlot:
      cApp.helm = item;
      break;
    case InventoryConstants.ArmorSlot:
      cApp.armor = item;
      break;
    case InventoryConstants.PantsSlot:
      cApp.pants = item;
      break;
    case InventoryConstants.GlovesSlot:
      cApp.gloves = item;
      break;
    case InventoryConstants.BootsSlot:
      cApp.boots = item;
      break;
    case InventoryConstants.WingsSlot:
      cApp.wings = item;
      break;
    case InventoryConstants.PetSlot:
      cApp.pet = item;
      break;
    default:
      // Rings, pendants: nothing visible (the original ignores them too).
      return;
  }
  cApp.changed = true;
}

// Legacy layout: a full serialized item whose byte 1 holds
// `slot << 4 | glowLevel` (AppearanceChangedPlugIn); all 0xFF = unequipped.
EventBus.on('AppearanceChanged', packet => {
  const p = new AppearanceChangedPacket(packet);
  const data = p.ItemData;
  if (data.byteLength < ItemSerializer.NeededSpace) return;

  const bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  const slot = bytes[1] >> 4;
  const unequipped = bytes[0] === 0xff && bytes[5] === 0xff;
  if (unequipped) {
    applyAppearanceChange(p.ChangedPlayerId, slot, null);
    return;
  }

  const item = ItemSerializer.DeserializeItem(bytes);
  // Byte 1 does not carry the item level here: the server overwrites it with
  // `slot << 4 | GetGlowLevel()` (AppearanceChangedPlugIn), so the low nibble
  // is the same three-bit glow the scope preview sends, not a +0..+15.
  item.lvl = itemLevelFromGlow(bytes[1] & 0x0f);
  applyAppearanceChange(p.ChangedPlayerId, slot, item);
});

// Extended layout (client >= 106.3): group / number / level / excellent
// flags / ancient discriminator, like `deserializeAppearanceExtended`.
EventBus.on('AppearanceChangedExtended', packet => {
  if (packet.byteLength < AppearanceChangedExtendedPacket.Length!) return;
  const p = new AppearanceChangedExtendedPacket(packet);

  const item: Item | null =
    p.ItemGroup === 0xff
      ? null
      : {
          num: p.ItemNumber,
          group: p.ItemGroup & 0xf,
          lvl: p.ItemLevel,
          isExcellent: (p.ExcellentFlags & 0x3f) !== 0,
          excellentFlags: p.ExcellentFlags & 0x3f,
          isAncient: p.AncientDiscriminator !== 0,
        };
  applyAppearanceChange(p.ChangedPlayerId, p.ItemSlot, item);
});

/** A9 — `ReceivePetInfo` (`giPetManager::SetPetInfo`): state for the tooltip. */
EventBus.on('PetInfoResponse', packet => {
  if (packet.byteLength < PetInfoResponsePacket.Length!) return;
  const p = new PetInfoResponsePacket(packet);
  Store.setPetInfo({
    pet: p.Pet,
    storage: p.Storage,
    slot: p.ItemSlot,
    level: p.Level,
    experience: p.Experience,
    health: p.Health,
  });
});

/** A7 — `ReceivePetCommand` (`giPetManager::SetPetCommand`): the raven's mode. */
EventBus.on('PetMode', packet => {
  if (packet.byteLength < PetModePacket.Length!) return;
  const p = new PetModePacket(packet);
  Store.setPetMode(p.PetCommandMode, p.TargetId);
});

/**
 * BF 51 — `ReceiveMuHelperStatusUpdate`: `Pause` stops the helper, otherwise
 * it starts; with `ConsumeMoney` the server charged `Money` zen for it (the
 * money itself arrives through the usual money packets).
 */
EventBus.on('MuHelperStatusUpdate', packet => {
  if (packet.byteLength < MuHelperStatusUpdatePacket.Length!) return;
  const p = new MuHelperStatusUpdatePacket(packet);
  Store.setMuHelperStatus(!p.PauseStatus, p.ConsumeMoney ? p.Money : 0);
});

/** C2 AE — `ReceiveMuHelperConfigurationData`: the saved config blob, kept as is. */
EventBus.on('MuHelperConfigurationData', packet => {
  if (packet.byteLength < MuHelperConfigurationDataPacket.Length!) return;
  const p = new MuHelperConfigurationDataPacket(packet);
  const data = p.HelperData;
  Store.setMuHelperConfig(
    new Uint8Array(data.buffer, data.byteOffset, data.byteLength).slice()
  );
});

/**
 * F3 32 - `BaseStatsExtended`: the server set the base stats outright (set
 * stats command, reset). Same store fields the character information fills.
 */
EventBus.on('BaseStatsExtended', packet => {
  if (packet.byteLength < BaseStatsExtendedPacket.Length!) return;
  const p = new BaseStatsExtendedPacket(packet);
  runInAction(() => {
    const pd = Store.playerData;
    pd.str = p.Strength;
    pd.agi = p.Agility;
    pd.sta = p.Vitality;
    pd.eng = p.Energy;
    pd.leadership = p.Command;
  });
});

/**
 * BF 0A - `ChainLightningHitInfo`: the server-picked hops of Chain Lightning
 * (skill 215). The cast came through the usual skill animation packet; here
 * only the bolt is drawn caster -> target -> target.
 */
EventBus.on('ChainLightningHitInfo', packet => {
  const p = new ChainLightningHitInfoPacket(packet);
  const world = Store.world;
  if (!world) return;
  let from = world.getByNetId(p.PlayerId & 0x7fff);
  if (!from) return;
  const maxTargets = Math.max(0, Math.floor((packet.byteLength - 10) / 2));
  for (const t of p.getTargets(Math.min(p.TargetCount, maxTargets))) {
    const target = world.getByNetId(t.TargetId & 0x7fff);
    if (!target) continue;
    playTargetedSkillVisual(world.scene, p.SkillNumber, from, target);
    from = target;
  }
});

/**
 * C3 4A - `RageAttack`: a rage fighter's Dark Side blow on one target, shown
 * to everyone in scope like a targeted skill animation.
 */
EventBus.on('RageAttack', packet => {
  if (packet.byteLength < RageAttackPacket.Length!) return;
  const p = new RageAttackPacket(packet);
  const world = Store.world;
  if (!world) return;
  const caster = world.getByNetId(p.SourceId & 0x7fff);
  if (!caster) return;
  const target = world.getByNetId(p.TargetId & 0x7fff) ?? null;

  if (target && target !== caster && !caster.localPlayer) {
    const dx = target.transform.pos.x - caster.transform.pos.x;
    const dz = target.transform.pos.z - caster.transform.pos.z;
    if (dx * dx + dz * dz > 0.01) {
      caster.transform.rot.y = Math.atan2(dz, dx) + Math.PI / 2;
    }
  }
  playCastAnimation(caster, p.SkillId);
  playTargetedSkillVisual(world.scene, p.SkillId, caster, target);
});

/**
 * C1 B1 00 - `ReceiveChangeMapServerInfo` (WSclient.cpp:10328): move to the
 * game server hosting the destination map. Port 0 means the move was
 * cancelled (`LoadingWorld = 0`). OpenMU's protocol has no packet for this
 * (one game server per connection), so only split-deployment servers send it.
 */
EventBus.on('ChangeMapServerInfo', packet => {
  if (packet.byteLength < ChangeMapServerInfoPacket.MinimumSize) return;
  const p = new ChangeMapServerInfoPacket(packet);
  if (!p.Port) return;
  console.log(`map server move: ${p.IpAddress}:${p.Port}`);
  Store.switchToMapServer(p.IpAddress, p.Port, {
    authCode1: p.AuthCode1,
    authCode2: p.AuthCode2,
    authCode3: p.AuthCode3,
    authCode4: p.AuthCode4,
  });
});

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
