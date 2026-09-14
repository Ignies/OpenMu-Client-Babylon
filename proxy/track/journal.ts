import type { LogQuery, TrackEvent } from '../../src/common/adminProtocol';

/**
 * Where journal lines go and come back from. The SQLite one (`store.ts`)
 * needs `bun:sqlite`, which vitest cannot load, so the interface lives here
 * with a memory-backed one for tests and for `TRACK=off`.
 */
export interface Journal {
  append(event: TrackEvent): void;
  /** Newest first. One more than `limit` is asked for, so `more` is honest. */
  query(query: LogQuery): { events: TrackEvent[]; more: boolean };
  close(): void;
}

export const DEFAULT_LOG_LIMIT = 100;
export const MAX_LOG_LIMIT = 500;

export function clampLimit(limit: number | undefined): number {
  if (!limit || !Number.isFinite(limit)) return DEFAULT_LOG_LIMIT;
  return Math.max(1, Math.min(MAX_LOG_LIMIT, Math.floor(limit)));
}

export class MemoryJournal implements Journal {
  private readonly rows: TrackEvent[] = [];
  private nextId = 1;

  constructor(private readonly capacity = 20_000) {}

  append(event: TrackEvent): void {
    this.rows.push({ ...event, id: this.nextId++ });
    if (this.rows.length > this.capacity) this.rows.splice(0, this.rows.length - this.capacity);
  }

  query(query: LogQuery): { events: TrackEvent[]; more: boolean } {
    const limit = clampLimit(query.limit);
    const wanted = query.character.toLowerCase();
    const kinds = query.kinds?.length ? new Set(query.kinds) : null;
    const found: TrackEvent[] = [];

    for (let i = this.rows.length - 1; i >= 0 && found.length <= limit; i--) {
      const row = this.rows[i];
      if ((row.character ?? '').toLowerCase() !== wanted) continue;
      if (query.before !== undefined && row.at >= query.before) continue;
      if (kinds && !kinds.has(row.kind)) continue;
      found.push(row);
    }

    return { events: found.slice(0, limit), more: found.length > limit };
  }

  close(): void {}
}
