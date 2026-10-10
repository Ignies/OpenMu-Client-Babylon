import { computed, makeObservable, observable, runInAction } from 'mobx';
import { CharacterClassNumber } from '@/core/types';
import { InventoryConstants } from '@/core/inventoryConstants';
import { EventBus } from '@/core/eventBus';
import type { Item } from '@/ecs/world';
import { Ecs } from '@/ecs/current';
import { Scalar } from '@/controllers/render/babylon/exports';
import { classOf, type HeroStats } from '@/controllers/item_rules';
import {
  AnimationRequestPacket,
  IncreaseCharacterStatPointPacket,
  WalkRequestPacket,
} from '@versions/shared/packets/ClientToServerPackets';
import { Session } from '../session';
import { StatType } from './characterStats';

/** How long the offline demo takes to "answer" a stat point request. */
const OFFLINE_ANSWER_DELAY = 30;

/**
 * A yaw as the 0-7 direction the wire carries - the inverse of the
 * `direction * 45 - 45` degrees `logic` reads incoming rotations with, and
 * what `SendCharacterMove` derives from `Object.Angle[2]` for a stop.
 */
function walkDirection(rotYRadians: number): number {
  return ((Math.round((rotYRadians * 4) / Math.PI) + 1) % 8 + 8) % 8;
}

/**
 * The hero: name, class, stats, vitals, level and experience, money, the inventory and worn items,
 * and the requests that act on them (stat points, walking, emotes). Packets write it (`net.ts`).
 */
class HeroState {
  money = 0;

  name = '';
  charClass: CharacterClassNumber = CharacterClassNumber.DarkKnight;

  leadership = 0;

  usedFruitPoints = 0;
  maxFruitPoints = 0;
  usedNegativeFruitPoints = 0;
  maxNegativeFruitPoints = 0;

  tileFlag = 0;


  currentHP = 25;
  maxHP = 40;
  currentMP = 80;
  maxMP = 100;
  currentSD = 10;
  maxSD = 12;
  currentAG = 10;
  maxAG = 12;

  level = 1;
  points = 5;
  /**
   * Attack / magic speed as the server computed them (CurrentStatsExtended /
   * CharacterInformationExtended); null until received, then authoritative
   * over the client-side agility formula.
   */
  attackSpeed: number | null = null;
  magicSpeed: number | null = null;

  /** CharacterHeroState byte (the original's `Hero->PK`); 3 is Normal. */
  heroState = 3;

  /**
   * `CharacterStatus.GameMaster` off CharacterInformation, which is the
   * server's own answer rather than the `#` shout guess `isGm` makes for other
   * players. Belongs to the selected character, so it is cleared on select.
   *
   * Drawing only: the server re-checks the status on every command it receives
   * (`ChatMessageCommandProcessor`), so nothing here grants anything.
   */
  isGameMaster = false;

  exp = 50;
  currentLvlExp = 0;
  expToNextLvl = 100;

  str = 10;
  agi = 10;
  sta = 10;
  eng = 10;

  items: (Item | null)[] = new Array(
    InventoryConstants.InventoryRows * InventoryConstants.RowSize +
      InventoryConstants.EquippableSlotsCount
  ).fill(null);

  get leftHandSlot() {
    return this.items[InventoryConstants.LeftHandSlot];
  }

  get rightHandSlot() {
    return this.items[InventoryConstants.RightHandSlot];
  }

  get helmetSlot() {
    return this.items[InventoryConstants.HelmSlot];
  }

  get glovesSlot() {
    return this.items[InventoryConstants.GlovesSlot];
  }

  get bootsSlot() {
    return this.items[InventoryConstants.BootsSlot];
  }

  get pantsSlot() {
    return this.items[InventoryConstants.PantsSlot];
  }

  get armorSlot() {
    return this.items[InventoryConstants.ArmorSlot];
  }

  get wingsSlot() {
    return this.items[InventoryConstants.WingsSlot];
  }

  get pendantSlot() {
    return this.items[InventoryConstants.PendantSlot];
  }

  get ring1Slot() {
    return this.items[InventoryConstants.Ring1Slot];
  }

  get ring2Slot() {
    return this.items[InventoryConstants.Ring2Slot];
  }

  get petSlot() {
    return this.items[InventoryConstants.PetSlot];
  }

