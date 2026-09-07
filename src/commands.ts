import { t } from './i18n';
import { action, makeObservable, observable, runInAction } from 'mobx';
import { Store } from './store';
import { Social, INVITE_RANGE_TILES } from './social';
import { Economy } from './economy';
import { Messenger } from './messenger';
import type { Entity } from './ecs/world';
import type { CommandKind } from './common/chatCommands';
import { GuildRelationshipTypeEnum } from './common/packets/ClientToServerPackets';
import { GuildMemberRoleEnum } from './common/packets/ServerToClientPackets';
import {
  DuelStartRequestPacket,
  DuelStopRequestPacket,
} from './common/packets/ClientToServerPackets';
import { playUiSound } from './libs/sfx';
import { isAttackablePlayer } from './ecs/systems/attackSystem';

/**
 * `CNewUICommandWindow` (NewUICommandWindow.cpp) and the `/command` lines of
 * `CheckCommand` (ZzzInterface.cpp:3990): every player-to-player action -
 * trade, purchase, party, whisper, guild, alliance, hostility, add friend,
 * follow, duel - run on the **character under the cursor**. The window arms
 * one (`m_iCurSelectCommand`), the cursor turns into `CURSOR_IDSELECT`, and
 * the next right click on a player runs it (`RunCommand`); a typed `/trade`
 * runs it at once on whoever is under the cursor.
 *
 * `CNewUIQuickCommandWindow` (NewUIQuickCommandWindow.cpp) is the shortcut
 * for the same actions: a right click on another player opens a small menu
 * at the cursor whose entries run those commands straight away, with no
 * arming step.
 *
 * The windows are the UI (ui/pages/worldPage/components/commandWindow and
 * quickCommandWindow); the packets are the ones the social / economy /
 * messenger stores already send.
 */

/** `MAX_DISTANCE_TILE` (_define.h:597): how far the target may stand, in tiles. */
const MAX_DISTANCE_TILE = 2;
/** `TRADELIMITLEVEL`: no trading below this level (GlobalText 478). */
const TRADE_LIMIT_LEVEL = 6;
/** `CommandDual`: the duel needs level 30 (GlobalText 2704). */
const DUEL_LIMIT_LEVEL = 30;
/**
 * `CNewUIHotKey::UpdateMouseEvent`: the quick menu opens on a player less
 * than 300 world units away - three tiles. Wider than `MAX_DISTANCE_TILE`
 * on purpose, the way the original is: the menu opens, and the entry that
 * needs two tiles is the one that refuses.
 */
const QUICK_RANGE_TILES = 3;
/** `OpenQuickCommand(..., MouseX + 10, MouseY - 50)`. */
const QUICK_OFFSET = { x: 10, y: -50 };

export type CommandTarget = {
  netId: number;
  name: string;
  guildRole: GuildMemberRoleEnum | undefined;
  entity: Entity;
};

