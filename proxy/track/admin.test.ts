import { describe, expect, it } from 'vitest';
import type { AdminServerMessage, TrackEvent } from '../../src/common/adminProtocol';
import { AdminHub, type AdminSocket } from './admin';
import { MemoryJournal } from './journal';
import { Tracker } from './tracker';
import { WireEncoder } from './wire';
import {
  characterInformation,
  characterList,
  chat,
  gameServerEntered,
  selectCharacter,
  walk,
} from './packets';

const NONCE = 'b'.repeat(32);

function fakeSocket() {
  const sent: AdminServerMessage[] = [];
  const socket: AdminSocket & { sent: AdminServerMessage[]; closed: boolean } = {
    sent,
    closed: false,
    send: text => sent.push(JSON.parse(text) as AdminServerMessage),
    close: () => {
      socket.closed = true;
    },
  };
  return socket;
}

function enterWorld(tracker: Tracker, nonce: string | null, name: string, gm: boolean) {
  const session = tracker.open(nonce, 55901);
  const wire = new WireEncoder();
  session.feedServer(wire.server(gameServerEntered(10)));
  session.setAccount(name.toLowerCase());
  session.feedServer(wire.server(characterList([{ name, cls: 4, level: 50, status: gm ? 32 : 0 }])));
  session.feedClient(wire.client(selectCharacter(name)));
  session.feedServer(wire.server(characterInformation({ x: 100, y: 100, map: 0, status: gm ? 32 : 0 })));
  return { session, wire };
}

describe('AdminHub', () => {
  it('refuses without a nonce, without a game master, and opens for one', () => {
    const tracker = new Tracker();
    const hub = new AdminHub(tracker, new MemoryJournal(), { open: false });

    expect(hub.authorise(null, true)).toBe('no-session');
    expect(hub.authorise(NONCE, true)).toBe('not-gm');

    enterWorld(tracker, NONCE, 'Bobby', false);
    expect(hub.authorise(NONCE, false)).toBe('not-gm');

    enterWorld(tracker, NONCE, 'Aeris', true);
    expect(hub.authorise(NONCE, false)).toBe('ok');
  });

  it('opens for loopback only when the dev seam is on', () => {
    const tracker = new Tracker();
    const hub = new AdminHub(tracker, new MemoryJournal(), { open: true });
    expect(hub.authorise(null, true)).toBe('ok');
    expect(hub.authorise(null, false)).toBe('no-session');
  });

  it('sends the snapshot on attach and the deltas after', () => {
    const tracker = new Tracker();
    const hub = new AdminHub(tracker, new MemoryJournal(), { open: true });
    const { session, wire } = enterWorld(tracker, NONCE, 'Aeris', true);
    tracker.flush();

    const socket = fakeSocket();
    hub.attach(socket);

    expect(socket.sent[0].t).toBe('snapshot');
    const snapshot = socket.sent[0];
    if (snapshot.t !== 'snapshot') throw new Error('expected a snapshot');
    expect(snapshot.players).toHaveLength(1);
    expect(snapshot.players[0].character).toBe('Aeris');
    expect(snapshot.players[0].gm).toBe(true);

    session.feedClient(wire.client(walk(100, 100, [3, 3])));
    tracker.flush();
    const move = socket.sent.find(m => m.t === 'move');
    expect(move).toEqual({ t: 'move', id: session.id, map: 0, x: 102, y: 100 });

    session.feedClient(wire.client(chat('Aeris', 'hi')));
    const event = socket.sent.find(m => m.t === 'event' && m.event.kind === 'chat');
    if (!event || event.t !== 'event') throw new Error('expected an event');
    expect(event.event.kind).toBe('chat');
    expect(event.event.text).toBe('hi');

    tracker.close(session);
    expect(socket.sent.find(m => m.t === 'leave')).toEqual({ t: 'leave', id: session.id });

    hub.detach(socket);
    expect(hub.clientCount).toBe(0);
  });

  it('answers a log query from the journal, newest first, with paging', () => {
    const tracker = new Tracker();
    const journal = new MemoryJournal();
    tracker.subscribe({ event: (_id, e) => journal.append(e) });
    const hub = new AdminHub(tracker, journal, { open: true });
    const { session, wire } = enterWorld(tracker, NONCE, 'Aeris', true);

    for (let i = 0; i < 5; i++) session.feedClient(wire.client(chat('Aeris', `line ${i}`)));

    const socket = fakeSocket();
    hub.attach(socket);
    hub.receive(socket, JSON.stringify({ t: 'log', reqId: 7, character: 'aeris', kinds: ['chat'], limit: 3 }));

    const answer = socket.sent.find(m => m.t === 'log');
    if (!answer || answer.t !== 'log') throw new Error('expected a log answer');
    expect(answer.reqId).toBe(7);
    expect(answer.more).toBe(true);
    expect(answer.events.map((e: TrackEvent) => e.text)).toEqual(['line 4', 'line 3', 'line 2']);

    hub.receive(socket, JSON.stringify({ t: 'log', reqId: 8, character: 'aeris', kinds: ['chat'], limit: 3, before: answer.events[2].at }));
    const older = socket.sent.filter(m => m.t === 'log')[1];
    if (!older || older.t !== 'log') throw new Error('expected a second page');
    // Same timestamp on every line here, so `before` excludes them all: an
    // honest empty page rather than the same three again.
    expect(older.events).toEqual([]);
    expect(older.more).toBe(false);
  });

  it('ignores a malformed request and a blank character', () => {
    const tracker = new Tracker();
    const hub = new AdminHub(tracker, new MemoryJournal(), { open: true });
    const socket = fakeSocket();
    hub.attach(socket);
    const before = socket.sent.length;

    hub.receive(socket, 'not json');
    hub.receive(socket, JSON.stringify({ t: 'log', reqId: 1, character: '   ' }));
    hub.receive(socket, JSON.stringify({ t: 'ping' }));

    expect(socket.sent.slice(before)).toEqual([{ t: 'pong' }]);
  });
});
