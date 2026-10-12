import { describe, expect, it } from 'vitest';
import { checkDirectLogin, DirectLogin, directChannel, readDirectLogin } from './directLogin';
import { ServerConfig } from './serverConfig';

const LIST = '# Server list\n\n[S6EP3:My MU:Season 6 Episode 3, played in the browser:en](example.com)\n';

/** The files served beside the page, by name; a missing one reads as null (a 404, a failed fetch). */
const served = (files: Record<string, string>) => async (file: string) => files[file] ?? null;

describe('readDirectLogin', () => {
  it('stays off without a server.json beside the client', async () => {
    expect(await readDirectLogin(served({ 'serverlist.md': LIST }))).toBeNull();
  });

  it('stays off when server.json says off or nothing', async () => {
    const off = '{"version":1,"settings":{},"directLogin":false}';
    expect(await readDirectLogin(served({ 'server.json': off, 'serverlist.md': LIST }))).toBeNull();
    expect(await readDirectLogin(served({ 'server.json': '{"version":1,"settings":{}}', 'serverlist.md': LIST }))).toBeNull();
  });

  it('stays off for a malformed server.json', async () => {
    for (const body of ['<!doctype html>', '{"version":1,"settings":{},"directLogin":"on"}', '{"directLogin":true}', 'true']) {
      expect(await readDirectLogin(served({ 'server.json': body, 'serverlist.md': LIST })), body).toBeNull();
    }
  });

  it('opens on the first world of the serverlist.md beside it when on', async () => {
    const on = '{"version":1,"settings":{},"directLogin":true}';
    expect(await readDirectLogin(served({ 'server.json': on, 'serverlist.md': LIST }))).toMatchObject({
      id: 'list:example.com',
      name: 'My MU',
      listed: true,
    });
    // On, but no world to open on: the worlds list as before.
    expect(await readDirectLogin(served({ 'server.json': on }))).toBeNull();
  });
});

describe('directChannel', () => {
  it('takes the first channel of the first game server, as the picker shows it first', () => {
    const list = [
      { ServerId: 0x101, LoadPercentage: 0 },
      { ServerId: 0x001, LoadPercentage: 0 },
      { ServerId: 0x000, LoadPercentage: 90 },
    ];
    expect(directChannel(list, [])).toEqual({ serverId: 0, selected: { name: 'Server 1', channel: 1, channelName: undefined } });
    expect(directChannel([], [])).toBeNull();
  });

  it('uses the names the world published', () => {
    const published = [{ id: 1, name: 'Valhalla', channels: [{ id: 3, name: 'Hard' }] }];
    expect(directChannel([{ ServerId: 0x103 }], published)?.selected).toEqual({
      name: 'Valhalla',
      channel: 1,
      channelName: 'Hard',
    });
  });
});

describe('checkDirectLogin', () => {
  it('makes the world the only one, and selected', async () => {
    expect(DirectLogin.on).toBe(false);
    await checkDirectLogin(served({ 'server.json': '{"version":1,"settings":{},"directLogin":true}', 'serverlist.md': LIST }));
    expect(DirectLogin.checked).toBe(true);
    expect(DirectLogin.on).toBe(true);
    expect(ServerConfig.all.map(w => w.id)).toEqual(['list:example.com']);
    expect(ServerConfig.active.id).toBe('list:example.com');
    expect(ServerConfig.activeId).toBe('list:example.com');
  });
});
