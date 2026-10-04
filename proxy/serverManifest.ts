// `GET /server.json` on the proxy: what this server decides for its players (format:
// src/modules/servers/readme.md). An installed server has Caddy answer it first from the installer's
// file; this answers the same document where the proxy runs alone (dev, a hand-made setup).

export const SERVER_MANIFEST_PATH = '/server.json';

/** The manifest from the proxy's environment; `MU_HELD_HIT_REQUEST=on` is the installer's own key. */
export function serverManifest(env: Record<string, string | undefined> = process.env) {
  return { version: 1, settings: { heldHitRequest: env.MU_HELD_HIT_REQUEST === 'on' } };
}

export function serverManifestResponse(env?: Record<string, string | undefined>): Response {
  return new Response(JSON.stringify(serverManifest(env)), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache',
    },
  });
}
