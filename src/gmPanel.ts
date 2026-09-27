import { makeAutoObservable, runInAction } from 'mobx';
import { Social } from './social';
import { Store } from './store';
import {
  GM_GROUPS,
  buildCommandLine,
  matchGmCommands,
  type GmCommand,
} from './common/gmCommands';
import { t, type TextKey } from './i18n';
import { expandLine, type Macro, type MacroVars } from './admin/gmLibrary';

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

/** The panel's tabs, in the order the sidebar lists them. */
export type GmSection =
  | 'live'
  | 'map'
  | 'logs'
  | 'skins'
  | 'spawn'
  | 'character'
  | 'moderation'
  | 'events'
  | 'macros'
  | 'console';

export type GmSectionInfo = { id: GmSection; titleKey: TextKey; hintKey: TextKey };

export const GM_SECTIONS: readonly GmSectionInfo[] = [
  { id: 'live', titleKey: 'gm.section.live', hintKey: 'gm.section.liveHint' },
  { id: 'map', titleKey: 'gm.section.map', hintKey: 'gm.section.mapHint' },
  { id: 'logs', titleKey: 'gm.section.logs', hintKey: 'gm.section.logsHint' },
  { id: 'skins', titleKey: 'gm.section.skins', hintKey: 'gm.section.skinsHint' },
  { id: 'spawn', titleKey: 'gm.section.spawn', hintKey: 'gm.section.spawnHint' },
  { id: 'character', titleKey: 'gm.section.character', hintKey: 'gm.section.characterHint' },
  { id: 'moderation', titleKey: 'gm.section.moderation', hintKey: 'gm.section.moderationHint' },
  { id: 'events', titleKey: 'gm.section.events', hintKey: 'gm.section.eventsHint' },
  { id: 'macros', titleKey: 'gm.section.macros', hintKey: 'gm.section.macrosHint' },
  { id: 'console', titleKey: 'gm.section.console', hintKey: 'gm.section.consoleHint' },
];

export type SentLine = { id: number; line: string; at: number };

/** A macro going through its steps: which one, and how far. */
export type MacroRun = { id: string; name: string; step: number; total: number };

/** How often a macro looks whether its last line has gone out yet, ms. */
const MACRO_POLL_MS = 50;

export const GmPanel = new (class _GmPanel {
  open = false;

  section: GmSection = 'live';

  /**
   * The character the Character and Moderation tabs act on. Blank means
   * "me" wherever the command allows it. Set by clicking a player anywhere
   * in the panel, which is the whole point: a name typed by hand is a name
   * typed wrong.
   */
  target = '';

  /** The Console's filter box. While it holds anything, it searches every group. */
  query = '';

  /** The Console's raw line, which a sent line can be loaded back into. */
  raw = '';

  /** The macro running, if one is. */
  macroRun: MacroRun | null = null;

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

  /** The top bar's player search, shared by the Live and Map tabs. */
  search = '';

  /** The tracked player whose details are open, by the tracker's id. */
  selectedPlayerId: string | null = null;

  /** The map the Map tab shows; null is wherever the game master stands. */
  mapView: number | null = null;

  /** The character whose log the Logs tab reads. */
  logCharacter = '';

  /** The last `/skin` sent; 0 is the own body. What the server holds is not reported back. */
  skin = 0;

  private nextId = 1;

  private queue: string[] = [];

  private timer: ReturnType<typeof setTimeout> | null = null;

  private macroTimer: ReturnType<typeof setTimeout> | null = null;

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

  /** A player row anywhere, or the field on the Character tab. */
  setTarget(name: string): void {
    this.target = name;
    this.error = null;
    this.confirming = null;
  }

  setQuery(value: string): void {
    this.query = value;
  }

  setRaw(value: string): void {
    this.raw = value;
  }

  /** A line put back in the Console to edit and send again. */
  loadLine(line: string): void {
    this.raw = line;
    this.setSection('console');
  }

  /** A pinned line: sent at once, its placeholders filled in for where it runs. */
  runLine(line: string, vars: MacroVars): void {
    this.sendRaw(expandLine(line, vars));
  }

  /**
   * Send a macro's lines one after another. Each step waits for the line
   * before it to have actually gone out (the queue holds lines back for the
   * chat cooldown), then for its own delay, so a delay is the gap the players
   * see. A step with no line, or one that is not a command, is skipped.
   */
  runMacro(macro: Macro, vars: MacroVars): void {
    this.stopMacro();
    const steps = macro.steps
      .map(step => ({ line: expandLine(step.line, vars), delayMs: step.delayMs }))
      .filter(step => step.line.startsWith('/'));
    if (steps.length === 0) return;

    this.error = null;
    this.macroRun = { id: macro.id, name: macro.name, step: 0, total: steps.length };

    const next = (i: number) => {
      this.macroTimer = null;
      if (this.queue.length > 0) {
        this.macroTimer = setTimeout(() => next(i), MACRO_POLL_MS);
        return;
      }

      runInAction(() => {
        this.send(steps[i].line);
        if (i + 1 >= steps.length) {
          this.macroRun = null;
        } else if (this.macroRun) {
          this.macroRun = { ...this.macroRun, step: i + 1 };
        }
      });
      if (i + 1 < steps.length) {
        this.macroTimer = setTimeout(() => next(i + 1), steps[i].delayMs);
      }
    };

    next(0);
  }

  stopMacro(): void {
    if (this.macroTimer) clearTimeout(this.macroTimer);
    this.macroTimer = null;
    this.macroRun = null;
  }

  setSearch(value: string): void {
    this.search = value;
  }

  selectPlayer(id: string | null): void {
    this.selectedPlayerId = id;
  }

  setMapView(map: number | null): void {
    this.mapView = map;
  }

  setLogCharacter(name: string): void {
    this.logCharacter = name;
  }

  /** Open the Logs tab on a character. */
  showLog(name: string): void {
    this.logCharacter = name;
    this.setSection('logs');
  }

  /** Open the Map tab on a map, with a player picked out. */
  showOnMap(map: number | null, playerId: string | null): void {
    this.mapView = map;
    this.selectedPlayerId = playerId;
    this.setSection('map');
  }

  setSkin(skin: number): void {
    this.skin = skin;
  }

  /**
   * What the Console lists: the commands matching the filter box, or all of
   * them grouped when it is empty. Searching across groups is the point of it -
   * `/setmoney` is only in Players if you already knew that.
   */
  get consoleGroups(): readonly { titleKey: TextKey; commands: readonly GmCommand[] }[] {
    if (!this.query.trim()) return GM_GROUPS;

    const found = matchGmCommands(this.query);
    return found.length ? [{ titleKey: 'gm.console.matches', commands: found }] : [];
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
   * shared target, so picking someone in Live fills every tab at once without
   * copying the name into each form.
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
      this.error = t('gm.error.needsSlash');
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
    this.stopMacro();
    runInAction(() => {
      this.open = false;
      this.section = 'live';
      this.target = '';
      this.query = '';
      this.raw = '';
      this.search = '';
      this.selected = null;
      this.selectedPlayerId = null;
      this.mapView = null;
      this.logCharacter = '';
      this.skin = 0;
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
