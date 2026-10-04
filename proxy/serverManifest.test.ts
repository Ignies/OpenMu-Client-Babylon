import { describe, expect, it } from 'vitest';
import { parseServerManifest } from '../src/modules/servers/serverManifest';
import { serverManifest, serverManifestResponse } from './serverManifest';

describe('the proxy server.json', () => {
  it('keeps the original behaviour unless the installer key turns it on', () => {
    expect(serverManifest({}).settings.heldHitRequest).toBe(false);
    expect(serverManifest({ MU_HELD_HIT_REQUEST: 'on' }).settings.heldHitRequest).toBe(true);
  });

  it('turns off the modules MU_MODULES_OFF lists, and band when the relay is off', () => {
    expect(serverManifest({}).modulesOff).toEqual([]);
    expect(serverManifest({ MU_MODULES_OFF: 'events, marketplace', BAND: 'off' }).modulesOff).toEqual(['band', 'events', 'marketplace']);
    expect(parseServerManifest(serverManifest({ MU_MODULES_OFF: 'events' }))?.modulesOff).toEqual(['events']);
  });

  it('is a document the client accepts, readable from any origin', async () => {
    const res = serverManifestResponse({ MU_HELD_HIT_REQUEST: 'on' });
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(parseServerManifest(await res.json())?.settings.heldHitRequest).toBe(true);
  });
});
