# servers

Which world the client plays on: the server profiles and their addresses, the published server
list, the saved accounts per world, the "is it up" probe, the service URLs a world's domain
implies, and the signup / name rules shared with the register service. No packets here; the
connect server's own list (`Store.serverList`) is filled by `session/net.ts`.

## Public API
- `ServerConfig`: profiles (`all`, `active`, `isEmpty`, `select`, `add`, `update`, `remove`,
  `setListed`, `markPlayed`). Helpers: `effective(profile)`, `wsAddress()`,
  `connectServerAddress()`, `displayAddress`, `playableHere`, `matchesSearch`, `isInsecureWsUrl`,
  `gameServerTarget(returnedIp)`, types `ServerProfile`, `PublishedGameServer`.
- `ServerList`, `refreshServerList()`, `parseServerList(text)`: the published list.
- `ServerAccounts`: `list`, `of`, `select`, `add`, `update`, `forget`, `record(worldId, login)`.
- `ServerProbe`: `check(profiles)`, `of(id)` -> `Reach` (`unknown`, `checking`, `up`, `down`).
- `registerUrl()`, `registerApiUrl()`, `shopApiUrl()`, `marketApiUrl()`.
- `validateSignup(signup)` and the length limits (`registerRules.ts`); `isReservedName(name)`.

## How it works
- A profile is a proxy address (`wsUrl`) plus the connect server as the proxy reaches it
  (`csHost:csPort`). The browser cannot open TCP, so every socket goes through the ws proxy
  (`proxy/main.ts`), which dials `?host=&port=`.
- `gameServerTarget` decides whether to trust the game server IP from `ConnectionInfo`: a public IP
  is believed only when the connect server we reached was public too; the loser is the fallback.
- `refreshServerList` (called from `boot.tsx`) shows the cached copy first, then fetches
  `serverlist.md` and hands the worlds to `ServerConfig.setListed`.
- `ServerProbe` checks two worlds at a time, only those on screen, and reuses a verdict for 60 s.
- `registerRules.ts` and `reservedNames.ts` are engine-free: `register/server/main.ts` and
  `register/src/registerPage.tsx` import them too.

## Depends on / used by
- uses: `core/localStorage`, `app/consts`, `src/version` (`versionByTag`).
- used by: `src/app/store.ts`, `src/app/boot.tsx`, `src/app/main.tsx`, `session/net.ts`,
  `marketplace/api.ts`, `gm/admin/feed.ts`,
  `controllers/interface/pageTitle.ts`, `controllers/net/sockets/chatRoomSocket.ts`, the pages
  `versions/shared/ui/pages/preloader/`, `pages/server_select/`, `pages/login/` and
  `pages/character_select/CharMakeWin.tsx`, and `register/`.

## Change it
- add a profile field: `ServerProfile` and `sanitizeProfile` in `serverConfig.ts`.
- change the list line format: the regexes and `parseServerLine` in `serverList.ts` (add a test).
- add a world service: a function beside `shopApiUrl` in `serverServices.ts`.
- change a signup rule: `registerRules.ts`; it applies to the client form, the page and the service.

## Tests
- `serverConfig.test.ts`: `matchesSearch`.
- `serverList.test.ts`: line parsing, game server and channel names, the committed `serverlist.md`.
- `serverAccounts.test.ts`: several accounts per world, remember off, clamping, URL profile, `record`.
- `serverServices.test.ts`: register, shop and market URLs for domain and address worlds.
- `registerRules.test.ts`: `validateSignup` order and the password charset.

## Notes

### serverConfig.ts
- Three layers, highest first: the URL (`?cs=host:port`, `?ws=wss://host:port`, `?server=<name>`;
  an ephemeral profile, never saved), the saved profiles (localStorage, edited by the picker), and
  the build defaults (`VITE_CS_HOST/PORT`, `VITE_WS_HOST/PORT` via `consts.ts`).
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
  gets no services; build variables (`VITE_REGISTER_URL`, `VITE_CASHSHOP_API`, ...) are the other way.
