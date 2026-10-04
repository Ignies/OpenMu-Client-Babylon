// server.json: the settings every player on this server gets (read by src/modules/servers/serverManifest.ts).
import type { Config } from '../config';

export const MANIFEST_VERSION = 1;

export function serverManifest(c: Config): string {
  const manifest = { version: MANIFEST_VERSION, settings: { heldHitRequest: c.heldHitRequest } };
  return `${JSON.stringify(manifest, null, 2)}\n`;
}
