import { t } from './i18n';
import { action, computed, makeObservable, observable, runInAction } from 'mobx';
import { Store } from './store';
import {
  CHAT_COOLDOWN_MS,
  CHAT_FILTERS,
  CHAT_HISTORY_SIZE,
  SYSTEM_LINE_REPEAT_MS,
  CHAT_INPUT_PREFIX,
  CHAT_LOG_DEFAULT_ALPHA,
  CHAT_LOG_LINES_STEP,
  CHAT_LOG_MAX_LINES,
  CHAT_LOG_MIN_LINES,
  CHAT_SHOWING_LINES,
  ChatLineType,
  MAX_CHAT_LENGTH,
  MAX_CHAT_LINES,
  type ChatFilterKey,
  type ChatInputMode,
  type ChatLine,
} from './common/chat';
import { matchEmoteWord } from './common/emotes';
import {
  emojiBubbleToken,
  matchEmojiBubbleWord,
  type EmojiBubbleId,
} from './common/emojiBubbles';
import { localCommandOf } from './common/chatCommands';
import { Commands } from './commands';
import {
  CancelGuildCreationPacket,
  GuildCreateRequestPacket,
  GuildJoinRequestPacket,
  GuildJoinResponsePacket,
  GuildKickPlayerRequestPacket,
  GuildListRequestPacket,
  GuildMasterAnswerPacket,
  GuildRelationshipChangeRequestPacket,
  GuildRelationshipChangeResponsePacket,
  GuildRequestTypeEnum,
  GuildRelationshipTypeEnum,
  GuildRoleAssignRequestPacket,
  GuildWarResponsePacket,
  PartyInviteRequestPacket,
  PartyInviteResponsePacket,
  PartyListRequestPacket,
  PartyPlayerKickRequestPacket,
  PublicChatMessagePacket,
  RemoveAllianceGuildRequestPacket,
  RequestAllianceListPacket,
  WhisperMessagePacket,
} from './common/packets/ClientToServerPackets';
import { GuildMemberRoleEnum } from './common/packets/ServerToClientPackets';
import {
  GuildRelation,
  parseSelfDefense,
  SELF_DEFENSE_MS,
} from './common/nameTags';
import { playUiSound } from './libs/sfx';

export type PartyMember = {
  name: string;
  index: number;
  mapId: number;
  x: number;
  y: number;
  currentHealth: number;
  maximumHealth: number;
  /** PartyHealthUpdate: 0..10 tenths (`stepHP`), -1 until the first update. */
  healthStep: number;
};

export type GuildMember = {
  name: string;
  /** `Server` in the original: -1 offline, otherwise the server id. */
  server: number;
  role: GuildMemberRoleEnum;
};

/** One row of `AllianceList` (`ReceiveUnionList`). */
export type AllianceGuild = {
  name: string;
  memberCount: number;
  logo: number[];
};

/**
 * `EnableGuildWar` / `GuildWarName` / `GuildWarTeam` (WSclient.cpp:221). The
 * team code decides the `GuildColor` of the chat boxes over a head.
 */
export type GuildWar = {
  enemyGuild: string;
  /** `GuildWarTypeEnum`: a normal war or a Battle Soccer match. */
  soccer: boolean;
  /** `TeamCode` from GuildWarDeclared. */
  team: number;
  ownScore: number;
  enemyScore: number;
};

/**
 * GuildSoccerScoreUpdate (F3 23): the stadium scoreboard the original's
 * `CNewUIBattleSoccerScore` draws. Sent to players and observers alike.
 */
export type SoccerScore = {
  redTeam: string;
  blueTeam: string;
  redGoals: number;
  blueGoals: number;
  /** GuildSoccerTimeUpdate (F3 22): remaining seconds, -1 until the first tick. */
  seconds: number;
};

/** A yes/no question from another player (party invite, guild join). */
export type SocialRequest = {
  requesterId: number;
  requesterName: string;
};

/** `GuildConstants::GuildTab`. */
export type GuildTab = 'info' | 'members' | 'alliance';

