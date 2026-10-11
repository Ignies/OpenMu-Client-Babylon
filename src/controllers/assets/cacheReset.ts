/** The worker's asset cache (`public/sw.js` `CACHE`). */
const ASSET_CACHE = 'mu-assets-v1';
/** Kept: the biggest download, and it does not change (`public/sw.js` `KEPT_ACROSS_BUILDS`). */
const KEPT = /\/Music\/|\.(mp3|ogg|wav)$/i;

/**
 * What Ctrl+F5 does, for a player who cannot press it (the installed app, a phone): drops what the
 * asset worker cached but the music, unregisters the worker so the next load installs it anew, and
 * reloads with a throwaway query so the browser asks the server for the page again.
 */
export async function clearCacheAndReload(): Promise<void> {
  try {
    if (typeof caches !== 'undefined') {
      for (const name of await caches.keys()) {
        if (name !== ASSET_CACHE) {
          await caches.delete(name);
          continue;
        }
        const cache = await caches.open(name);
        for (const request of await cache.keys()) {
          if (!KEPT.test(new URL(request.url).pathname)) await cache.delete(request);
        }
      }
    }
    for (const registration of (await navigator.serviceWorker?.getRegistrations()) ?? []) {
      await registration.unregister();
    }
  } catch {
    // Whatever could not be cleared, the reload below still fetches the page anew.
  }

  const url = new URL(location.href);
  url.searchParams.set('r', Date.now().toString(36));
  location.replace(url.toString());
}