  get inventoryItems() {
    return this.items.slice(
      InventoryConstants.LastEquippableItemSlotIndex + 1,
      InventoryConstants.LastEquippableItemSlotIndex +
        1 +
        InventoryConstants.InventoryRows * InventoryConstants.RowSize
    );
  }

  get hpPercent() {
    return Scalar.Clamp(this.currentHP / Math.max(this.maxHP, 1), 0, 1);
  }

  get mpPercent() {
    return Scalar.Clamp(this.currentMP / Math.max(this.maxMP, 1), 0, 1);
  }

  get sdPercent() {
    return Scalar.Clamp(this.currentSD / Math.max(this.maxSD, 1), 0, 1);
  }

  get agPercent() {
    return Scalar.Clamp(this.currentAG / Math.max(this.maxAG, 1), 0, 1);
  }

  get expPercent() {
    return Scalar.Clamp(
      (this.exp - this.currentLvlExp) /
        Math.max(this.expToNextLvl - this.currentLvlExp, 1),
      0,
      1
    );
  }

  constructor() {
    makeObservable(this, {
      money: observable,
      tileFlag: observable,
      currentHP: observable,
      maxHP: observable,
      currentMP: observable,
      maxMP: observable,
      currentSD: observable,
      maxSD: observable,
      currentAG: observable,
      maxAG: observable,
      exp: observable,
      currentLvlExp: observable,
      expToNextLvl: observable,
      expPercent: computed,
      hpPercent: computed,
      mpPercent: computed,
      sdPercent: computed,
      agPercent: computed,
      str: observable,
      agi: observable,
      sta: observable,
      eng: observable,
      leadership: observable,
      name: observable,
      charClass: observable,
      usedFruitPoints: observable,
      maxFruitPoints: observable,
      usedNegativeFruitPoints: observable,
      maxNegativeFruitPoints: observable,
      level: observable,
      points: observable,
      isGameMaster: observable,
      items: observable,
      leftHandSlot: computed,
      rightHandSlot: computed,
      helmetSlot: computed,
      glovesSlot: computed,
      bootsSlot: computed,
      pantsSlot: computed,
      armorSlot: computed,
      wingsSlot: computed,
      pendantSlot: computed,
      ring1Slot: computed,
      ring2Slot: computed,
      petSlot: computed,
      inventoryItems: computed,
      playerId: observable,
    });
  }

  setTileFlag(flag: number) {
    runInAction(() => {
      this.tileFlag = flag;
    });
  }

  playerId?: number;

  syncPlayerAppearance() {
    const playerEntity = Ecs.world?.playerEntity;

    if (!playerEntity || !playerEntity.charAppearance) return;

    playerEntity.charAppearance.helm = this.helmetSlot || null;
    playerEntity.charAppearance.armor = this.armorSlot || null;
    playerEntity.charAppearance.pants = this.pantsSlot || null;
    playerEntity.charAppearance.gloves = this.glovesSlot || null;
    playerEntity.charAppearance.boots = this.bootsSlot || null;
    playerEntity.charAppearance.leftHand = this.leftHandSlot || null;
    playerEntity.charAppearance.rightHand = this.rightHandSlot || null;
    playerEntity.charAppearance.wings = this.wingsSlot || null;
    // `c->Helper` (equipment slot 8): the Guardian Angel, the Imp and the two
    // horns. PetSystem spawns the world objects, PlayerObject.Pet carries the
    // body-linked Imp, and AnimationSystem reads it for the ride clips.
    playerEntity.charAppearance.pet = this.petSlot || null;
    playerEntity.charAppearance.changed = true;
  }

  increaseStatRequest(stat: number): void {
    if (Session.isOffline) {
      this.answerStatOffline(stat);
      return;
    }

    const packet = IncreaseCharacterStatPointPacket.createPacket();
    packet.StatType = stat;
    Session.sendToGS(packet.buffer);
  }