/** `PARTY_MAX`: a party holds five. */
export const MAX_PARTY_MEMBERS = 5;
/** `abs(dx) <= 1 && abs(dy) <= 1` (ZzzInterface.cpp:4410): invite reach. */
export const INVITE_RANGE_TILES = 1;
/** OpenMU caps Account.SecurityCode at 10 characters (AccountService.cs). */
export const GUILD_SECURITY_CODE_MAX = 10;

const SYSTEM_ROW = '';

/**
 * Chat, party and guild state - the client side of the original's
 * `CNewUIChatLogWindow` / `CNewUIChatInputBox`, `CNewUIPartyInfoWindow` and
 * `CNewUIGuildInfoWindow`, with the packet plumbing of WSclient.cpp.
 */
export const Social = new (class _Social {
  // ---- chat ---------------------------------------------------------------

  chatLines: ChatLine[] = [];
  chatFilter: ChatFilterKey = 'all';
  chatInputOpen = false;
  chatInputMode: ChatInputMode = 'normal';
  /** `m_pWhsprIDInputBox`: a name here turns the next line into a whisper. */
  whisperTarget = '';
  /** `m_bWhisperSend` (F3): the whisper field is shown and used. */
  whisperEnabled = true;
  /** `m_bBlockWhisper`: incoming whispers are dropped. */
  blockWhisper = false;
  /** `m_bShowSystemMessages`: system/error lines show in the log. */
  showSystemMessages = true;
  /** `m_bShowFrame`: the log gets a frame and scrollbar while on. */
  chatLogFramed = false;
  chatLogVisible = true;
  /** `m_nShowingLines` (3..15 by three). */
  chatLogLines = CHAT_SHOWING_LINES;
  /** `m_fBackAlpha` of the framed log. */
  chatLogAlpha = CHAT_LOG_DEFAULT_ALPHA;
  chatHistory: string[] = [];
  whisperHistory: string[] = [];

  private nextLineId = 1;
  private lastChatTime = 0;

  // ---- party --------------------------------------------------------------

  partyMembers: PartyMember[] = [];
  partyRequest: SocialRequest | null = null;
  partyWindowEnabled = false;

  // ---- guild --------------------------------------------------------------

  /** The hero's own guild (from AssignCharacterToGuild), null when none. */
  myGuild: { id: number; role: GuildMemberRoleEnum } | null = null;
  guildMembers: GuildMember[] = [];
  guildTotalScore = 0;
  guildCurrentScore = 0;
  guildRivalName = '';
  guildJoinRequest: SocialRequest | null = null;
  guildWindowEnabled = false;
  /** `m_nCurrentTab` of `CNewUIGuildInfoWindow`: info / members / alliance. */
  guildTab: GuildTab = 'info';
  /** `ReceiveUnionList`: the guilds in the hero's alliance. */
  allianceGuilds: AllianceGuild[] = [];
  /** `EnableGuildWar`: null while no war is running. */
  guildWar: GuildWar | null = null;
  /** The Battle Soccer scoreboard: null while no match runs on the stadium. */
  battleSoccer: SoccerScore | null = null;
  /** GuildWarRequest: another master asks for a war, yes/no. */
  guildWarRequest: { guildName: string; soccer: boolean } | null = null;
  /** GuildRelationshipRequest: an alliance / hostility offer, yes/no. */
  guildRelationRequest: {
    senderId: number;
    senderName: string;
    relationship: GuildRelationshipTypeEnum;
    join: boolean;
  } | null = null;
  /** ShowGuildMasterDialog: the "found a guild?" question is up. */
  guildMasterDialog = false;
  /** ShowGuildCreationDialog: the name + emblem editor is up. */
  guildCreationDialog = false;
  guildCreationPending = false;
  /** `CGuildBreakPasswordMsgBoxLayout`: whose kick the code is asked for. */
  guildKickPrompt: { name: string; self: boolean } | null = null;

  // ---- self-defense -------------------------------------------------------

  /** Attackers the hero may fight back at, name -> end time (ms). Polled by
   * the name tags every frame, so it needs no observability or timer. */
  private selfDefense = new Map<string, number>();

  constructor() {
    makeObservable(this, {
      chatLines: observable.shallow,
      chatFilter: observable,
      visibleChatLines: computed,
      chatInputOpen: observable,
      chatInputMode: observable,
      whisperTarget: observable,
      whisperEnabled: observable,
      blockWhisper: observable,
      showSystemMessages: observable,
      chatLogFramed: observable,
      chatLogVisible: observable,
      chatLogLines: observable,
      chatLogAlpha: observable,
      toggle: action,
      cycleChatLogSize: action,
      cycleChatLogAlpha: action,
      chatHistory: observable.shallow,
      whisperHistory: observable.shallow,
      partyMembers: observable,
      partyRequest: observable,
      partyWindowEnabled: observable,
      myGuild: observable,
      guildMembers: observable,
      guildTotalScore: observable,
      guildCurrentScore: observable,
      guildRivalName: observable,
      guildJoinRequest: observable,
      guildWindowEnabled: observable,
      guildTab: observable,
      allianceGuilds: observable,
      guildWar: observable,
      battleSoccer: observable,
      guildWarRequest: observable,
      guildRelationRequest: observable,
      guildMasterDialog: observable,
      guildCreationDialog: observable,
      guildCreationPending: observable,
      guildKickPrompt: observable,
      addChatLine: action,
      openChatInput: action,
      closeChatInput: action,
      setChatFilter: action,
      setPartyMembers: action,
      removePartyMember: action,
      setPartyHealth: action,
      reset: action,
    });
  }

  /** Everything is per character: cleared on select / relog. */
  reset(): void {
    this.chatLines = [];
    this.lastSystemLine = { text: '', at: 0 };
    this.chatInputOpen = false;
    this.partyMembers = [];
    this.partyRequest = null;
    this.myGuild = null;
    this.guildMembers = [];
    this.guildTotalScore = 0;
    this.guildCurrentScore = 0;
    this.guildRivalName = '';
    this.guildJoinRequest = null;
    this.guildTab = 'info';
    this.allianceGuilds = [];
    this.guildWar = null;
    this.battleSoccer = null;
    this.guildWarRequest = null;
    this.guildRelationRequest = null;
    this.guildMasterDialog = false;
    this.guildCreationDialog = false;
    this.guildCreationPending = false;
    this.guildKickPrompt = null;
    this.selfDefense.clear();
  }

  // ---- self-defense -------------------------------------------------------

  /** `SelfDefensePlugIn.cs` announces begin/end only in a blue message;
   * track the pairs where the hero is the defender. */
  trackSelfDefense(text: string): void {
    const parsed = parseSelfDefense(text);
    if (!parsed || parsed.defender !== Store.playerData.name) return;
    if (parsed.active) {
      this.selfDefense.set(parsed.attacker, Date.now() + SELF_DEFENSE_MS);
    } else {
      this.selfDefense.delete(parsed.attacker);
    }
  }

  isSelfDefenseActive(name: string | undefined): boolean {
    if (!name) return false;
    const until = this.selfDefense.get(name);
    if (until === undefined) return false;
    if (until <= Date.now()) {
      this.selfDefense.delete(name);
      return false;
    }
    return true;
  }

  // ---- chat ---------------------------------------------------------------

  /** `CNewUIChatLogWindow::AddText`. */
  addChatLine(sender: string, text: string, type: ChatLineType): void {
    const line: ChatLine = { id: this.nextLineId++, sender, text, type };
    const next = this.chatLines.concat(line);
    // `RemoveFrontLine` once MAX_NUMBER_OF_LINES is reached.
    this.chatLines =
      next.length > MAX_CHAT_LINES ? next.slice(next.length - MAX_CHAT_LINES) : next;
  }

  /**
   * `CheckChatRedundancy`, with a clock: the original re-prints a repeated
   * system line, but our callers can fire on every click or frame, so the
   * same text within `SYSTEM_LINE_REPEAT_MS` of the last one is dropped.
   */
  private lastSystemLine = { text: '', at: 0 };

  private systemLine(text: string, type: ChatLineType): void {
    if (!text) return;
    const now = Date.now();
    const last = this.lastSystemLine;
    if (last.text === text && now - last.at < SYSTEM_LINE_REPEAT_MS) return;
    this.lastSystemLine = { text, at: now };
    this.addChatLine(SYSTEM_ROW, text, type);
  }

  /** `g_pSystemLogBox->AddText(..., TYPE_SYSTEM_MESSAGE)`. */
  systemMessage(text: string): void {
    this.systemLine(text, ChatLineType.System);
  }

  /** `g_pSystemLogBox->AddText(..., TYPE_ERROR_MESSAGE)`. */
  errorMessage(text: string): void {
    this.systemLine(text, ChatLineType.Error);
  }

  setChatFilter(filter: ChatFilterKey): void {
    this.chatFilter = filter;
  }

  /**
   * The lines the log shows: the current filter tab's types, less the
   * system / error lines while `m_bShowSystemMessages` is off. Cached until
   * a line, the tab or the switch changes, so the log does not filter 200
   * lines per render.
   */
  get visibleChatLines(): ChatLine[] {
    const tab = CHAT_FILTERS.find(f => f.key === this.chatFilter);
    const types = tab?.types ?? null;
    const showSystem = this.showSystemMessages;
    if (!types && showSystem) return this.chatLines;
    return this.chatLines.filter(line => {
      if (types && !types.includes(line.type)) return false;
      if (!showSystem && (line.type === ChatLineType.System || line.type === ChatLineType.Error)) {
        return false;
      }
      return true;
    });
  }

  /** The input box's on/off buttons. */
  toggle(
    key:
      | 'whisperEnabled'
      | 'blockWhisper'
      | 'showSystemMessages'
      | 'chatLogFramed'
      | 'chatLogVisible'
  ): void {
    this[key] = !this[key];
  }

  /** `SetSizeAuto`: 3 → 6 → … → 15 → 3 showing lines. */
  cycleChatLogSize(): void {
    const next = this.chatLogLines + CHAT_LOG_LINES_STEP;
    this.chatLogLines = next > CHAT_LOG_MAX_LINES ? CHAT_LOG_MIN_LINES : next;
  }

  /** The transparency button: +0.2, wrapping from 0.9 to 0.2. */
  cycleChatLogAlpha(): void {
    const next = Math.round((this.chatLogAlpha + 0.2) * 10) / 10;
    this.chatLogAlpha = next > 0.9 ? 0.2 : next;
  }

  openChatInput(mode?: ChatInputMode): void {
    if (mode) this.chatInputMode = mode;
    this.chatInputOpen = true;
  }

  closeChatInput(): void {
    this.chatInputOpen = false;
  }

  /** `SetWhsprID` (the command window's Whisper entry). */
  setWhisperTarget(name: string): void {
    runInAction(() => {
      this.whisperTarget = name.slice(0, 10);
      if (name.length > 0) this.whisperEnabled = true;
    });
  }

  /**
   * Enter in the input box (NewUIChatInputBox.cpp:505). A whisper goes to
   * the name in the whisper field; everything else is public chat with the
   * party/guild prefix of the current mode. `/commands` go through untouched:
   * OpenMU parses them on the server.
   */
  sendChat(rawText: string): boolean {
    const text = rawText.replace(/[\r\n]/g, '').slice(0, MAX_CHAT_LENGTH);
    if (!text.trim()) return false;

    const now = performance.now();
    if (now - this.lastChatTime < CHAT_COOLDOWN_MS) return false;
    this.lastChatTime = now;

    const heroName = Store.playerData.name;
    // A `/command` is never a whisper, whatever the whisper field holds
    // (the original checks the slash before the whisper id).
    const whisperTo =
      this.whisperEnabled && !text.startsWith('/') ? this.whisperTarget.trim() : '';

    if (whisperTo) {
      // Name (10) + message: getRequiredSize counts from the code byte.
      const packet = WhisperMessagePacket.createPacket(
        WhisperMessagePacket.getRequiredSize(10 + text.length)
      );
      packet.setReceiverName(whisperTo);
      packet.setMessage(text);
      Store.sendToGS(packet.buffer);
      // The original logs an outgoing whisper under the hero's name.
      this.addChatLine(heroName, text, ChatLineType.Whisper);
      this.remember(this.whisperHistory, whisperTo);
      return true;
    }

    // `CheckCommand` (ZzzInterface.cpp:3990): `/trade`, `/party`, `/guild`,
    // `/union`… act on the player under the cursor and are never sent.
    const local = localCommandOf(text);
    if (local?.local) {
      if (local.name === '/duelend') Commands.duelStop();
      else Commands.run(local.local, Store.world?.currentPointerTarget);
      this.remember(this.chatHistory, text);
      return true;
    }

    const prefix = text.startsWith('/') ? '' : CHAT_INPUT_PREFIX[this.chatInputMode];
    const message = (prefix + text).slice(0, MAX_CHAT_LENGTH);

    // `CheckChatText` (NewUIChatInputBox.cpp:571) runs on the typed line
    // before it is sent, and only for public chat - never for a whisper and
    // never for a `/command`. The original also skipped it while riding a
    // mount outside a safe zone; mounts are not ported, so that gate is moot.
    if (!text.startsWith('/')) {
      const emote = matchEmoteWord(text);
      if (emote && Store.world) Store.world.emoteRequest = emote;

      // A line that is nothing but an emoji token pops the bubble here too.
      // Everyone else gets it from this very message (the ChatMessage handler
      // in logic.ts), and waiting for the server to echo it back would show
      // the sender their own bubble a round trip late. Public chat only: a
      // party line reaches members three maps away, where a bubble would hang
      // over nobody.
      const bubble = prefix ? null : matchEmojiBubbleWord(text);
      if (bubble && Store.world) Store.world.emojiRequest = bubble;
    }

    const packet = PublicChatMessagePacket.createPacket(
      PublicChatMessagePacket.getRequiredSize(10 + message.length)
    );
    packet.setCharacter(heroName);
    packet.setMessage(message);
    Store.sendToGS(packet.buffer);

    this.remember(this.chatHistory, text);
    return true;
  }

  /**
   * The radial menu picked an emoji bubble: send it as the plain chat line its
   * token stands for (common/emojiBubbles.ts). Always public chat, never the
   * prefix of the current input mode - the bubble is drawn over a body in the
   * world, so it has to go to the players who can see that body.
   *
   * It is not routed through `sendChat`: that one whispers when a whisper
   * target is set, and a heart popped from the wheel is not a whisper.
   *
   * Returns false when the cooldown refuses the line, so the caller can drop
   * the whole thing rather than show the sender a bubble nobody else gets.
   */
  broadcastEmojiBubble(id: EmojiBubbleId): boolean {
    // Offline there is nothing to send to, and the local bubble is the point.
    if (Store.isOffline) return true;

    const now = performance.now();
    if (now - this.lastChatTime < CHAT_COOLDOWN_MS) return false;
    this.lastChatTime = now;

    const token = emojiBubbleToken(id);
    const packet = PublicChatMessagePacket.createPacket(
      PublicChatMessagePacket.getRequiredSize(10 + token.length)
    );
    packet.setCharacter(Store.playerData.name);
    packet.setMessage(token);
    Store.sendToGS(packet.buffer);

    return true;
  }

  private remember(history: string[], entry: string): void {
    runInAction(() => {
      const next = history.filter(h => h !== entry);
      next.push(entry);
      if (next.length > CHAT_HISTORY_SIZE) next.shift();
      if (history === this.chatHistory) this.chatHistory = next;
      else this.whisperHistory = next;
    });
  }

  // ---- party --------------------------------------------------------------

  get inParty(): boolean {
    return this.partyMembers.length > 0;
  }

  /** `Party[0]` is always the leader. */
  get isPartyLeader(): boolean {
    return (
      this.partyMembers.length > 0 &&
      this.partyMembers[0].name === Store.playerData.name
    );
  }

  setPartyMembers(members: PartyMember[]): void {
    const previous = new Map(this.partyMembers.map(m => [m.name, m]));
    this.partyMembers = members.map(m => ({
      ...m,
      healthStep: previous.get(m.name)?.healthStep ?? m.healthStep,
    }));
  }

  /** RemovePartyMember: the hero's own index dissolves the whole list. */
  removePartyMember(index: number): void {
    const me = this.partyMembers.find(m => m.name === Store.playerData.name);
    if (!me || me.index === index) {
      this.partyMembers = [];
      this.errorMessage(t('party.left'));
      return;
    }
    this.partyMembers = this.partyMembers.filter(m => m.index !== index);
  }

  setPartyHealth(steps: { index: number; value: number }[]): void {
    for (const { index, value } of steps) {
      const member = this.partyMembers[index];
      if (member) member.healthStep = Math.min(10, Math.max(0, value));
    }
  }

  /** `SendPartyInviteRequest` after the leader-only check (CommandParty). */
  partyInvite(target: { netId: number; name: string }): void {
    if (this.inParty && !this.isPartyLeader) {
      this.errorMessage(t('party.onlyLeaderInvites'));
      return;
    }
    if (this.partyMembers.length >= MAX_PARTY_MEMBERS) {
      this.errorMessage(t('party.full'));
      return;
    }
    const packet = PartyInviteRequestPacket.createPacket();
    packet.TargetPlayerId = target.netId;
    Store.sendToGS(packet.buffer);
    this.systemMessage(t('party.invitationSent', { name: target.name }));
  }

  /** The `CPartyMsgBoxLayout` answer. */
  partyRespond(accepted: boolean): void {
    const request = this.partyRequest;
    if (!request) return;
    const packet = PartyInviteResponsePacket.createPacket();
    packet.Accepted = accepted;
    packet.RequesterId = request.requesterId;
    Store.sendToGS(packet.buffer);
    runInAction(() => {
      this.partyRequest = null;
    });
  }

  requestPartyList(): void {
    Store.sendToGS(PartyListRequestPacket.createPacket().buffer);
  }

  /** The leader's X on a row, or the hero's own row to leave. */
  partyKick(index: number): void {
    const packet = PartyPlayerKickRequestPacket.createPacket();
    packet.PlayerIndex = index;
    Store.sendToGS(packet.buffer);
  }

  partyLeave(): void {
    const me = this.partyMembers.find(m => m.name === Store.playerData.name);
    if (me) this.partyKick(me.index);
  }

  // ---- guild --------------------------------------------------------------

  get isGuildMaster(): boolean {
    return this.myGuild?.role === GuildMemberRoleEnum.GuildMaster;
  }

  requestGuildList(): void {
    Store.sendToGS(GuildListRequestPacket.createPacket().buffer);
  }

  /** `CommandGuild`: ask a guild master standing next to the hero. */
  guildJoin(master: {
    netId: number;
    name: string;
    role: GuildMemberRoleEnum | undefined;
  }): void {
    if (this.myGuild) {
      this.systemMessage(t('guild.alreadyInGuild'));
      return;
    }
    if (master.role !== GuildMemberRoleEnum.GuildMaster) {
      this.systemMessage(t('guild.notGuildMaster'));
      return;
    }
    const packet = GuildJoinRequestPacket.createPacket();
    packet.GuildMasterPlayerId = master.netId;
    Store.sendToGS(packet.buffer);
    this.systemMessage(t('guild.joinRequestSent', { name: master.name }));
  }

  guildJoinRespond(accepted: boolean): void {
    const request = this.guildJoinRequest;
    if (!request) return;
    const packet = GuildJoinResponsePacket.createPacket();
    packet.Accepted = accepted;
    packet.RequesterId = request.requesterId;
    Store.sendToGS(packet.buffer);
    runInAction(() => {
      this.guildJoinRequest = null;
    });
  }

  /**
   * `CGuildBreakPasswordMsgBoxLayout` (NewUICustomMessageBox.cpp:7110): every
   * kick path - disband, leave, throw a member out - asks for the account's
   * security code first (GlobalText 427 / 428) and only then sends the
   * request. OpenMU compares it with `Account.SecurityCode`, which its admin
   * panel requires on every account it creates, so a request that carries no
   * code is answered with a "Wrong Security Code." message and nothing else.
   */
  promptGuildKick(name: string): void {
    runInAction(() => {
      this.guildKickPrompt = { name, self: name === Store.playerData.name };
    });
  }

  cancelGuildKick(): void {
    runInAction(() => {
      this.guildKickPrompt = null;
    });
  }

  confirmGuildKick(securityCode: string): void {
    const target = this.guildKickPrompt;
    if (!target) return;
    this.guildKick(target.name, securityCode);
    runInAction(() => {
      this.guildKickPrompt = null;
    });
  }

  /** Kick another member (master only) or the hero (leave / disband). */
  guildKick(name: string, securityCode = ''): void {
    // Name (10) + the security code, sized the way OpenMU's own
    // `GuildKickPlayerRequest.GetRequiredSize` sizes it: 13 + content + 1.
    const code = securityCode.slice(0, GUILD_SECURITY_CODE_MAX);
    const packet = GuildKickPlayerRequestPacket.createPacket(
      GuildKickPlayerRequestPacket.getRequiredSize(10 + code.length + 1)
    );
    packet.setPlayerName(name);
    packet.setSecurityCode(code);
    Store.sendToGS(packet.buffer);
  }

  guildLeave(securityCode = ''): void {
    this.guildKick(Store.playerData.name, securityCode);
  }

  /**
   * GuildMasterAnswer: yes opens the creation dialog, no ends the talk.
   *
   * The creation dialog is opened here, not on `ShowGuildCreationDialog`:
   * OpenMU's `GuildMasterAnswerAction` only sends that packet while the
   * player state is `EnteredWorld`, and talking to the NPC has already
   * advanced it to `NpcDialogOpened` - so the answer only resets the state
   * and nothing comes back (verified live, 2026-08-30). The packet handler
   * stays for a server that does send it; opening twice is harmless.
   */
  guildMasterAnswer(create: boolean): void {
    const packet = GuildMasterAnswerPacket.createPacket();
    packet.ShowCreationDialog = create;
    Store.sendToGS(packet.buffer);
    runInAction(() => {
      this.guildMasterDialog = false;
      if (create && !this.myGuild) {
        this.guildCreationDialog = true;
        this.guildCreationPending = false;
      }
    });
  }

  guildCreate(name: string, emblem: number[]): boolean {
    const guildName = name.trim().slice(0, 8);
    if (guildName.length < 1) {
      playUiSound('error');
      return false;
    }
    const packet = GuildCreateRequestPacket.createPacket();
    packet.setGuildName(guildName);
    packet.setGuildEmblem(emblem);
    Store.sendToGS(packet.buffer);
    runInAction(() => {
      this.guildCreationPending = true;
    });
    return true;
  }

  cancelGuildCreation(): void {
    Store.sendToGS(CancelGuildCreationPacket.createPacket().buffer);
    runInAction(() => {
      this.guildCreationDialog = false;
      this.guildCreationPending = false;
    });
  }

  // ---- guild roles --------------------------------------------------------

  /**
   * `SendGuildRoleAssignRequest` (NewUICustomMessageBox.cpp:7444). The
   * original charges a Chaos/Soul gem for an appointment and sends `Type` 2;
   * "cancel position" (NewUICommonMessageBox.cpp:3004) sends `Type` 3 with
   * `G_PERSON`. OpenMU ignores `Type`, so the two are kept apart only to stay
   * on the wire format the original produced. The list is re-read afterwards,
   * as the original does.
   */
  guildAssignRole(name: string, role: GuildMemberRoleEnum): void {
    if (!this.isGuildMaster) {
      this.errorMessage(t('guild.onlyMasterAppoints'));
      return;
    }
    const packet = GuildRoleAssignRequestPacket.createPacket();
    packet.Type = role === GuildMemberRoleEnum.NormalMember ? 3 : 2;
    packet.Role = role;
    packet.setPlayerName(name);
    Store.sendToGS(packet.buffer);
    this.requestGuildList();
  }

  // ---- alliance / hostility ----------------------------------------------

  /** `SendRequestAllianceList` (WSclient.cpp:7479). */
  requestAllianceList(): void {
    Store.sendToGS(RequestAllianceListPacket.createPacket().buffer);
  }

  /**
   * `SendGuildRelationShipChangeRequest`: the offer goes to the *player* the
   * hero has selected, who has to be the other guild's master, so the target
   * is a net id and not a guild name.
   */
  guildRelationRequestSend(
    target: { netId: number; name: string },
    relationship: GuildRelationshipTypeEnum,
    join: boolean
  ): void {
    if (!this.isGuildMaster) {
      this.errorMessage(t('guild.onlyMasterCan'));
      return;
    }
    const packet = GuildRelationshipChangeRequestPacket.createPacket();
    packet.RelationshipType = relationship;
    packet.RequestType = join ? GuildRequestTypeEnum.Join : GuildRequestTypeEnum.Leave;
    packet.TargetPlayerId = target.netId;
    Store.sendToGS(packet.buffer);
    this.systemMessage(
      relationship === GuildRelationshipTypeEnum.Alliance
        ? t('guild.allianceRequestSent', { name: target.name })
        : t('guild.hostilityRequestSent', { name: target.name })
    );
  }

  /** The yes/no answer to an incoming alliance / hostility offer. */
  guildRelationRespond(accepted: boolean): void {
    const request = this.guildRelationRequest;
    if (!request) return;
    const packet = GuildRelationshipChangeResponsePacket.createPacket();
    packet.RelationshipType = request.relationship;
    packet.RequestType = request.join
      ? GuildRequestTypeEnum.Join
      : GuildRequestTypeEnum.Leave;
    packet.Response = accepted;
    packet.TargetPlayerId = request.senderId;
    Store.sendToGS(packet.buffer);
    runInAction(() => {
      this.guildRelationRequest = null;
    });
  }

  /** `SendRemoveAllianceGuildRequest` (NewUICommonMessageBox.cpp:3365). */
  removeAllianceGuild(guildName: string): void {
    const packet = RemoveAllianceGuildRequestPacket.createPacket();
    packet.setGuildName(guildName.slice(0, 8));
    Store.sendToGS(packet.buffer);
  }

  // ---- guild war ----------------------------------------------------------

  /** `SendGuildWarResponse` (NewUICommonMessageBox.cpp:1418). */
  guildWarRespond(accepted: boolean): void {
    if (!this.guildWarRequest) return;
    const packet = GuildWarResponsePacket.createPacket();
    packet.Accepted = accepted;
    Store.sendToGS(packet.buffer);
    runInAction(() => {
      this.guildWarRequest = null;
    });
  }

  /**
   * `GuildTeam` (WSclient.cpp:221): 0 for everyone, 1 for a guild mate, 2 for
   * a member of the guild we are at war with. It is what picks the background
   * of the chat boxes over a head.
   */
  guildTeamOf(guildId: number | undefined): number {
    if (guildId === undefined) return 0;
    if (this.myGuild && guildId === this.myGuild.id) return 1;
    const war = this.guildWar;
    if (war && Store.guilds.get(guildId)?.name === war.enemyGuild) return 2;
    return 0;
  }

  /**
   * The `GR_*` byte the original got from its guild-viewport packet. OpenMU
   * sends no such field, so it is derived: the hero's own guild and every
   * guild in the alliance are a union, the rival named by `GuildList` and the
   * guild we are at war with are hostile, everyone else is nobody.
   */
  guildRelationOf(guildId: number | undefined): GuildRelation {
    if (guildId === undefined) return GuildRelation.None;
    const mine = this.myGuild;
    if (mine && guildId === mine.id) return GuildRelation.Union;

    const guild = Store.guilds.get(guildId);
    if (!guild) return GuildRelation.None;

    if (this.guildRivalName && guild.name === this.guildRivalName) {
      return GuildRelation.Rival;
    }
    if (this.guildWar && guild.name === this.guildWar.enemyGuild) {
      return GuildRelation.Rival;
    }
    if (this.allianceGuilds.some(g => g.name === guild.name)) {
      return GuildRelation.Union;
    }

    const myAlliance = mine ? Store.guilds.get(mine.id)?.alliance : '';
    if (myAlliance && guild.alliance && guild.alliance === myAlliance) {
      return GuildRelation.Union;
    }

    return GuildRelation.None;
  }
})();

// A hot update that reaches this module must reload the page: Vite would
// otherwise re-execute it and hand later-loaded importers a second instance
// of this singleton (same guard as store.ts).
const hot = (import.meta as { hot?: { decline(): void } }).hot;
if (hot) hot.decline();
