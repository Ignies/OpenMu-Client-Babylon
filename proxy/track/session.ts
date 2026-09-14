import {
  AddCharactersToScopePacket,
  AddNpcsToScopePacket,
  AddTransformedCharactersToScopePacket,
  AssignCharacterToGuildPacket,
  CharacterInformationPacket,
  CharacterLevelUpdatePacket,
  CharacterListPacket,
  CurrentHealthAndShieldPacket,
  ExperienceGainedPacket,
  GameServerEnteredPacket,
  GuildInformationPacket,
  HeroStateChangedPacket,
  InventoryMoneyUpdatePacket,
  ItemAddedToInventoryPacket,
  ItemBoughtPacket,
  ItemsDroppedPacket,
  LogoutResponsePacket,
  MapChangedPacket,
  MapObjectOutOfScopePacket,
  MaximumHealthAndShieldPacket,
  NpcItemSellResultPacket,
  ObjectGotKilledPacket,
  ObjectMovedPacket,
  RespawnAfterDeathPacket,
  ServerMessagePacket,
  TradeFinishedPacket,
  TradeRequestAnswerPacket,
} from '../../src/common/packets/ServerToClientPackets';
import {
  AreaSkillPacket,
  ConsumeItemRequestPacket,
  CreateCharacterPacket,
  DeleteCharacterPacket,
  DropItemRequestPacket,
  EnterGateRequestPacket,
  GuildJoinRequestPacket,
  HitRequestPacket,
  InstantMoveRequestPacket,
  ItemMoveRequestPacket,
  ItemRepairPacket,
  PartyInviteRequestPacket,
  PlayerShopItemBuyRequestPacket,
  PlayerShopOpenPacket,
  PublicChatMessagePacket,
  SelectCharacterPacket,
  SellItemToNpcRequestPacket,
  ServerChangeAuthenticationPacket,
  TalkToNpcRequestPacket,
  TargetedSkillPacket,
  TradeRequestPacket,
  TradeRequestResponsePacket,
  WalkRequestPacket,
  WarpCommandRequestPacket,
  WhisperMessagePacket,
} from '../../src/common/packets/ClientToServerPackets';
import {
  className,
  heroStateName,
  type EventKind,
  type TrackEvent,
  type TrackedPlayer,
} from '../../src/common/adminProtocol';
import { Xor3Byte } from '../../src/common/encryption/xor3';
import { FrameReader, type Frame } from './frames';
import { itemName, mapName, monsterName, storageName } from './names';

/**
 * One socket's player, as far as the packets say.
 *
 * Frames come in from both directions (`feedClient`, `feedServer`); the
 * state below and a stream of `TrackEvent`s come out. Nothing here is
 * written from anywhere else: the account arrives from presence once the
 * server has accepted the login, and everything after that is read off the
 * packets that carry it (documentation/admin_console/ARCHITECTURE.md lists
 * which).
 *
 * Pure on purpose - no Bun, no database, no timers - so the tests can feed
 * it frames the client's own encoders built and read the events back.
 */

export type SessionSink = {
  event(session: TrackedSession, event: TrackEvent): void;
  /** A field of the snapshot other than the position changed. */
  change(session: TrackedSession): void;
  /** The position or the map changed. */
  move(session: TrackedSession): void;
};

export type SessionOptions = {
  /** Journal what a whisper said, not only that one was sent. Default on. */
  whispers?: boolean;
  now?: () => number;
};

type ScopeEntry = { kind: 'player' | 'npc'; name: string; type?: number };

/** `GetClientDirectionCode` in networkSystem.ts: W, SW, S, SE, E, NE, N, NW. */
const DIR_DX = [-1, 0, 1, 1, 1, 0, -1, -1];
const DIR_DY = [-1, -1, -1, 0, 1, 1, 1, 0];

/** One walk line per this many ms; the position itself moves on every packet. */
const WALK_EVENT_MS = 5000;
/** A swing at the same target inside this window is the same fight. */
const ATTACK_EVENT_MS = 3000;
/** A pickup / drop / buy request is matched with its answer inside this window. */
const PENDING_MS = 3000;
/** The same potion slot inside this window is one line. */
const CONSUME_EVENT_MS = 5000;
/** The scope and the drops are bounded; a stream that never removes is capped. */
const MAX_SCOPE = 4000;
const MAX_DROPS = 1000;

