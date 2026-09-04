/**
 * Bootstrap: resolve the game version, then boot the app.
 *
 * The version comes from the active server profile's tag (the persisted
 * selection; `versionIdForTag` defaults to season6), its body from a
 * dynamic import (versions/registry.ts) - one build carries every version,
 * the page loads one. The awaits are the async boundary: `boot.tsx` and the
 * whole app graph behind it read `gameVersion` at module scope, so they are
 * imported only after it is assigned.
 */
import { ServerConfig } from './common/serverConfig';
import { loadGameVersion, versionIdForTag } from './version';

async function bootstrap() {
  await loadGameVersion(versionIdForTag(ServerConfig.active.version));
  await import('./boot');
}

bootstrap().catch(e => {
  console.error('boot failed:', e);
  throw e;
});
