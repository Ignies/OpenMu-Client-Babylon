import { describe, expect, it } from 'vitest';
import type { TrackEvent } from '../../src/common/adminProtocol';
import { TrackedSession, type SessionOptions } from './session';
import { WireEncoder } from './wire';
import {
  characterInformation,
  characterList,
  chat,
  experience,
  gameServerEntered,
  hit,
  itemAdded,
  itemBytes,
  itemsDropped,
  levelUpdate,
  mapChanged,
  moneyUpdate,
  npcsInScope,
  objectKilled,
  pickup,
  playersInScope,
  selectCharacter,
  walk,
  whisper,
} from './packets';

/**
 * Every frame here is built by the client's and the server's own encoders
 * and read back through the session's decoders, so what is asserted is the
 * whole path: the bytes a real socket would carry, the state and the lines
 * they turn into.
 */

function harness(options: SessionOptions = {}) {
  const events: TrackEvent[] = [];
  let changes = 0;
  let moves = 0;
  let clock = 1_000_000;
  const session = new TrackedSession(
    'a'.repeat(32),
    55901,
    {
      event: (_s, e) => events.push(e),
      change: () => changes++,
      move: () => moves++,
    },
    { now: () => clock, ...options }
  );
  const wire = new WireEncoder();

  return {
    session,
    events,
    get changes() {
      return changes;
    },
    get moves() {
      return moves;
    },
    tick(ms: number) {
      clock += ms;
    },
    server(packet: Uint8Array) {
      session.feedServer(wire.server(packet));
    },
    client(packet: Uint8Array) {
      session.feedClient(wire.client(packet));
    },
    /** The usual way in: entered, logged in, listed, picked, placed. */
    enter(gm = false) {
      this.server(gameServerEntered(77));
      session.setAccount('tester');
      this.server(characterList([{ name: 'Aeris', cls: 7, level: 400, status: gm ? 32 : 0 }]));
      this.client(selectCharacter('Aeris'));
      this.server(characterInformation({ x: 130, y: 120, map: 2, money: 500, status: gm ? 32 : 0, hp: 800, maxHp: 1000 }));
    },
    kinds() {
      return events.map(e => e.kind);
    },
    last() {
      return events[events.length - 1];
    },
  };
}