const GAME_MASTER_STATUS = 32;
const ID_MASK = 0x7fff;

const TRADE_RESULTS: Readonly<Record<number, string>> = {
  0: 'cancelled',
  1: 'completed',
  2: 'failed, inventory full',
  3: 'timed out',
  4: 'failed, an item cannot be traded',
};

const LOGOUT_TEXT: Readonly<Record<number, string>> = {
  0: 'closed the game',
  1: 'went back to the character select',
  2: 'went back to the server select',
};

let sequence = 0;

function cleanName(raw: string): string {
  return raw.replace(/\0.*$/, '').trim();
}

function bytesOf(view: DataView): Uint8Array {
  return new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
}

function withAt(text: string, x: number, y: number): string {
  return `${text} at ${x}, ${y}`;
}

export class TrackedSession {
  readonly id = `s${++sequence}`;

  account: string | null = null;
  character: string | null = null;
  cls: number | null = null;
  level = 0;
  map: number | null = null;
  x = 0;
  y = 0;
  hp = 0;
  maxHp = 0;
  money = 0;
  heroState = 3;
  gameMaster = false;
  guild: string | null = null;
  readonly since: number;
  lastSeen: number;
  lastAction: string | null = null;
  /** The hero's own object id, from GameServerEntered. */
  objectId: number | null = null;
  closed = false;

  private readonly now: () => number;
  private readonly whispers: boolean;
  private readonly client = new FrameReader('client');
  private readonly server = new FrameReader('server');

  /** The account's characters, from the character list. */
  private readonly characters = new Map<string, { cls: number; level: number; status: number }>();
  /** What is in scope right now: id -> who or what it is. */
  private readonly scope = new Map<number, ScopeEntry>();
  /** Drops in scope: id -> the item's name. */
  private readonly drops = new Map<number, string>();
  private readonly guildNames = new Map<number, string>();
  private guildId: number | null = null;

  private pendingSelect: string | null = null;
  /** A second character claim arrived while one still awaited the server. */
  private selectAmbiguous = false;
  private pendingPickupAt = 0;
  private pendingDrop: { at: number; x: number; y: number } | null = null;
  private pendingBuyAt = 0;
  private pendingSell: { at: number; slot: number } | null = null;
  private lastWalkEventAt = 0;
  private lastAttack = { target: -1, at: 0 };
  private lastSkill = { skill: -1, target: -1, at: 0 };
  private lastConsume = { slot: -1, at: 0 };

  constructor(
    readonly nonce: string | null,
    readonly port: number | null,
    private readonly sink: SessionSink,
    options: SessionOptions = {}
  ) {
    this.now = options.now ?? Date.now;
    this.whispers = options.whispers ?? true;
    this.since = this.now();
    this.lastSeen = this.since;
  }

  /**
   * Worth showing: the game server accepted a login on this socket, or put a
   * character of its own on a map. The second half is what keeps a socket
   * that muddied its login claims (presence then names it nobody) from
   * vanishing off the game master's list: it shows with no account instead.
   */
  get identified(): boolean {
    return this.account !== null || this.map !== null;
  }

  /** A character was picked and the server put it on a map. */
  get inWorld(): boolean {
    return this.character !== null && this.map !== null;
  }

  snapshot(): TrackedPlayer {
    return {
      id: this.id,
      account: this.account,
      character: this.character,
      cls: this.cls,
      level: this.level,
      map: this.map,
      x: this.x,
      y: this.y,
      hp: this.hp,
      maxHp: this.maxHp,
      money: this.money,
      heroState: this.heroState,
      gm: this.gameMaster,
      guild: this.guild,
      port: this.port,
      since: this.since,
      lastSeen: this.lastSeen,
      lastAction: this.lastAction,
    };
  }

  /** The game server accepted a login on this socket (presence saw it). */
  setAccount(account: string): void {
    if (this.closed || this.account === account) return;
    this.account = account;
    this.emit('login', `logged in${this.port ? ` on port ${this.port}` : ''}`);
    this.sink.change(this);
  }

  feedClient(chunk: Uint8Array): void {
    if (this.closed) return;
    this.lastSeen = this.now();
    this.client.feed(chunk, frame => this.guard(() => this.onClientFrame(frame)));
  }

