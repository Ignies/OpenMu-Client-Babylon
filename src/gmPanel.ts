import { makeAutoObservable, runInAction } from 'mobx';
import { Social } from './social';
import { Store } from './store';
import {
  GM_GROUPS,
  buildCommandLine,
  matchGmCommands,
  type GmCommand,
} from './common/gmCommands';

/**
 * The game master panel's state.
 *
 * It owns no game state and grants nothing: everything here builds the same
 * `/line` a game master would type and hands it to `Social.sendChat`, which
 * sends it as ordinary chat. The server decides whether to run it - it re-reads
 * `CharacterStatus` on every command it receives
 * (`ChatMessageCommandProcessor`), so a player who forced this window open gets
 * exactly what they would get from typing: nothing.
 *
 * Sends are queued because `sendChat` refuses a second line inside
 * `CHAT_COOLDOWN_MS` and says so only by returning false. Without the queue a
 * quick second click would be swallowed with no sign anything was lost.
 *
 * No member here may be named after one on `Object.prototype`.
 * `makeAutoObservable` matches its overrides with `key in overrides`, which
 * walks the prototype chain, so `valueOf` would be handed the built-in as its
 * annotation and throw - at module load, which takes the client down at boot.
 * `src/observableStores.test.ts` fails on it.
 */

/** Slightly over `CHAT_COOLDOWN_MS`, so a retry is never refused for the same reason. */
const RETRY_MS = 600;

/** How many sent lines the panel keeps on screen. */
const MAX_SENT = 12;

/** The panel's screens, in the order the rail lists them. */
export type GmSection =
  | 'overview'
  | 'nearby'
  | 'travel'
  | 'character'
  | 'spawn'
  | 'moderation'
  | 'events'
  | 'console';

export type GmSectionInfo = { id: GmSection; title: string; hint: string };

export const GM_SECTIONS: readonly GmSectionInfo[] = [
  { id: 'overview', title: 'Overview', hint: 'Where you are, and what is around you' },
  { id: 'nearby', title: 'Nearby', hint: 'Everyone and everything in scope' },
  { id: 'travel', title: 'Travel', hint: 'Maps and coordinates' },
  { id: 'character', title: 'Character', hint: 'Read and set a character' },
  { id: 'spawn', title: 'Spawn', hint: 'Monsters and items' },
  { id: 'moderation', title: 'Moderation', hint: 'Bans, mutes and disconnects' },
  { id: 'events', title: 'Events', hint: 'Start events and announce' },
  { id: 'console', title: 'Console', hint: 'Every command, and a raw line' },
];

export type SentLine = { id: number; line: string; at: number };

