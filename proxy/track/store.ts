import { Database } from 'bun:sqlite';
import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { migrate } from '../../tools/sqliteMigrate';
import type { LogQuery, TrackEvent } from '../../src/common/adminProtocol';
import { clampLimit, type Journal } from './journal';

/**
 * The journal on disk.
 *
 * Its own file, not OpenMU's database and not any other service's: this is
 * what was *observed* on the wire, and nothing here can reach an account.
 * The schema is `migrations/001_character_events.sql`, applied here on a
 * fresh box and by hand on a live one - the same file both times.
 *
 * Lines are written in batches: they queue in memory and land in one
 * transaction every half second, so a busy hour is a few hundred inserts
 * rather than a few hundred fsyncs.
 */

export const DEFAULT_TRACK_DB = join(homedir(), '.mu-proxy', 'track.sqlite');

const FLUSH_MS = 500;
const PRUNE_MS = 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

type Row = {
  id: number;
  at: number;
  account: string | null;
  character: string | null;
  kind: string;
  text: string;
  data: string | null;
};

export class SqliteJournal implements Journal {
  private readonly db: Database;
  private readonly insert;
  private pending: TrackEvent[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly pruneTimer: ReturnType<typeof setInterval>;

  constructor(path: string, private readonly retainDays: number) {
    mkdirSync(dirname(path), { recursive: true });
    this.db = new Database(path, { create: true });
    this.db.run('PRAGMA journal_mode = WAL');

    const applied = migrate(this.db, join(import.meta.dir, '..', 'migrations'));
    if (applied.length > 0) {
      console.info(`track: applied ${applied.length} migration(s): ${applied.join(', ')}`);
    }

    this.insert = this.db.query<unknown, [number, string | null, string | null, string, string, string | null]>(
      'INSERT INTO character_events (at, account, character, kind, text, data) VALUES (?, ?, ?, ?, ?, ?)'
    );

    this.prune();
    this.pruneTimer = setInterval(() => this.prune(), PRUNE_MS);
  }

  append(event: TrackEvent): void {
    this.pending.push(event);
    if (!this.flushTimer) this.flushTimer = setTimeout(() => this.flush(), FLUSH_MS);
  }

  flush(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.pending.length === 0) return;

    const batch = this.pending;
    this.pending = [];

    try {
      this.db.transaction(() => {
        for (const event of batch) {
          this.insert.run(
            event.at,
            event.account,
            event.character,
            event.kind,
            event.text,
            event.data ? JSON.stringify(event.data) : null
          );
        }
      })();
    } catch (error) {
      console.error('track: journal write failed:', error);
    }
  }

  query(query: LogQuery): { events: TrackEvent[]; more: boolean } {
    const limit = clampLimit(query.limit);
    const where: string[] = ['character = ? COLLATE NOCASE'];
    const params: (string | number)[] = [query.character];

    if (query.before !== undefined) {
      where.push('at < ?');
      params.push(query.before);
    }
    if (query.kinds?.length) {
      where.push(`kind IN (${query.kinds.map(() => '?').join(', ')})`);
      params.push(...query.kinds);
    }

    // The queue is flushed first so a line written a moment ago is in the answer.
    this.flush();

    const rows = this.db
      .query<Row, (string | number)[]>(
        `SELECT id, at, account, character, kind, text, data FROM character_events
         WHERE ${where.join(' AND ')}
         ORDER BY at DESC, id DESC
         LIMIT ?`
      )
      .all(...params, limit + 1);

    const events = rows.slice(0, limit).map(row => {
      const event: TrackEvent = {
        id: row.id,
        at: row.at,
        account: row.account,
        character: row.character,
        kind: row.kind as TrackEvent['kind'],
        text: row.text,
      };
      if (row.data) {
        try {
          event.data = JSON.parse(row.data) as Record<string, unknown>;
        } catch {
          /* a line nobody can parse is still a line */
        }
      }
      return event;
    });

    return { events, more: rows.length > limit };
  }

  private prune(): void {
    if (!(this.retainDays > 0)) return;
    try {
      this.db.run('DELETE FROM character_events WHERE at < ?', [Date.now() - this.retainDays * DAY_MS]);
    } catch (error) {
      console.error('track: prune failed:', error);
    }
  }

  close(): void {
    clearInterval(this.pruneTimer);
    this.flush();
    this.db.close();
  }
}
