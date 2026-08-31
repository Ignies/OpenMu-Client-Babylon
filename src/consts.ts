export const MAX_USERNAME_LENGTH = 10;
export const MAX_PASSWORD_LENGTH = 10;
import { gameVersion } from './version';

/** Login `ClientVersion` bytes of the selected game version . */
export const CLIENT_VERSION: readonly number[] = gameVersion.clientVersionBytes;
/** Login `ClientSerial` bytes of the selected game version. */
export const CLIENT_SERIAL: readonly number[] = gameVersion.serialBytes;

// Connect-server and ws-proxy endpoints — the DEFAULTS only. They seed the
// first server profile on a fresh install; from then on `common/serverConfig.ts`
// owns where the client connects (saved profiles, edited in the start screen's
// server picker, with `?cs=` / `?ws=` in the URL above them). A build sets its
// own defaults with `VITE_CS_HOST`, `VITE_CS_PORT`, `VITE_WS_HOST` (scheme
// included, e.g. `wss://play.example.com`) and `VITE_WS_PORT`.
const env = import.meta.env;

export const CS_HOST = env.VITE_CS_HOST || '127.0.0.1';
export const CS_PORT = Number(env.VITE_CS_PORT) || 44405;

export const WS_HOST = env.VITE_WS_HOST || 'ws://localhost';
export const WS_PORT = Number(env.VITE_WS_PORT) || 3000;

export const DISABLE_OBJECTS_LOADING = false;
export const DEBUG_PATHFINDING = false;
export const DEBUG_SHOW_TERRAIN_ATTRIBUTES = false;
export const DEBUG_SHOW_BOUNDING_BOXES = false;

export const ENABLE_BG_MUSIC = true;
