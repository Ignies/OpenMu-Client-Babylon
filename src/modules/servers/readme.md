# servers

Which world the client plays on: the server profiles and their addresses, the published server
list, the saved accounts per world, the "is it up" probe, the service URLs a world's domain
implies, the world's own settings (`server.json`), and the signup / name rules shared with the
register service. No packets here; the
connect server's own list (`Servers.serverList`) is filled by `session/net.ts`.

## Public API
- `Servers` (`state.ts`, through `index.ts`, the door): `serverList` (the connect server's
  `ServerListResponse`), `selectedServer` (the login window's server line),
  `updateServerListRequest()`, `getConnectionInfoRequest(id)`. `module.ts` installs nothing (core).
- `ServerConfig`: profiles (`all`, `active`, `isEmpty`, `select`, `add`, `update`, `remove`,
  `setListed`, `markPlayed`). Helpers: `effective(profile)`, `wsAddress()`,
  `connectServerAddress()`, `displayAddress`, `playableHere`, `matchesSearch`, `isInsecureWsUrl`,
  `gameServerTarget(returnedIp)`, types `ServerProfile`, `PublishedGameServer`.
- `ServerList`, `refreshServerList()`, `parseServerList(text)`: the published list.
- `ServerAccounts`: `list`, `of`, `select`, `add`, `update`, `forget`, `record(worldId, login)`.
  `MAX_USERNAME_LENGTH` / `MAX_PASSWORD_LENGTH` (`serverAccounts.ts`): the login
  fields, read by `Session.loginRequest` and the login pages.
- `ServerProbe`: `check(profiles)`, `of(id)` -> `Reach` (`unknown`, `checking`, `up`, `down`).
- `registerUrl()`, `registerApiUrl()`, `marketApiUrl()`, `serverManifestUrl()`.
- `serverSetting(key)`: one setting of the world being played (`ServerSettings`, defaults
  `ORIGINAL_SETTINGS`); `loadServerManifest(profile)`, `parseServerManifest(raw)`.
  `onWorldEntered(fn)`: runs on `markPlayed`.
- `validateSignup(signup)` and the length limits (`registerRules.ts`); `isReservedName(name)`.
- `watchPageTitle()` (`pageTitle.ts`, was `controllers/interface/`): the one writer of `document.title`,
  the world's name from the character list on; `boot.tsx` starts it.

## How it works
- A profile is a proxy address (`wsUrl`) plus the connect server as the proxy reaches it
  (`csHost:csPort`). The browser cannot open TCP, so every socket goes through the ws proxy
  (`proxy/main.ts`), which dials `?host=&port=`.
- `gameServerTarget` decides whether to trust the game server IP from `ConnectionInfo`: a public IP
  is believed only when the connect server we reached was public too; the loser is the fallback.
- `refreshServerList` (called from `boot.tsx`) shows the cached copy first, then fetches
  `serverlist.md` and hands the worlds to `ServerConfig.setListed`.
- Entering a world (`markPlayed`) fetches its `server.json` (`serverManifest.ts`); `serverSetting`
  reads the answer. The two `heldHitRequest` sites are `ecs/systems/attackSystem.ts` and
  `combat/net.ts`.
- `ServerProbe` checks two worlds at a time, only those on screen, and reuses a verdict for 60 s.
- `registerRules.ts` and `reservedNames.ts` are engine-free: `register/server/main.ts` and
  `register/src/registerPage.tsx` import them too.

## Depends on / used by
- uses: `core/localStorage`, `src/version` (`versionByTag`).
- used by: `session` (`state.ts`, `net.ts`), `src/app/boot.tsx`, `src/app/main.tsx`,
  `marketplace/api.ts`, `gm/admin/feed.ts`,
  `pageTitle.ts`, `chat/chatRooms.ts` (the chat socket's address), the pages
  `versions/shared/ui/pages/preloader/`, `pages/server_select/`, `pages/login/` and
  `pages/character_select/CharMakeWin.tsx`, and `register/`.

## Change it
- add a profile field: `ServerProfile` and `sanitizeProfile` in `serverConfig.ts`.
- change the list line format: the regexes and `parseServerLine` in `serverList.ts` (add a test).
- add a world service: a function beside `marketApiUrl` in `serverServices.ts`.
- add a server setting: a key in `ServerSettings`, `ORIGINAL_SETTINGS` and `SETTING_TYPES`
  (`serverManifest.ts`), a test, and the installer's side (`install/cli/render/manifest.ts`).
- change a signup rule: `registerRules.ts`; it applies to the client form, the page and the service.

## Tests
- `serverConfig.test.ts`: `matchesSearch`.
- `serverList.test.ts`: line parsing, game server and channel names, the committed `serverlist.md`.
- `serverAccounts.test.ts`: several accounts per world, remember off, clamping, URL profile, `record`.
- `serverServices.test.ts`: register, shop and market URLs for domain and address worlds.
- `serverManifest.test.ts`: parsing (valid, unknown keys, wrong version, wrong types), the URL, the
  fallback on missing / unreachable / invalid, the per-server cache, the fetch on enter.
- `registerRules.test.ts`: `validateSignup` order and the password charset.

## Notes

### serverConfig.ts
- Three layers, highest first: the URL (`?cs=host:port`, `?ws=wss://host:port`, `?server=<name>`;
  an ephemeral profile, never saved), the saved profiles (localStorage, edited by the picker), and
  the build defaults (`VITE_CS_HOST/PORT`, `VITE_WS_HOST/PORT` via `defaults.ts`).
- `wsUrl` is the proxy's own address; `csHost:csPort` is the connect server as seen from the
  proxy's network. They need not be the same machine.

### serverList.ts
- One world per line: `[VERSION:NAME:DESCRIPTION:LANGUAGE:IMAGE](host:port@WSPROXY)`. Version,
  banner and proxy are optional; the old three-field form still parses. The version is the
  `gameVersion.listTag` of a `versions/<id>` folder (`S6EP3`); a world asking for another is shown
  as not playable here.
- The target is `host:port` (the connect server as the world's proxy reaches it) or the world's
  domain alone, which uses the convention in `serverServices.ts`.
- Directly under its line a world may name its game servers (`- 0: Valhalla`, id = `ServerId >> 8`)
  and indented channels (`  - 1: Hard`, the low byte). The first line that is not a name ends the
  block, so examples in the prose never attach to a world.
- Fetched from `raw.githubusercontent.com` (a `blob/` URL has no CORS header), once per launch,
  and cached for the next one. The text is untrusted: every field goes through the same
  normalisers as a typed one, and a line that does not parse is dropped, not repaired.

### serverAccounts.ts
- Keyed by profile id, since an account on one world means nothing on another. Several per world
  (a main and a mule is the normal case).
- Stores what the original stored: name, password, remember. Plain text in localStorage, and the
  accounts tab says so. Remember off stores neither field. The URL profile is never saved.

### serverProbe.ts
- It dials the proxy exactly like `createSocket`, sends nothing, and drops the socket.
- The proxy upgrades the websocket before it dials TCP, so an open socket only proves the proxy is
  alive; it closes the socket when the dial fails, so a close means down.
- The proxy greets every client with its own weather frame (`C1 04 0F xx`, `proxy/weather.ts`),
  so that first message proves nothing. Any other packet is the connect server: up.

### serverServices.ts
- A world is one domain with fixed labels: `play.` (the client), `ws.` (the proxy), `register.`
  (signup page and `/api/register`), `api.` (cash shop `/api`, marketplace `/api/market`).
- That lets one published build play any world. A world played from its own site keeps relative
  shop and market paths. A world that does not follow the convention publishes full addresses and
  gets no services; build variables (`VITE_REGISTER_URL`, `VITE_MARKETPLACE_API`, ...) are the other way.

### serverManifest.ts
- `server.json`, served by the world's stack (the installer writes it, `install/readme.md`):
  `{ "version": 1, "settings": { "heldHitRequest": false } }`. Later it will also list the
  world's modules.
- Fetched from the root of the world's proxy host (`https://ws.<domain>/server.json`, or
  `http://<ip>:3000/server.json`), the one address every profile has (Caddy answers it on an
  installed server; the proxy itself answers it from `MU_HELD_HIT_REQUEST` when it runs alone,
  `proxy/serverManifest.ts`), with a 5 s timeout and no
  cookies. The text is untrusted: version 1 only, `settings` an object, each known key of its type
  or the whole document is refused; unknown keys are skipped (a newer server may know more).
- Missing, unreachable or invalid: the original behaviour (`ORIGINAL_SETTINGS`). The last good
  copy is cached in localStorage per manifest URL and applies until the fetch answers; a failed
  fetch drops it.
- Settings are the server's because they change what the server sees. `heldHitRequest` holds the
  plain attack's HitRequest until the swing's hit key: the original sends it on the click
  (ZzzInterface.cpp:3355), and the uneven intervals a held request makes can brush OpenMU's
  attack-speed check, so only a server that allows it turns it on.