  feedServer(chunk: Uint8Array): void {
    if (this.closed) return;
    this.lastSeen = this.now();
    this.server.feed(chunk, frame => this.guard(() => this.onServerFrame(frame)));
  }

  /** The socket closed. */
  close(): void {
    if (this.closed) return;
    this.closed = true;
    if (this.identified) this.emit('logout', 'disconnected');
  }

  /* -------------------------------------------------------------- plumbing */

  /** A frame the generated parser chokes on must not take the proxy down. */
  private guard(read: () => void): void {
    try {
      read();
    } catch {
      /* skipped */
    }
  }

  private emit(kind: EventKind, text: string, data?: Record<string, unknown>): void {
    const event: TrackEvent = {
      at: this.now(),
      account: this.account,
      character: this.character,
      kind,
      text,
      ...(data ? { data } : {}),
    };
    this.lastAction = text;
    this.sink.event(this, event);
  }

  /** Whether this player can see `objectId` right now (either id form). */
  sees(objectId: number): boolean {
    return this.scope.has(objectId & ID_MASK);
  }

  /** A journal line another proxy module (the band relay) wants on this character. */
  note(kind: EventKind, text: string, data?: Record<string, unknown>): void {
    if (this.closed) return;
    this.emit(kind, text, data);
  }

  private nameOf(objectId: number): string {
    const id = objectId & ID_MASK;
    if (id === this.objectId) return 'themselves';
    return this.scope.get(id)?.name ?? `#${id}`;
  }

  private remember(id: number, entry: ScopeEntry): void {
    if (this.scope.size >= MAX_SCOPE) this.scope.clear();
    this.scope.set(id & ID_MASK, entry);
  }

  private moved(x: number, y: number): void {
    this.x = Math.max(0, Math.min(255, x));
    this.y = Math.max(0, Math.min(255, y));
    this.sink.move(this);
  }

  private leaveWorld(): void {
    this.character = null;
    this.cls = null;
    this.map = null;
    this.guild = null;
    this.guildId = null;
    this.gameMaster = false;
    this.scope.clear();
    this.drops.clear();
    this.sink.change(this);
  }

  /* ----------------------------------------------------------- the server */

  private onServerFrame(frame: Frame): void {
    const { code, subCode, view, bytes } = frame;

    switch (code) {
      case 0xf1:
        if (subCode === 0x00) this.onGameServerEntered(new GameServerEnteredPacket(view));
        else if (subCode === 0x02) this.onLogoutResponse(new LogoutResponsePacket(view));
        return;
      case 0xf3:
        this.onCharacterFrame(subCode, view, bytes);
        return;
      case 0x1c:
        if (subCode === 0x0f) this.onMapChanged(new MapChangedPacket(view));
        return;
      case 0x15:
        this.onObjectMoved(new ObjectMovedPacket(view));
        return;
      case 0x12:
        for (const c of new AddCharactersToScopePacket(view).getCharacters()) {
          this.remember(c.Id, { kind: 'player', name: cleanName(c.Name) });
        }
        return;
      case 0x45:
        for (const c of new AddTransformedCharactersToScopePacket(view).getCharacters()) {
          this.remember(c.Id, { kind: 'player', name: cleanName(c.Name) });
        }
        return;
      case 0x13:
        for (const npc of new AddNpcsToScopePacket(view).getNPCs()) {
          this.remember(npc.Id, {
            kind: 'npc',
            name: monsterName(npc.TypeNumber),
            type: npc.TypeNumber,
          });
        }
        return;
      case 0x14:
        for (const obj of new MapObjectOutOfScopePacket(view).getObjects()) {
          this.scope.delete(obj.Id & ID_MASK);
        }
        return;
      case 0x17:
        this.onKilled(new ObjectGotKilledPacket(view));
        return;
      case 0x16:
        if (bytes.length === 9) this.onExperience(new ExperienceGainedPacket(view));
        return;
      case 0x20:
        this.onItemsDropped(new ItemsDroppedPacket(view));
        return;
      case 0x22:
        if (bytes.length === 8 && subCode === 0xfe) {
          this.onMoney(new InventoryMoneyUpdatePacket(view).Money);
        } else {
          this.onItemAdded(new ItemAddedToInventoryPacket(view));
        }
        return;
      case 0x26:
        if (subCode === 0xff) {
          this.hp = new CurrentHealthAndShieldPacket(view).Health;
          this.sink.change(this);
        } else if (subCode === 0xfe) {
          this.maxHp = new MaximumHealthAndShieldPacket(view).Health;
          this.sink.change(this);
        }
        return;
      case 0x32:
        this.onItemBought(new ItemBoughtPacket(view));
        return;
      case 0x33:
        if (bytes.length === 8) this.onSold(new NpcItemSellResultPacket(view));
        return;
      case 0x0d:
        this.onServerMessage(new ServerMessagePacket(view));
        return;
      case 0x37:
        if (bytes.length === 20) this.onTradeAnswer(new TradeRequestAnswerPacket(view));
        return;
      case 0x3d: {
        const result = new TradeFinishedPacket(view).Result;
        this.emit('trade', `trade ${TRADE_RESULTS[result] ?? `ended (${result})`}`, { result });
        return;
      }
      case 0x65:
        this.onGuildMembers(new AssignCharacterToGuildPacket(view));
        return;
      case 0x66:
        this.onGuildInformation(new GuildInformationPacket(view));
        return;
    }
  }

