// `GET /server.json` on the proxy: what this server decides for its players (format:
// src/modules/servers/readme.md). An installed server has Caddy answer it first from the installer's
// file; this answers the same document where the proxy runs alone (dev, a hand-made setup).

export const SERVER_MANIFEST_PATH = '/server.json';

type Env = Record<string, string | undefined>;

/** `MU_MODULES_OFF` (comma separated), plus `band` when the band relay is off (`BAND=off`). */
function modulesOff(env: Env): string[] {
  const listed = (env.MU_MODULES_OFF ?? '').split(',').map(s => s.trim()).filter(Boolean);
  if (env.BAND === 'off') listed.push('band');
  return [...new Set(listed)].sort();
}

/** The manifest from the proxy's environment; the `MU_*=on` keys are the installer's own. */
export function serverManifest(env: Env = process.env) {
  return {
    version: 1,
    settings: {
      heldHitRequest: env.MU_HELD_HIT_REQUEST === 'on',
      retryLoginWhenConnected: env.MU_RETRY_LOGIN_WHEN_CONNECTED === 'on',
      muHelperAfterReconnect: env.MU_HELPER_AFTER_RECONNECT === 'on',
    },
    modulesOff: modulesOff(env),
  };
}

export function serverManifestResponse(env?: Env): Response {
  return new Response(JSON.stringify(serverManifest(env)), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache',
    },
  });
}
