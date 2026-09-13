import { describe, expect, it } from 'vitest';
import { Scope } from './scope';
import type { BotConnection, Frame, FrameHandler } from './connection';
import { codeOf } from './wire';

/**
 * The scope has to see a customer whichever packet the server announced
 * them with. A player wearing a transformation ring (or a game master's
 * `/skin`) arrives as 0x45 rather than 0x12, and until that was read the
 * bot could stand next to somebody and swear nobody was there.
 */
class FakeConnection {
  private readonly handlers: FrameHandler[] = [];

  on(handler: FrameHandler): () => void {
    this.handlers.push(handler);
    return () => {
      const i = this.handlers.indexOf(handler);
      if (i >= 0) this.handlers.splice(i, 1);
    };
  }

  deliver(bytes: Uint8Array): void {
    const { code, sub } = codeOf(bytes);
    const frame: Frame = { code, sub, bytes };
    for (const handler of [...this.handlers]) handler(frame);
  }

  asConnection(): BotConnection {
    return this as unknown as BotConnection;
  }
}

/** C2 45: count, then 38-byte blocks (id, x, y, skin, name, target, rot, appearance, effects). */
function transformedScope(entries: { id: number; x: number; y: number; skin: number; name: string }[]) {
  const size = 5 + entries.length * 38;
  const b = new Uint8Array(size);
  b[0] = 0xc2;
  b[1] = (size >> 8) & 0xff;
  b[2] = size & 0xff;
  b[3] = 0x45;
  b[4] = entries.length;
  let at = 5;
  for (const e of entries) {
    b[at] = (e.id >> 8) & 0xff;
    b[at + 1] = e.id & 0xff;
    b[at + 2] = e.x;
    b[at + 3] = e.y;
    b[at + 4] = (e.skin >> 8) & 0xff;
    b[at + 5] = e.skin & 0xff;
    for (let i = 0; i < 10; i++) b[at + 6 + i] = i < e.name.length ? e.name.charCodeAt(i) : 0;
    b[at + 16] = e.x;
    b[at + 17] = e.y;
    b[at + 37] = 0;
    at += 38;
  }
  return b;
}

describe('a transformed player', () => {
  it('is in scope by name, with the spawn flag stripped from the id', () => {
    const connection = new FakeConnection();
    const scope = new Scope(connection.asConnection());

    connection.deliver(transformedScope([{ id: 0x8003, x: 120, y: 140, skin: 547, name: 'Buyer' }]));

    const seen = scope.byName('buyer');
    expect(seen).not.toBeNull();
    expect(seen!.id).toBe(3);
    expect(seen!.x).toBe(120);
    expect(seen!.y).toBe(140);
  });

  it('is still never the bot itself', () => {
    const connection = new FakeConnection();
    const scope = new Scope(connection.asConnection());
    scope.selfName = 'MKT001';

    connection.deliver(transformedScope([{ id: 7, x: 1, y: 1, skin: 547, name: 'MKT001' }]));

    expect(scope.byName('MKT001')).toBeNull();
    expect(scope.all).toEqual([]);
  });
});
