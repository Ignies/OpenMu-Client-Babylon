// server.json: the settings every player on this server gets (read by src/modules/servers/serverManifest.ts).
import type { Config } from '../config';

const MANIFEST_VERSION = 1;

/** The client modules players on this world go without: the ones listed, and band when its relay is off. */
export function manifestModulesOff(c: Config): string[] {
  const listed = c.modulesOff.split(',').map(s => s.trim()).filter(Boolean);
  if (!c.band) listed.push('band');
  return [...new Set(listed)].sort();
}

export function serverManifest(c: Config): string {
  const manifest = {
    version: MANIFEST_VERSION,
    settings: { heldHitRequest: c.heldHitRequest, retryLoginWhenConnected: c.retryLoginWhenConnected },
    modulesOff: manifestModulesOff(c),
  };
  return `${JSON.stringify(manifest, null, 2)}\n`;
}