describe('TrackedSession', () => {
  it('reads the account, the character and where it stands off the login sequence', () => {
    const h = harness();
    expect(h.session.identified).toBe(false);

    h.enter(true);

    const snap = h.session.snapshot();
    expect(snap.account).toBe('tester');
    expect(snap.character).toBe('Aeris');
    expect(snap.cls).toBe(7);
    expect(snap.level).toBe(400);
    expect(snap.map).toBe(2);
    expect(snap.x).toBe(130);
    expect(snap.y).toBe(120);
    expect(snap.money).toBe(500);
    expect(snap.hp).toBe(800);
    expect(snap.maxHp).toBe(1000);
    expect(snap.gm).toBe(true);
    expect(h.session.inWorld).toBe(true);
    expect(h.session.objectId).toBe(77);

    expect(h.kinds()).toEqual(['login', 'select']);
    expect(h.last().text).toBe('entered the world as Aeris (Blade Master, level 400) in Devias at 130, 120');
  });

  it('is not a game master on the server status alone being absent', () => {
    const h = harness();
    h.enter(false);
    expect(h.session.gameMaster).toBe(false);
  });

  it('replays a walk request to the tile the server was asked for', () => {
    const h = harness();
    h.enter();
    const movesBefore = h.moves;

    // S, S, SE, E: (130,120) -> (131,119) -> (132,118) -> (133,118) -> (134,119)
    h.client(walk(130, 120, [2, 2, 3, 4]));

    expect(h.session.x).toBe(134);
    expect(h.session.y).toBe(119);
    expect(h.moves).toBe(movesBefore + 1);
    expect(h.last().kind).toBe('walk');
    expect(h.last().text).toBe('walked at 134, 119');
  });

  it('journals one walk line per window but moves on every packet', () => {
    const h = harness();
    h.enter();
    const before = h.events.length;

    h.client(walk(130, 120, [3]));
    h.tick(1000);
    h.client(walk(131, 120, [3]));
    h.tick(1000);
    h.client(walk(132, 120, [3]));

    expect(h.session.x).toBe(133);
    expect(h.events.length - before).toBe(1);

    h.tick(5000);
    h.client(walk(133, 120, [3]));
    expect(h.events.length - before).toBe(2);
  });

  it('follows a map change and names the map', () => {
    const h = harness();
    h.enter();

    h.server(mapChanged(0, 125, 130));

    expect(h.session.map).toBe(0);
    expect(h.session.x).toBe(125);
    expect(h.last().kind).toBe('map');
    expect(h.last().text).toBe('entered Lorencia at 125, 130');
  });

  it('files chat by its prefix and keeps a command as typed', () => {
    const h = harness();
    h.enter();

    h.client(chat('Aeris', 'hello there'));
    h.client(chat('Aeris', '~on my way'));
    h.client(chat('Aeris', '@guild meeting'));
    h.client(chat('Aeris', '!server restart soon'));
    h.client(chat('Aeris', '/skin 3'));

    expect(h.kinds().slice(-5)).toEqual(['chat', 'party', 'guild', 'shout', 'command']);
    expect(h.events[h.events.length - 5].text).toBe('hello there');
    expect(h.last().text).toBe('/skin 3');
    expect(h.last().data).toEqual({ line: '/skin 3' });
  });

  it('journals what a whisper said unless told not to', () => {
    const loud = harness();
    loud.enter();
    loud.client(whisper('Bobby', 'meet me in devias'));
    expect(loud.last().kind).toBe('whisper');
    expect(loud.last().text).toBe('whispered to Bobby: meet me in devias');

    const quiet = harness({ whispers: false });
    quiet.enter();
    quiet.client(whisper('Bobby', 'meet me in devias'));
    expect(quiet.last().text).toBe('whispered to Bobby');
    expect(quiet.last().data).toEqual({ to: 'Bobby' });
  });

  it('names kills, deaths and fights from what is in scope', () => {
    const h = harness();
    h.enter();
    h.server(npcsInScope([{ id: 500, type: 0, x: 131, y: 121 }]));
    h.server(playersInScope([{ id: 600, name: 'Bobby', x: 132, y: 122 }]));

    h.client(hit(500));
    h.client(hit(500));
    expect(h.kinds().filter(k => k === 'attack')).toHaveLength(1);
    expect(h.last().text).toBe('attacked Bull Fighter');

    h.server(objectKilled(500, 77));
    expect(h.last().kind).toBe('kill');
    expect(h.last().text).toBe('killed Bull Fighter');

    h.server(experience(500, 240));
    expect(h.last().kind).toBe('exp');
    expect(h.last().text).toBe('+240 exp (Bull Fighter)');

    h.server(objectKilled(77, 600));
    expect(h.last().kind).toBe('death');
    expect(h.last().text).toBe('was killed by Bobby');
  });

  it('matches a pickup with the item the server then hands over', () => {
    const h = harness();
    h.enter();
    const kris = itemBytes(0, 0, 3);

    h.server(itemsDropped([{ id: 900, x: 130, y: 121, item: kris }]));
    h.client(pickup(900));
    h.server(itemAdded(24, kris));

    expect(h.last().kind).toBe('pickup');
    expect(h.last().text).toBe('picked up Kris +3');

    // The same packet with no pickup asked for is something received.
    h.tick(10_000);
    h.server(itemAdded(25, itemBytes(0, 1, 7)));
    expect(h.last().kind).toBe('item');
    expect(h.last().text).toBe('received Short Sword +7');
  });

  it('reports money as a delta and a level as a milestone', () => {
    const h = harness();
    h.enter();

    h.server(moneyUpdate(1500));
    expect(h.last().kind).toBe('money');
    expect(h.last().text).toBe('money is now 1500 (+1000)');
    expect(h.session.money).toBe(1500);

    h.server(levelUpdate(401));
    expect(h.last().kind).toBe('level');
    expect(h.last().text).toBe('reached level 401');
    expect(h.session.level).toBe(401);
  });

  it('says goodbye once when the socket goes', () => {
    const h = harness();
    h.enter();
    h.session.close();
    h.session.close();
    expect(h.kinds().filter(k => k === 'logout')).toEqual(['logout']);
    expect(h.last().text).toBe('disconnected');

    const silent = harness();
    silent.session.close();
    expect(silent.events).toEqual([]);
  });
});
