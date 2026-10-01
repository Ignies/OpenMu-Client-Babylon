import { BaseStatsExtendedPacket, CharacterInformationExtendedPacket, CharacterInformationPacket, CharacterLevelUpdateExtendedPacket, CharacterLevelUpdatePacket, CharacterStatIncreaseResponseExtendedPacket, CharacterStatIncreaseResponsePacket, CurrentHealthAndShieldPacket, CurrentManaAndAbilityPacket, CurrentStatsExtendedPacket, ExperienceGainedExtendedPacket, ExperienceGainedPacket, FruitConsumptionResponseFruitConsumptionResultEnum, FruitConsumptionResponseFruitStatTypeEnum, FruitConsumptionResponsePacket, HeroStateChangedPacket, MasterCharacterLevelUpdateExtendedPacket, MasterCharacterLevelUpdatePacket, MaximumHealthAndShieldPacket, MaximumManaAndAbilityPacket, MaximumStatsExtendedPacket, PoisonDamagePacket, RespawnAfterDeath075Packet, RespawnAfterDeath095Packet, RespawnAfterDeathExtendedPacket, RespawnAfterDeathPacket } from '@versions/shared/packets/ServerToClientPackets';
import { Commands } from '../chat/commands';
import { Economy } from '../economy/economy';
import { EventBus } from '@/core/eventBus';
import { GmPanel } from '../gm/gmPanel';
import { Messenger } from '../friends/messenger';
import { PlayerAction } from '@versions/shared/objects/enum';
import { SessionResume } from '../session/sessionResume';
import { Social } from '../social/social';
import { StatType, masterExperienceActive } from './characterStats';
import { Store, UIState } from '@/app/store';
import { convertDirectionToAngle } from '../_shared/net_helpers';
import { experienceForLevel } from './experience';
import { heroStateMessage } from '@/controllers/interface/nameTags';
import { runInAction } from 'mobx';
import { t } from '@/i18n';

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
  | 'Status'
> & { AttackSpeed?: number; MagicSpeed?: number };

/**
 * `CharacterStatus.GameMaster`. Tested as a bit rather than compared: the
 * original client packs its CtlCode flags into the same byte (the character
 * list reads bit 1 of it for the item block), so a GM with another flag set
 * would fail an equality check.
 */
const GAME_MASTER_STATUS = 0x20;

function applyCharacterInformation(p: CharacterInformationView) {
  const playerData = Store.playerData;

  // Chat, party, guild and messenger state belong to the character: clear on
  // select, before the new values land. MessengerInitialization arrives
  // right after and refills the lists.
  Social.reset();
  Messenger.reset();
  Economy.reset();
  GmPanel.reset();

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

    // The server's own answer to "is this character a game master", which the
    // `#` shout guess below could never give for the hero. Set on every
    // select, so a normal character on the same account clears it.
    playerData.isGameMaster = (p.Status & GAME_MASTER_STATUS) !== 0;

    Store.uiState = UIState.World;
    SessionResume.remember(playerData.name);
    SessionResume.finish();
    // Lazy: preloadSprites pulls the window layouts in, and logic.ts sits under them.
    void import('@/controllers/assets/mu/preloadSprites').then(m => m.preloadWorldSprites());

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

  // g_iFollowCharacter = -1: a follow does not survive the hero dying.
  // Done here rather than on the kill packet so every respawn path clears it.
  Commands.stopFollowing();

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

EventBus.on('CharacterStatIncreaseResponse', packet => {
  const p = new CharacterStatIncreaseResponsePacket(packet);

  if (!p.Success) {
    Store.addNotification(t('notify.pointNotAdded'), 'error');
    EventBus.emit('statPointAnswered', { stat: p.Attribute, added: 0 });
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

  EventBus.emit('statPointAnswered', { stat: p.Attribute, added: 1 });
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
  Store.addNotification(t('notify.masterLevelUp', { level: p.MasterLevel }));
});

// C3 16 - sent for every kill share. Without this handler the exp bar only
// moved on relog (CharacterInformation).
function applyExperienceGained(p: { AddedExperience: number; KilledObjectId: number }) {
  const added = p.AddedExperience;
  if (added <= 0) return;

  // ReceiveDieExp (WSclient.cpp:5719-5743): a master gains master experience instead (skills/masterLevel.ts).
  const pd = Store.playerData;
  if (!masterExperienceActive(pd.charClass, pd.level)) runInAction(() => (pd.exp += added));

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

/**
 * F3 06 extended (client >= 106.3) - `ReceiveAddPointExtended`: the same as
 * the short form, with a 16-bit amount and 32-bit maximums for all four
 * pools. `Attribute` uses the same `StatType` order (str 0 … cmd 4).
 */
EventBus.on('CharacterStatIncreaseResponseExtended', packet => {
  if (packet.byteLength < CharacterStatIncreaseResponseExtendedPacket.Length!) return;
  const p = new CharacterStatIncreaseResponseExtendedPacket(packet);
  const added = p.AddedAmount;

  if (added === 0) {
    Store.addNotification(t('notify.pointNotAdded'), 'error');
    EventBus.emit('statPointAnswered', { stat: p.Attribute, added: 0 });
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

  EventBus.emit('statPointAnswered', { stat: p.Attribute, added });
});

/**
 * F3 51 extended - `Receive_Master_LevelUp` with `LPPMSG_MASTERLEVEL_UP_EXTENDED`:
 * the master level plus 32-bit maximum life / mana / shield / BP. The level
 * and points go to `skills/masterLevel.ts` (its own handler); the maximums
 * belong to the hero's stats here.
 */
EventBus.on('MasterCharacterLevelUpdateExtended', packet => {
  if (packet.byteLength < MasterCharacterLevelUpdateExtendedPacket.Length!) return;
  const p = new MasterCharacterLevelUpdateExtendedPacket(packet);
  runInAction(() => {
    Store.playerData.maxHP = p.MaximumHealth;
    Store.playerData.maxMP = p.MaximumMana;
    Store.playerData.maxSD = p.MaximumShield;
    Store.playerData.maxAG = p.MaximumAbility;
  });
  Store.addNotification(t('notify.masterLevelUp', { level: p.MasterLevel }));
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
 * 2C - `ReceiveUseStateItem` (`LPPMSG_USE_STAT_FRUIT`): the result of eating
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