  private onGameServerEntered(p: GameServerEnteredPacket): void {
    if (!p.Success) return;
    this.objectId = p.PlayerId & ID_MASK;
  }

  private onLogoutResponse(p: LogoutResponsePacket): void {
    const type = p.Type;
    if (this.character) this.emit('logout', LOGOUT_TEXT[type] ?? `logged out (${type})`, { type });
    if (type === 1 || type === 2) this.leaveWorld();
  }

  private onCharacterFrame(subCode: number, view: DataView, bytes: Uint8Array): void {
    switch (subCode) {
      case 0x00:
        this.onCharacterList(new CharacterListPacket(view));
        return;
      case 0x03:
        if (bytes.length === CharacterInformationPacket.Length) {
          this.onCharacterInformation(new CharacterInformationPacket(view));
        }
        return;
      case 0x04:
        this.onRespawn(new RespawnAfterDeathPacket(view));
        return;
      case 0x05: {
        const level = new CharacterLevelUpdatePacket(view).Level;
        if (level !== this.level) {
          this.level = level;
          this.emit('level', `reached level ${level}`, { level });
          this.sink.change(this);
        }
        return;
      }
      case 0x08: {
        const p = new HeroStateChangedPacket(view);
        if ((p.PlayerId & ID_MASK) !== this.objectId) return;
        this.heroState = p.NewState;
        this.emit('state', `is now ${heroStateName(p.NewState)}`, { heroState: p.NewState });
        this.sink.change(this);
        return;
      }
    }
  }

  /**
   * The name the client says it is picking. Only a name the server listed on
   * this account is believed - the list is the server's, the claim is the
   * client's, and a forged claim would file this socket's doings under
   * somebody else's character. Two claims in flight when the server answers
   * name nobody, for the same reason presence names nobody then. A socket
   * that never saw a list (a map-server switch re-authenticates without one)
   * has nothing to check the name against and takes it, still subject to
   * the two-in-flight rule.
   */
  private claimCharacter(name: string): void {
    if (!name) return;
    if (this.characters.size > 0 && !this.characters.has(name)) return;
    if (this.pendingSelect !== null) this.selectAmbiguous = true;
    this.pendingSelect = name;
  }

  private onCharacterList(p: CharacterListPacket): void {
    this.characters.clear();
    this.pendingSelect = null;
    this.selectAmbiguous = false;
    for (const c of p.getCharacters()) {
      // The class travels in the appearance's first byte, high five bits.
      const appearance = bytesOf(c.Appearance as DataView);
      const cls = appearance.length ? appearance[0] >> 3 : 0;
      this.characters.set(cleanName(c.Name), { cls, level: c.Level, status: c.Status });
    }
  }

