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

/**
 * `CNewUICommandWindow` (NewUICommandWindow.cpp) and the `/command` lines of
 * `CheckCommand` (ZzzInterface.cpp:3990): every player-to-player action -
 * trade, purchase, party, whisper, guild, alliance, hostility, add friend,
 * follow, duel - run on the **character under the cursor**. The window arms
 * one (`m_iCurSelectCommand`), the cursor turns into `CURSOR_IDSELECT`, and
 * the next right click on a player runs it (`RunCommand`); a typed `/trade`
 * runs it at once on whoever is under the cursor.
 *
 * The window is the UI (ui/pages/worldPage/components/commandWindow); the
 * packets are the ones the social / economy / messenger stores already send.
 */

/** `MAX_DISTANCE_TILE` (_define.h:597): how far the target may stand, in tiles. */
const MAX_DISTANCE_TILE = 2;
/** `TRADELIMITLEVEL`: no trading below this level (GlobalText 478). */
const TRADE_LIMIT_LEVEL = 6;
/** `CommandDual`: the duel needs level 30 (GlobalText 2704). */
const DUEL_LIMIT_LEVEL = 30;

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

  constructor() {
    makeObservable(this, {
      windowOpen: observable,
      pending: observable,
      following: observable.ref,
      toggleWindow: action,
      closeWindow: action,
      arm: action,
      disarm: action,
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
    });
  }

  /**
   * `RunCommand`'s target test: a player other than the hero, alive, within
   * `MAX_DISTANCE_TILE`. Returns the target or a reason it is refused.
   */
  targetOf(entity: Entity | null | undefined): CommandTarget | string {
    const hero = Store.world?.playerEntity;
    if (!entity || !hero) return 'No player under the cursor.';
    if (entity.localPlayer || !entity.playerAnimation || entity.netId === undefined) {
      return 'That is not a player.';
    }
    if (entity.dying) return 'That player is dead.';
    const dx = Math.abs(Math.floor(entity.transform!.pos.x) - Math.floor(hero.transform!.pos.x));
    const dy = Math.abs(Math.floor(entity.transform!.pos.z) - Math.floor(hero.transform!.pos.z));
    if (dx > MAX_DISTANCE_TILE || dy > MAX_DISTANCE_TILE) return 'That player is too far away.';
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
    const target = this.targetOf(entity);
    if (typeof target === 'string') {
      Social.errorMessage(target);
      playUiSound('error');
      return;
    }
    switch (kind) {
      case 'trade':
        if (Store.playerData.level < TRADE_LIMIT_LEVEL) {
          Social.systemMessage(`You cannot trade below level ${TRADE_LIMIT_LEVEL}.`);
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
        Social.systemMessage(`Following ${target.name}.`);
        return;
      case 'battle':
        this.duel(target);
        return;
    }
  }

  /** `CommandGuildUnion` / `CommandGuildRival`: both sides must be masters (GlobalText 1320 / 507). */
  private masterCheck(target: CommandTarget): boolean {
    if (!Social.isGuildMaster) {
      Social.systemMessage('Only a guild master can do that.');
      return false;
    }
    if (target.guildRole !== GuildMemberRoleEnum.GuildMaster) {
      Social.systemMessage('That player is not a guild master.');
      return false;
    }
    return true;
  }

  /** `CommandDual`: start a duel, or stop the one running. */
  private duel(target: CommandTarget): void {
    if (Store.playerData.level < DUEL_LIMIT_LEVEL) {
      Social.errorMessage(`You need level ${DUEL_LIMIT_LEVEL} to duel.`);
      return;
    }
    const packet = DuelStartRequestPacket.createPacket();
    packet.PlayerId = target.netId;
    packet.setPlayerName(target.name);
    Store.sendToGS(packet.buffer);
    Social.systemMessage(`Duel request sent to ${target.name}.`);
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
    if (target.dying || !world.playersQuery.has(target as never)) {
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