export const GmPanel = new (class _GmPanel {
  open = false;

  section: GmSection = 'overview';

  /**
   * The character the Character and Moderation screens act on. Blank means
   * "me" wherever the command allows it. Set by clicking a row in Nearby,
   * which is the whole point: a name typed by hand is a name typed wrong.
   */
  target = '';

  /** The Console's filter box. While it holds anything, it searches every group. */
  query = '';

  /** The command whose form is open in the Console, if any. */
  selected: GmCommand | null = null;

  /** Input values, keyed `"/command:paramName"` so each command keeps its own. */
  values: Record<string, string> = {};

  /** A `confirm: true` command waiting for the second press, by line. */
  confirming: string | null = null;

  /** Why the last build failed. Cleared on the next edit or send. */
  error: string | null = null;

  /** What the panel sent, oldest first. */
  sent: SentLine[] = [];

  private nextId = 1;

  private queue: string[] = [];

  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  /**
   * True for a character the server said is a game master - and in the offline
   * mode, which has no server to ask and no account to be one on.
   *
   * Offline is the seam the debug menu already uses (`?offline`, see
   * `Store.playOffline`): it is a local scene with nobody else in it, so
   * showing the panel there gives away nothing and is the only way to work on
   * its layout without a game master account on a live server. The commands it
   * sends go nowhere, because there is no socket.
   */
  get available(): boolean {
    return Store.playerData.isGameMaster || Store.isOffline;
  }

  toggle(): void {
    this.open = !this.open;
    if (!this.open) this.clearPending();
  }

  close(): void {
    this.open = false;
    this.clearPending();
  }

  setSection(section: GmSection): void {
    this.section = section;
    this.clearPending();
  }

  /** A row in Nearby, or the field on the Character screen. */
  setTarget(name: string): void {
    this.target = name;
    this.error = null;
    this.confirming = null;
  }

  setQuery(value: string): void {
    this.query = value;
  }

  /**
   * What the Console lists: the commands matching the filter box, or all of
   * them grouped when it is empty. Searching across groups is the point of it -
   * `/setmoney` is only in Players if you already knew that.
   */
  get consoleGroups(): readonly { title: string; commands: readonly GmCommand[] }[] {
    if (!this.query.trim()) return GM_GROUPS;

    const found = matchGmCommands(this.query);
    return found.length ? [{ title: 'Matches', commands: found }] : [];
  }

  /** Click a command in the Console: open its form, or close it if it was open. */
  select(command: GmCommand): void {
    this.error = null;
    this.confirming = null;
    this.selected = this.selected?.command === command.command ? null : command;
  }

  closeForm(): void {
    this.selected = null;
    this.confirming = null;
    this.error = null;
  }

  private clearPending(): void {
    this.selected = null;
    this.confirming = null;
    this.error = null;
  }

  valueFor(command: GmCommand, paramName: string): string {
    return this.values[`${command.command}:${paramName}`] ?? '';
  }

  setValue(command: GmCommand, paramName: string, value: string): void {
    this.values[`${command.command}:${paramName}`] = value;
    this.error = null;
    // Editing after asking to confirm means the answer was to the old line.
    this.confirming = null;
  }

  /**
   * The values a command would be sent with. `characterName` falls back to the
   * shared target, so picking someone in Nearby fills every screen at once
   * without copying the name into each form.
   */
  private valuesFor(command: GmCommand, overrides?: Record<string, string>): Record<string, string> {
    const values: Record<string, string> = {};

    for (const param of command.params ?? []) {
      const own = this.valueFor(command, param.name);
      values[param.name] =
        overrides?.[param.name] ??
        (own || (param.name === 'characterName' ? this.target : ''));
    }

    return values;
  }

  /** The line as it stands, for a form's preview row. */
  preview(command: GmCommand, overrides?: Record<string, string>): string {
    const built = buildCommandLine(command, this.valuesFor(command, overrides));
    return 'line' in built ? built.line : command.command;
  }

  /** True while `command` is armed and waiting for its second press. */
  isArmed(command: GmCommand, overrides?: Record<string, string>): boolean {
    return this.confirming !== null && this.confirming === this.preview(command, overrides);
  }

  /**
   * Run a command. A `confirm: true` one arms instead on the first press and
   * runs on the second, so nothing that takes someone's access away is one
   * click from a misplaced cursor. Arming remembers the *line*, not the
   * command, so changing a field disarms it.
   */
  run(command: GmCommand, overrides?: Record<string, string>): void {
    const built = buildCommandLine(command, this.valuesFor(command, overrides));

    if ('error' in built) {
      this.error = built.error;
      this.confirming = null;
      return;
    }

    if (command.confirm && this.confirming !== built.line) {
      this.error = null;
      this.confirming = built.line;
      return;
    }

    this.confirming = null;
    this.error = null;
    this.send(built.line);
  }

  /** The Console's raw line, and anything else that already knows what to send. */
  sendRaw(line: string): void {
    const trimmed = line.trim();
    if (!trimmed.startsWith('/')) {
      this.error = 'A command starts with a slash.';
      return;
    }

    this.error = null;
    this.send(trimmed);
  }

  private send(line: string): void {
    this.sent = [...this.sent, { id: this.nextId++, line, at: Date.now() }].slice(-MAX_SENT);
    this.queue.push(line);
    this.drain();
  }

  private drain(): void {
    if (this.timer) return;

    const line = this.queue[0];
    if (line === undefined) return;

    if (Social.sendChat(line)) {
      this.queue.shift();
      if (this.queue.length === 0) return;
    }

    // Either the cooldown refused this line, or more are waiting behind it.
    this.timer = setTimeout(() => {
      runInAction(() => {
        this.timer = null;
        this.drain();
      });
    }, RETRY_MS);
  }

  /** Character select and logout: the panel belongs to the character. */
  reset(): void {
    runInAction(() => {
      this.open = false;
      this.section = 'overview';
      this.target = '';
      this.query = '';
      this.selected = null;
      this.confirming = null;
      this.error = null;
      this.sent = [];
      this.values = {};
      this.queue = [];
      if (this.timer) {
        clearTimeout(this.timer);
        this.timer = null;
      }
    });
  }
})();