  /**
   * No server offline: the point is applied here, one answer per request and
   * after a beat, so the window and the bulk run behave as they do in game.
   */
  private answerStatOffline(stat: number): void {
    setTimeout(() => {
      if (this.points <= 0) {
        EventBus.emit('statPointAnswered', { stat, added: 0 });
        return;
      }

      runInAction(() => {
        switch (stat) {
          case StatType.Strength:
            this.str++;
            break;
          case StatType.Agility:
            this.agi++;
            break;
          case StatType.Vitality:
            this.sta++;
            break;
          case StatType.Energy:
            this.eng++;
            break;
          case StatType.Leadership:
            this.leadership++;
            break;
        }
        this.points--;
      });

      EventBus.emit('statPointAnswered', { stat, added: 1 });
    }, OFFLINE_ANSWER_DELAY);
  }

  sendAnimationRequest(rotation: number, animationNumber: number): void {
    const packet = AnimationRequestPacket.createPacket();
    packet.Rotation = rotation;
    packet.AnimationNumber = animationNumber;

    Session.sendToGS(packet.buffer);
  }

  /**
   * WalkRequest (0xD4). `x`/`y` is the tile the walk starts from - the one
   * the hero is logically standing on when the first step is taken, which
   * the server compares against its own position (PlayerMovement.
   * IsWalkRequestValidAsync, tolerance 5 tiles). At most 15 steps fit the
   * 4-bit count (MAX_PATH_FIND in the original client); longer paths are
   * sent in segments by NetworkSystem.
   */
  sendWalkPath(x: number, y: number, dirs: number[]): void {
    if (dirs.length === 0) return;
    // Walking away ends the NPC talk: OpenMU refuses potions, trades and even
    // death while it thinks a dialog is open.
    EventBus.emit('heroWalked', {});
    if (dirs.length > 15) dirs = dirs.slice(0, 15);
    x = Math.round(x);
    y = Math.round(y);

    // Two steps per byte, first step in the high nibble (see WalkRequest in
    // the OpenMU packet docs); byte 5 carries rotation (high) + count (low).
    const packed = new Array<number>(Math.ceil(dirs.length / 2)).fill(0);
    for (let i = 0; i < dirs.length; i++) {
      const shift = i % 2 === 0 ? 4 : 0;
      packed[i >> 1] |= (dirs[i] & 0x0f) << shift;
    }

    const packet = WalkRequestPacket.createPacket(6 + packed.length);
    packet.SourceX = x;
    packet.SourceY = y;
    packet.StepCount = dirs.length;
    packet.TargetRotation = dirs[dirs.length - 1];
    packet.setDirections(packed, packed.length);

    this.lastWalkRequest = { x, y, steps: dirs.length, at: performance.now() };
    Session.sendToGS(packet.buffer);
  }

  /**
   * The last walk the server was told about. Read only by `heroMoveTrace`, to
   * say whether a jump it just made was the end of a walk we thought we had
   * stopped. Deliberately not observable: nothing renders it.
   */
  lastWalkRequest: { x: number; y: number; steps: number; at: number } | null =
    null;

  /**
   * `LetHeroStop()` (ZzzInterface.cpp:1070, called at :1299 and :1935): the walk a swing or a cast opens with.
   * `SendCharacterMove` with a single path point sends the hero's own tile,
   * no steps and just the facing (:1925-1932), which parks the server's
   * walker where the client stopped. Without it the server keeps walking the
   * path it was already handed while the client stands still casting, and
   * rubber-bands the hero onto its own position once the two drift past the
   * 5-tile tolerance.
   */
  sendWalkStop(x: number, y: number, rotYRadians: number): void {
    const packet = WalkRequestPacket.createPacket(6);
    packet.SourceX = Math.round(x);
    packet.SourceY = Math.round(y);
    packet.StepCount = 0;
    packet.TargetRotation = walkDirection(rotYRadians);

    this.lastWalkRequest = {
      x: packet.SourceX,
      y: packet.SourceY,
      steps: 0,
      at: performance.now(),
    };
    Session.sendToGS(packet.buffer);
  }

  /** The hero as `RenderItemInfo` compares against (`CharacterAttribute`). */
  heroStats(): HeroStats {
    const { base, step } = classOf(this.charClass);

    return {
      level: this.level,
      str: this.str,
      agi: this.agi,
      vit: this.sta,
      ene: this.eng,
      cmd: this.leadership,
      baseClass: base,
      stepClass: step,
    };
  }
}

export const Hero = new HeroState();

// A second instance after a hot update would leave the windows on a hero nobody writes.
const hot = (import.meta as { hot?: { decline(): void } }).hot;
if (hot) hot.decline();