  private onCharacterInformation(p: CharacterInformationPacket): void {
    const ambiguous = this.selectAmbiguous;
    const name = ambiguous ? null : (this.pendingSelect ?? this.character);
    this.pendingSelect = null;
    this.selectAmbiguous = false;

    const known = name ? this.characters.get(name) : undefined;
    this.character = name;
    this.cls = known?.cls ?? this.cls;
    this.level = known?.level ?? this.level;
    this.map = p.MapId;
    this.money = p.Money;
    this.heroState = p.HeroState;
    this.hp = p.CurrentHealth;
    this.maxHp = p.MaximumHealth;
    this.gameMaster = (p.Status & GAME_MASTER_STATUS) !== 0;
    this.moved(p.X, p.Y);

    const who = name ?? (ambiguous ? 'an unverified character' : 'a character');
    const detail = [className(this.cls), this.level ? `level ${this.level}` : '']
      .filter(Boolean)
      .join(', ');
    this.emit(
      'select',
      withAt(
        `entered the world as ${who}${detail ? ` (${detail})` : ''} in ${mapName(p.MapId)}`,
        p.X,
        p.Y
      ),
      {
        map: p.MapId,
        x: p.X,
        y: p.Y,
        cls: this.cls,
        level: this.level,
        gm: this.gameMaster,
        ...(ambiguous ? { unverified: true } : {}),
      }
    );
    this.sink.change(this);
  }

  private onRespawn(p: RespawnAfterDeathPacket): void {
    this.map = p.MapNumber;
    this.money = p.Money;
    this.moved(p.PositionX, p.PositionY);
    this.emit(
      'map',
      withAt(`respawned in ${mapName(p.MapNumber)}`, p.PositionX, p.PositionY),
      { map: p.MapNumber, x: p.PositionX, y: p.PositionY }
    );
    this.sink.change(this);
  }

  private onMapChanged(p: MapChangedPacket): void {
    const map = p.MapNumber;
    const changed = p.IsMapChange || map !== this.map;
    this.map = map;
    this.moved(p.PositionX, p.PositionY);

    if (changed) {
      this.scope.clear();
      this.drops.clear();
      this.emit('map', withAt(`entered ${mapName(map)}`, p.PositionX, p.PositionY), {
        map,
        x: p.PositionX,
        y: p.PositionY,
      });
      this.sink.change(this);
    } else {
      this.emit('teleport', withAt('was moved', p.PositionX, p.PositionY), {
        x: p.PositionX,
        y: p.PositionY,
      });
    }
  }

  private onObjectMoved(p: ObjectMovedPacket): void {
    if ((p.ObjectId & ID_MASK) !== this.objectId) return;
    this.moved(p.PositionX, p.PositionY);
    this.emit('teleport', withAt('was moved', p.PositionX, p.PositionY), {
      x: p.PositionX,
      y: p.PositionY,
    });
  }

  private onKilled(p: ObjectGotKilledPacket): void {
    const killed = p.KilledId & ID_MASK;
    const killer = p.KillerId & ID_MASK;

    if (killed === this.objectId) {
      const by = this.scope.get(killer);
      this.emit('death', by ? `was killed by ${by.name}` : 'died', {
        killer: by?.name ?? null,
        skill: p.SkillId,
      });
    } else if (killer === this.objectId) {
      const victim = this.scope.get(killed);
      const what = victim ? (victim.kind === 'player' ? `player ${victim.name}` : victim.name) : `#${killed}`;
      this.emit('kill', `killed ${what}`, {
        victim: victim?.name ?? null,
        player: victim?.kind === 'player',
        skill: p.SkillId,
      });
    }
  }

  private onExperience(p: ExperienceGainedPacket): void {
    const exp = p.AddedExperience;
    if (!exp) return;
    const from = this.scope.get(p.KilledObjectId & ID_MASK);
    this.emit('exp', `+${exp} exp${from ? ` (${from.name})` : ''}`, {
      exp,
      from: from?.name ?? null,
    });
  }

  private onItemsDropped(p: ItemsDroppedPacket): void {
    const now = this.now();
    for (const drop of p.getItems()) {
      const name = itemName(bytesOf(drop.ItemData as DataView));
      if (this.drops.size >= MAX_DROPS) this.drops.clear();
      this.drops.set(drop.Id & ID_MASK, name);

      const pending = this.pendingDrop;
      if (
        drop.IsFreshDrop &&
        pending &&
        now - pending.at < PENDING_MS &&
        Math.abs(drop.PositionX - pending.x) <= 2 &&
        Math.abs(drop.PositionY - pending.y) <= 2
      ) {
        this.pendingDrop = null;
        this.emit('drop', withAt(`dropped ${name}`, drop.PositionX, drop.PositionY), {
          item: name,
          x: drop.PositionX,
          y: drop.PositionY,
        });
      }
    }
  }