export const Commands = new (class _Commands {
  /** `INTERFACE_COMMAND` visible. */
  windowOpen = false;
  /** `m_iCurSelectCommand`: the entry armed for the next right click. */
  pending: CommandKind | null = null;
  /** `g_iFollowCharacter`: the player the hero keeps walking after. */
  following: Entity | null = null;
  /** `INTERFACE_QUICK_COMMAND`: the player the right-click menu is open on. */
  quickTarget: Entity | null = null;
  /** Where that menu sits, in screen pixels. */
  quickPos = { x: 0, y: 0 };

  constructor() {
    makeObservable(this, {
      windowOpen: observable,
      pending: observable,
      following: observable.ref,
      quickTarget: observable.ref,
      quickPos: observable.ref,
      toggleWindow: action,
      closeWindow: action,
      arm: action,
      disarm: action,
      closeQuick: action,
    });
  }

  toggleWindow(): void {
    this.windowOpen = !this.windowOpen;
    if (!this.windowOpen) this.pending = null;
  }

  closeWindow(): void {
    this.windowOpen = false;
    this.pending = null;
  }

  /** Click on a window entry: a second click on the armed one disarms it. */
  arm(kind: CommandKind): void {
    this.pending = this.pending === kind ? null : kind;
  }

  disarm(): void {
    this.pending = null;
  }

  reset(): void {
    runInAction(() => {
      this.windowOpen = false;
      this.pending = null;
      this.following = null;
      this.quickTarget = null;
    });
  }

  /**
   * `OpenQuickCommand`: a right click on another player within reach opens
   * the quick menu at the cursor instead of casting. Returns false when
   * there is no such player under it, so the click falls through to the
   * skill.
   */
  openQuickOn(
    entity: Entity | null | undefined,
    clientX: number,
    clientY: number
  ): boolean {
    if (!this.isQuickTarget(entity)) return false;
    runInAction(() => {
      this.quickTarget = entity!;
      this.quickPos = {
        x: clientX + QUICK_OFFSET.x,
        y: Math.max(0, clientY + QUICK_OFFSET.y),
      };
    });
    return true;
  }

  closeQuick(): void {
    this.quickTarget = null;
  }

  /**
   * The quick menu's own target test. Stricter than `targetOf` about what
   * counts as a player: the player-rig monsters (the skeletons, the Cursed
   * Wizard) carry `playerAnimation` too, and a right click on one of those
   * has to stay a skill cast.
   */
  isQuickTarget(entity: Entity | null | undefined): boolean {
    const hero = Store.world?.playerEntity;
    if (!entity || !hero) return false;
    if (entity.localPlayer || entity.netId === undefined) return false;
    if (!entity.playerAnimation || entity.npcType !== undefined) return false;
    if (entity.dying || entity.objOutOfScope) return false;
    const dx = entity.transform!.pos.x - hero.transform!.pos.x;
    const dy = entity.transform!.pos.z - hero.transform!.pos.z;
    return dx * dx + dy * dy <= QUICK_RANGE_TILES * QUICK_RANGE_TILES;
  }

  /** `Update`: the menu closes when its target dies, leaves scope or walks off. */
  quickTick(): void {
    if (this.quickTarget && !this.isQuickTarget(this.quickTarget)) this.closeQuick();
  }

  /**
   * `RunCommand`'s target test: a player other than the hero, alive, within
   * `MAX_DISTANCE_TILE`. Returns the target or a reason it is refused.
   */
  targetOf(entity: Entity | null | undefined): CommandTarget | string {
    const hero = Store.world?.playerEntity;
    if (!entity || !hero) return t('command.noPlayerUnderCursor');
    if (entity.localPlayer || !entity.playerAnimation || entity.netId === undefined) {
      return t('command.notAPlayer');
    }
    if (entity.dying) return t('command.playerDead');
    const dx = Math.abs(Math.floor(entity.transform!.pos.x) - Math.floor(hero.transform!.pos.x));
    const dy = Math.abs(Math.floor(entity.transform!.pos.z) - Math.floor(hero.transform!.pos.z));
    if (dx > MAX_DISTANCE_TILE || dy > MAX_DISTANCE_TILE)
      return t('command.playerTooFar');
    return {
      netId: entity.netId,
      name: entity.objectNameInWorld ?? `#${entity.netId}`,
      guildRole: entity.guild?.role,
      entity,
    };
  }

  /** True when `entity` would be accepted by `targetOf`; the cursor's name tag reads this. */
  canRunOn(entity: Entity | null | undefined): boolean {
    return typeof this.targetOf(entity) !== 'string';
  }

  /**
   * The right click while an entry is armed (`RunCommand`, `MouseRButtonPush`).
   * Always consumes the click and disarms; returns false when nothing was armed.
   */
  runPendingOn(entity: Entity | null | undefined): boolean {
    const kind = this.pending;
    if (!kind) return false;
    this.disarm();
    this.run(kind, entity);
    return true;
  }

  /** A `/command` line or a window entry, on the player under the cursor. */
  run(kind: CommandKind, entity: Entity | null | undefined): void {
    // Not a `RunCommand` entry: an attack order is the click the attack
    // system already understands, so it keeps the reach of a swing instead
    // of the two tiles the social commands share.
    if (kind === 'attack') {
      this.attack(entity);
      return;
    }
    const target = this.targetOf(entity);
    if (typeof target === 'string') {
      Social.errorMessage(target);
      playUiSound('error');
      return;
    }
    switch (kind) {
      case 'trade':
        if (Store.playerData.level < TRADE_LIMIT_LEVEL) {
          Social.systemMessage(
            t('command.tradeLevel', { level: TRADE_LIMIT_LEVEL })
          );
          return;
        }
        Economy.requestTrade(target);
        return;
      case 'purchase':
        Economy.browseShop(target);
        return;
      case 'party':
        Social.partyInvite(target);
        return;
      case 'whisper':
        Social.setWhisperTarget(target.name);
        Social.openChatInput();
        return;
      case 'guild':
        Social.guildJoin({ netId: target.netId, name: target.name, role: target.guildRole });
        return;
      case 'guildUnion':
        if (!this.masterCheck(target)) return;
        Social.guildRelationRequestSend(target, GuildRelationshipTypeEnum.Alliance, true);
        return;
      case 'rival':
        if (!this.masterCheck(target)) return;
        Social.guildRelationRequestSend(target, GuildRelationshipTypeEnum.Hostility, true);
        return;
      case 'rivalOff':
        if (!this.masterCheck(target)) return;
        Social.guildRelationRequestSend(target, GuildRelationshipTypeEnum.Hostility, false);
        return;
      case 'addFriend':
        Messenger.requestAddFriend(target.name);
        return;
      case 'follow':
        runInAction(() => {
          this.following = target.entity;
        });
        Social.systemMessage(t('command.following', { name: target.name }));
        return;
      case 'battle':
        this.duel(target);
        return;
    }
  }

  /**
   * The quick menu's attack entry. `isAttackableEntity` refuses every player
   * so an ordinary click in a crowd never starts a fight; picking the entry
   * is deliberate, so it gets the player-only test instead.
   */
  private attack(entity: Entity | null | undefined): void {
    const world = Store.world;
    if (!world || !entity || !isAttackablePlayer(world, entity)) {
      Social.errorMessage(t('command.cannotAttack'));
      playUiSound('error');
      return;
    }
    world.attackTarget = entity;
  }

  /** `CommandGuildUnion` / `CommandGuildRival`: both sides must be masters (GlobalText 1320 / 507). */
  private masterCheck(target: CommandTarget): boolean {
    if (!Social.isGuildMaster) {
      Social.systemMessage(t('command.onlyGuildMaster'));
      return false;
    }
    if (target.guildRole !== GuildMemberRoleEnum.GuildMaster) {
      Social.systemMessage(t('command.notGuildMaster'));
      return false;
    }
    return true;
  }

  /** `CommandDual`: start a duel, or stop the one running. */
  private duel(target: CommandTarget): void {
    if (Store.playerData.level < DUEL_LIMIT_LEVEL) {
      Social.errorMessage(t('command.duelLevel', { level: DUEL_LIMIT_LEVEL }));
      return;
    }
    const packet = DuelStartRequestPacket.createPacket();
    packet.PlayerId = target.netId;
    packet.setPlayerName(target.name);
    Store.sendToGS(packet.buffer);
    Social.systemMessage(t('command.duelRequestSent', { name: target.name }));
  }

  /** `/duelend`: `SendDuelStopRequest`. */
  duelStop(): void {
    Store.sendToGS(DuelStopRequestPacket.createPacket().buffer);
  }

  /**
   * `g_iFollowCharacter` (ZzzInterface `MoveHero`): once a second the hero
   * walks to the followed player's tile until it leaves scope or the hero
   * clicks somewhere else. Called by the command window while mounted.
   */
  followTick(): void {
    const target = this.following;
    const world = Store.world;
    const hero = world?.playerEntity;
    if (!target || !world || !hero) return;
    // The followed player is tested on its own components, not on
    // `playersQuery.has`: a miniplex query only indexes entities once
    // something has read its `entities` (`Query.connect`), and nothing
    // reads that one on every map - so `has` answered false for every
    // player and the first tick dropped the follow.
    const gone =
      target.dying ||
      target.objOutOfScope ||
      (target.worldIndex !== undefined && target.worldIndex !== world.mapIndex);
    if (gone) {
      runInAction(() => {
        this.following = null;
      });
      return;
    }
    const tx = target.transform!.pos.x;
    const ty = target.transform!.pos.z;
    const dx = Math.abs(Math.floor(tx) - Math.floor(hero.transform!.pos.x));
    const dy = Math.abs(Math.floor(ty) - Math.floor(hero.transform!.pos.z));
    if (dx <= INVITE_RANGE_TILES && dy <= INVITE_RANGE_TILES) return;
    const moveTo = hero.playerMoveTo;
    if (!moveTo) return;
    moveTo.point.x = tx;
    moveTo.point.y = ty;
    moveTo.handled = false;
    moveTo.sendToServer = true;
  }

  stopFollowing(): void {
    if (!this.following) return;
    runInAction(() => {
      this.following = null;
    });
  }
})();

// A hot update that reaches this module must reload the page: Vite would
// otherwise re-execute it and hand later-loaded importers a second instance
// of this singleton (same guard as store.ts).
const hot = (import.meta as { hot?: { decline(): void } }).hot;
if (hot) hot.decline();
