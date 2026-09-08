import { makeAutoObservable, runInAction } from 'mobx';
import { Social } from './social';
import { Store } from './store';
import {
  GM_GROUPS,
  buildCommandLine,
  type GmCommand,
} from './common/gmCommands';

/**
 * The game master panel's state.
 *
 * It owns no game state and grants nothing: a button here builds the same
 * `/line` a game master would type and hands it to `Social.sendChat`, which
 * sends it as ordinary chat. The server decides whether to run it - it
 * re-reads `CharacterStatus` on every command it receives
 * (`ChatMessageCommandProcessor`), so a player who forced this window open
 * gets exactly what they would get from typing: nothing.
 *
 * Sends are queued because `sendChat` refuses a second line inside
 * `CHAT_COOLDOWN_MS` and says so only by returning false. Without the queue a
 * quick second click would be swallowed with no sign that anything was lost.
 */

/** Slightly over `CHAT_COOLDOWN_MS`, so a retry is never refused for the same reason. */
const RETRY_MS = 600;

/** How many sent lines the panel keeps on screen. */
const MAX_SENT = 12;

export type SentLine = { id: number; line: string; at: number };

export const GmPanel = new (class _GmPanel {
  open = false;

  activeGroupId: string = GM_GROUPS[0].id;

  /** The command whose form is being filled, if any. */
  selected: GmCommand | null = null;

  /** Input values, keyed `"/command:paramName"` so each command keeps its own. */
  values: Record<string, string> = {};

  /** A `confirm: true` command waiting for the second click. */
  confirming: GmCommand | null = null;

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

  /** Only ever true for a character the server said is a game master. */
  get available(): boolean {
    return Store.playerData.isGameMaster;
  }

  toggle(): void {
    this.open = !this.open;
    if (!this.open) this.closeForm();
  }

  close(): void {
    this.open = false;
    this.closeForm();
  }

  setGroup(id: string): void {
    this.activeGroupId = id;
    this.closeForm();
  }

  /** Click a command: open its form, or run it straight away when it takes none. */
  select(command: GmCommand): void {
    this.error = null;
    this.confirming = null;

    if (this.selected?.command === command.command) {
      this.selected = null;
      return;
    }

    this.selected = command;
  }

  closeForm(): void {
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

  /** The line as it stands, for the form's preview row. */
  preview(command: GmCommand): string {
    const built = buildCommandLine(command, this.valuesFor(command));
    return 'line' in built ? built.line : command.command;
  }

  /**
   * Run a command. A `confirm: true` one arms instead on the first press and
   * runs on the second, so nothing that takes someone's access away is one
   * click from a misplaced cursor.
   */
  run(command: GmCommand): void {
    const built = buildCommandLine(command, this.valuesFor(command));

    if ('error' in built) {
      this.error = built.error;
      this.confirming = null;
      return;
    }

    if (command.confirm && this.confirming?.command !== command.command) {
      this.error = null;
      this.confirming = command;
      return;
    }

    this.confirming = null;
    this.error = null;
    this.send(built.line);
  }

  private valuesFor(command: GmCommand): Record<string, string> {
    const values: Record<string, string> = {};
    for (const param of command.params ?? []) {
      values[param.name] = this.valueFor(command, param.name);
    }
    return values;
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
      this.activeGroupId = GM_GROUPS[0].id;
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