  private onItemAdded(p: ItemAddedToInventoryPacket): void {
    const name = itemName(bytesOf(p.ItemData as DataView));
    if (this.now() - this.pendingPickupAt < PENDING_MS) {
      this.pendingPickupAt = 0;
      this.emit('pickup', `picked up ${name}`, { item: name, slot: p.InventorySlot });
    } else {
      this.emit('item', `received ${name}`, { item: name, slot: p.InventorySlot });
    }
  }

  private onMoney(money: number): void {
    const delta = money - this.money;
    this.money = money;
    if (delta !== 0) {
      const sign = delta > 0 ? '+' : '';
      this.emit('money', `money is now ${money} (${sign}${delta})`, { money, delta });
    }
    this.sink.change(this);
  }

  private onItemBought(p: ItemBoughtPacket): void {
    const name = itemName(bytesOf(p.ItemData as DataView));
    this.pendingBuyAt = 0;
    this.emit('buy', `bought ${name}`, { item: name, slot: p.InventorySlot });
  }

  private onSold(p: NpcItemSellResultPacket): void {
    const pending = this.pendingSell;
    this.pendingSell = null;
    if (!p.Success) return;
    const slot = pending && this.now() - pending.at < PENDING_MS ? pending.slot : null;
    this.money = p.Money;
    this.emit(
      'sell',
      `sold the item${slot !== null ? ` in slot ${slot}` : ''} (money is now ${p.Money})`,
      { slot, money: p.Money }
    );
    this.sink.change(this);
  }

  private onServerMessage(p: ServerMessagePacket): void {
    const text = cleanName(p.Message);
    if (!text) return;
    this.emit('server', text, { type: p.Type });
  }

  private onTradeAnswer(p: TradeRequestAnswerPacket): void {
    const partner = cleanName(p.Name);
    this.emit(
      'trade',
      p.Accepted ? `${partner} accepted the trade` : `${partner} declined the trade`,
      { partner, accepted: !!p.Accepted }
    );
  }

  private onGuildMembers(p: AssignCharacterToGuildPacket): void {
    for (const member of p.getMembers()) {
      if ((member.PlayerId & ID_MASK) !== this.objectId) continue;
      this.guildId = member.GuildId;
      const name = this.guildNames.get(member.GuildId) ?? null;
      if (name !== this.guild) {
        this.guild = name;
        this.sink.change(this);
      }
    }
  }

  private onGuildInformation(p: GuildInformationPacket): void {
    const name = cleanName(p.GuildName);
    this.guildNames.set(p.GuildId, name);
    if (p.GuildId === this.guildId && name !== this.guild) {
      this.guild = name;
      this.sink.change(this);
    }
  }

  /* ----------------------------------------------------------- the client */

  private onClientFrame(frame: Frame): void {
    const { code, subCode, view, bytes } = frame;

    switch (code) {
      case 0xf3:
        if (subCode === 0x03) {
          this.claimCharacter(cleanName(new SelectCharacterPacket(view).Name));
        } else if (subCode === 0x01) {
          const p = new CreateCharacterPacket(view);
          this.emit('select', `created the character ${cleanName(p.Name)} (${className(p.Class)})`, {
            name: cleanName(p.Name),
            cls: p.Class,
          });
        } else if (subCode === 0x02) {
          const name = cleanName(new DeleteCharacterPacket(view).Name);
          this.emit('select', `deleted the character ${name}`, { name });
        }
        return;
      case 0xf1:
        // The logout is journaled on the server's answer; nothing to do here.
        return;
      case 0xb1: {
        // A map-server switch re-authenticates with the character's name,
        // Xor3-encoded like the login's; no character list comes with it.
        if (subCode !== 0x01) return;
        const encoded = bytesOf(new ServerChangeAuthenticationPacket(view).CharacterNameXor3 as DataView).slice();
        Xor3Byte(encoded);
        this.claimCharacter(cleanName(new TextDecoder('ascii').decode(encoded)));
        return;
      }
      case 0xd4:
        this.onWalk(new WalkRequestPacket(view), bytes);
        return;
      case 0x15: {
        const p = new InstantMoveRequestPacket(view);
        this.moved(p.TargetX, p.TargetY);
        this.emit('teleport', withAt('jumped', p.TargetX, p.TargetY), { x: p.TargetX, y: p.TargetY });
        return;
      }
      case 0x00:
        this.onChat(cleanName(new PublicChatMessagePacket(view).Message));
        return;
      case 0x02: {
        const p = new WhisperMessagePacket(view);
        const to = cleanName(p.ReceiverName);
        const text = cleanName(p.Message);
        this.emit(
          'whisper',
          this.whispers ? `whispered to ${to}: ${text}` : `whispered to ${to}`,
          this.whispers ? { to, text } : { to }
        );
        return;
      }
      case 0x11:
        this.onHit(new HitRequestPacket(view));
        return;
      case 0x19:
        this.onSkill(new TargetedSkillPacket(view));
        return;
      case 0x1e:
        this.onAreaSkill(new AreaSkillPacket(view));
        return;
      case 0x22:
        this.pendingPickupAt = this.now();
        return;
      case 0x23: {
        const p = new DropItemRequestPacket(view);
        this.pendingDrop = { at: this.now(), x: p.TargetX, y: p.TargetY };
        return;
      }
      case 0x24:
        this.onItemMove(new ItemMoveRequestPacket(view));
        return;
      case 0x26:
        this.onConsume(new ConsumeItemRequestPacket(view));
        return;
      case 0x30: {
        const npc = this.scope.get(new TalkToNpcRequestPacket(view).NpcId & ID_MASK);
        this.emit('npc', `talked to ${npc?.name ?? 'an NPC'}`, { npc: npc?.name ?? null });
        return;
      }
      case 0x32:
        this.pendingBuyAt = this.now();
        return;
      case 0x33:
        this.pendingSell = { at: this.now(), slot: new SellItemToNpcRequestPacket(view).ItemSlot };
        return;
      case 0x34: {
        const slot = new ItemRepairPacket(view).InventoryItemSlot;
        this.emit('repair', slot === 0xff ? 'repaired everything' : `repaired the item in slot ${slot}`, {
          slot,
        });
        return;
      }
      case 0x36: {
        const partner = this.nameOf(new TradeRequestPacket(view).PlayerId);
        this.emit('trade', `asked ${partner} to trade`, { partner });
        return;
      }
      case 0x37: {
        const accepted = !!new TradeRequestResponsePacket(view).TradeAccepted;
        this.emit('trade', accepted ? 'accepted a trade request' : 'declined a trade request', {
          accepted,
        });
        return;
      }
      case 0x3f:
        this.onShopFrame(subCode, view);
        return;
      case 0x40: {
        const who = this.nameOf(new PartyInviteRequestPacket(view).TargetPlayerId);
        this.emit('party', `invited ${who} to the party`, { who });
        return;
      }
      case 0x50: {
        const who = this.nameOf(new GuildJoinRequestPacket(view).GuildMasterPlayerId);
        this.emit('guild', `asked ${who} to join their guild`, { who });
        return;
      }
      case 0x8e:
        if (subCode === 0x02) {
          const index = new WarpCommandRequestPacket(view).WarpInfoIndex;
          this.emit('warp', `used the warp list (entry ${index})`, { index });
        }
        return;
      case 0x1c: {
        const gate = new EnterGateRequestPacket(view).GateNumber;
        this.emit('warp', `entered gate ${gate}`, { gate });
        return;
      }
    }
  }

  private onWalk(p: WalkRequestPacket, bytes: Uint8Array): void {
    let x = p.SourceX;
    let y = p.SourceY;
    const steps = Math.min(p.StepCount, 15);

    // Two steps per byte from offset 6, the first in the high nibble
    // (`Store.sendWalkPath`).
    for (let i = 0; i < steps; i++) {
      const byte = bytes[6 + (i >> 1)];
      if (byte === undefined) break;
      const dir = i % 2 === 0 ? byte >> 4 : byte & 0x0f;
      if (dir > 7) break;
      x += DIR_DX[dir];
      y += DIR_DY[dir];
    }

    this.moved(x, y);

    const now = this.now();
    if (now - this.lastWalkEventAt >= WALK_EVENT_MS) {
      this.lastWalkEventAt = now;
      this.emit('walk', withAt('walked', this.x, this.y), { x: this.x, y: this.y });
    }
  }

  private onChat(text: string): void {
    if (!text) return;

    if (text.startsWith('/')) {
      this.emit('command', text, { line: text });
      return;
    }

    const first = text[0];
    if (first === '~') this.emit('party', `party: ${text.slice(1)}`, { text: text.slice(1) });
    else if (first === '@') this.emit('guild', `guild: ${text.slice(1)}`, { text: text.slice(1) });
    else if (first === '!' || first === '#') this.emit('shout', `shout: ${text.slice(1)}`, { text: text.slice(1) });
    else this.emit('chat', text, { text });
  }

  private onHit(p: HitRequestPacket): void {
    const target = p.TargetId & ID_MASK;
    const now = this.now();
    if (target === this.lastAttack.target && now - this.lastAttack.at < ATTACK_EVENT_MS) {
      this.lastAttack.at = now;
      return;
    }
    this.lastAttack = { target, at: now };
    const entry = this.scope.get(target);
    this.emit('attack', `attacked ${entry?.name ?? `#${target}`}`, {
      target: entry?.name ?? null,
      player: entry?.kind === 'player',
    });
  }

  private onSkill(p: TargetedSkillPacket): void {
    const target = p.TargetId & ID_MASK;
    const now = this.now();
    if (
      p.SkillId === this.lastSkill.skill &&
      target === this.lastSkill.target &&
      now - this.lastSkill.at < ATTACK_EVENT_MS
    ) {
      this.lastSkill.at = now;
      return;
    }
    this.lastSkill = { skill: p.SkillId, target, at: now };
    const entry = this.scope.get(target);
    this.emit('skill', `cast skill ${p.SkillId} on ${entry?.name ?? `#${target}`}`, {
      skill: p.SkillId,
      target: entry?.name ?? null,
      player: entry?.kind === 'player',
    });
  }

  private onAreaSkill(p: AreaSkillPacket): void {
    const now = this.now();
    if (p.SkillId === this.lastSkill.skill && this.lastSkill.target === -1 && now - this.lastSkill.at < ATTACK_EVENT_MS) {
      this.lastSkill.at = now;
      return;
    }
    this.lastSkill = { skill: p.SkillId, target: -1, at: now };
    this.emit('skill', withAt(`cast skill ${p.SkillId}`, p.TargetX, p.TargetY), {
      skill: p.SkillId,
      x: p.TargetX,
      y: p.TargetY,
    });
  }

  private onItemMove(p: ItemMoveRequestPacket): void {
    if (p.FromStorage === p.ToStorage) return;
    const name = itemName(bytesOf(p.ItemData as DataView));
    const from = storageName(p.FromStorage);
    const to = storageName(p.ToStorage);
    this.emit('item', `moved ${name} from the ${from} to the ${to}`, {
      item: name,
      from: p.FromStorage,
      to: p.ToStorage,
    });
  }

  private onConsume(p: ConsumeItemRequestPacket): void {
    const slot = p.ItemSlot;
    const now = this.now();
    if (slot === this.lastConsume.slot && now - this.lastConsume.at < CONSUME_EVENT_MS) return;
    this.lastConsume = { slot, at: now };
    this.emit('item', `used the item in slot ${slot}`, { slot });
  }

  private onShopFrame(subCode: number, view: DataView): void {
    if (subCode === 0x02) {
      const name = cleanName(new PlayerShopOpenPacket(view).StoreName);
      this.emit('shop', `opened the shop "${name}"`, { name });
    } else if (subCode === 0x03) {
      this.emit('shop', 'closed the shop');
    } else if (subCode === 0x06) {
      const p = new PlayerShopItemBuyRequestPacket(view);
      const seller = cleanName(p.PlayerName) || this.nameOf(p.PlayerId);
      this.emit('buy', `bought slot ${p.ItemSlot} from ${seller}'s shop`, {
        seller,
        slot: p.ItemSlot,
      });
    }
  }
}
