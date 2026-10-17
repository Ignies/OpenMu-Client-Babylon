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
- `ServerAccounts`: `list`, `of`, `select`, `add`, `update`, `forget`, `record(worldId, login)`,
  `tokenOf(worldId, name)`, `saveToken(worldId, name, token)`; `tokenToText` / `tokenFromText`.
  `MAX_USERNAME_LENGTH` / `MAX_PASSWORD_LENGTH` (`serverAccounts.ts`): the login
  fields, read by `Session.loginRequest` and the login pages.
- `ServerProbe`: `check(profiles)`, `of(id)` -> `Reach` (`unknown`, `checking`, `up`, `down`).
- `registerUrl()`, `registerApiUrl()`, `marketApiUrl()`, `serverManifestUrl()`.
- `serverSetting(key)`: one setting of the world being played (`ServerSettings`, defaults
  `ORIGINAL_SETTINGS`); `serverOffersLoginTokens()`; `loadServerManifest(profile)`, `parseServerManifest(raw)`.
  `onWorldEntered(fn)`: runs on `markPlayed`. `onModulesListed(fn)`: each world's streamed module list as
  its fetch answers (`_api/streamPorts.ts`); type `StreamedModuleEntry`.
- `DirectLogin` (`directLogin.ts`): `checked`, `on`, `auto` (`?direct`, `directRequested(search)`); `checkDirectLogin()` (`boot.tsx`), `readDirectLogin()`,
  `directChannel(list, published)`. `ServerConfig.pin(world)` / `pinned`: the one world it opens on.
- `validateSignup(signup)` and the length limits (`registerRules.ts`); `isReservedName(name)`.
- `liteAssetsAllowed()`, `liteAssetsReady()` (`liteAssets.ts`): the lighter-assets gate.
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
- At boot `checkDirectLogin` reads the `server.json` served beside the client; with `directLogin: true`
  the first world of the `serverlist.md` beside it becomes the only one and the client opens on its
  login (Notes, directLogin.ts).
- `ServerProbe` checks two worlds at a time, only those on screen, and reuses a verdict for 60 s.
- `registerRules.ts` and `reservedNames.ts` are engine-free: `register/server/main.ts` and
  `register/src/registerPage.tsx` import them too.

## Depends on / used by
- uses: `core/localStorage`, `src/version` (`versionByTag`).
- used by: `session` (`state.ts`, `net.ts`), `src/app/boot.tsx`, `src/app/main.tsx`,
  `marketplace/api.ts`, `gm/admin/feed.ts`,
  `pageTitle.ts`, `chat/chatRooms.ts` (the chat socket's address), the pages
  `versions/shared/ui/pages/preloader/`, `pages/server_select/`, `pages/login/` and
  `pages/character_select/CharMakeWin.tsx`, and `register/`; `serverSetting` also by
  `inventory/autoMana.ts`, `ecs/systems/attackSystem.ts` and the Options window's `options/gating.ts`.

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
- `serverAccounts.test.ts`: several accounts per world, remember off (no token), clamping, URL profile,
  `record` (keeps the token), tokens (text round trip, per name, dropped on a rename), and the
  passwords an older client saved wiped on load (`mu_accounts` and the legacy blob), names kept.
- `serverServices.test.ts`: register, shop and market URLs for domain and address worlds.
- `serverManifest.test.ts`: parsing (valid, unknown keys, wrong version, wrong types, `loginTokens`,
  `modules` and each way an entry is dropped),
  the URL, the fallback on missing / unreachable / invalid, tokens offered only where the world says
  so, the per-server cache, the fetch on enter.
- `registerRules.test.ts`: `validateSignup` order and the password charset.
- `directLogin.test.ts`: the boot check (no file, off, malformed, on, on without a world), the channel
  it takes and its names, the world pinned; `?direct` read on and off. `session/directLogin.test.ts`: the Servers page never
  entered, the channel asked for, Cancel / logout / a lost connection back on the login.

## Notes

### serverConfig.ts
- Three layers, highest first: the URL (`?cs=host:port`, `?ws=wss://host:port`, `?server=<name>`;
  an ephemeral profile, never saved), the saved profiles (localStorage, edited by the picker), and
  the build defaults (`VITE_CS_HOST/PORT`, `VITE_WS_HOST/PORT` via `defaults.ts`).
- `wsUrl` is the proxy's own address; `csHost:csPort` is the connect server as seen from the
  proxy's network. They need not be the same machine.

### serverList.ts
- One world per line: `[ID:VERSION:NAME:DESCRIPTION:LANGUAGE:IMAGE](host:port@WSPROXY)`. Id,
  version, banner and proxy are optional; the old three-field form still parses.
- The id (digits only) keys the world as `list:<id>`; without one the key is `list:<domain>` or
  `list:<host>:<port>`. When a world first publishes an id, `setListed` moves the selection, the
  last played world and its saved accounts (`onWorldRekeyed`) from the old key to the new one. The version is the
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
- Stores the name and "remember", as the original keeps the name; never a password (phase 6 of
  [docs/module_streaming.md](../../../docs/module_streaming.md)). On a world that issues login tokens
  (`server.json` `loginTokens`, our OpenMU plugin) a remembered account also keeps its token, base64;
  the session decides when (improvement `loginTokens`). Remember off keeps no token. A renamed row
  drops its token. The URL profile is never saved.
- Wiped on every load: a `password` an older client saved in `mu_accounts` (the book is written
  again without it) and the legacy `_mu_key` blob's credential keys; the names stay.

### directLogin.ts
- The installer's switch (`MU_DIRECT_LOGIN`, `install/readme.md`) for a server owner who serves the
  client for their own world only. It rides in `server.json` (`directLogin`), already served with no
  cache on the client's own site and already parsed strictly here, so no new file or route; the
  world comes from the `serverlist.md` served beside it, the installer's own entry. Both are read
  relative to the page at boot, so a client built once still plays any world: a site without the
  files, a 404 page, a wrong type or the flag off all mean the worlds list as before. The proxy-host
  copy read on entering a world never turns it on.
- On: `ServerConfig.pin` makes that world the only one and the selected one (over `?cs=` / `?server=`,
  never saved), so saved accounts, login tokens and the page title key on its usual `list:` id.
  The preloader's Start goes straight in (still the press browsers want before sound plays);
  `Session.playOnline` opens the login instead of the server list, holds the form until the game
  server greets, and on every connect takes the first channel of the first game server
  (`directChannel`, what the picker shows first). Cancel, logout, Select Server and a lost
  connection all pass through `playOnline`, so they come back to the login. Exit Game still shows
  the preloader.
- `?direct` in the URL (`directRequested`, `DirectLogin.auto`) is another switch: it pins no world and only swaps
  the preloader page for `DirectLoadPage` (pages/readme.md), where lighter assets are on. `?direct=0` is off.

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
  `{ "version": 1, "settings": { "heldHitRequest": false }, "modulesOff": [] }`.
- `modulesOff` names the optional client modules the world turns off (ids from
  `src/modules/modules.ts`): `moduleOn` answers false for them and their windows hide
  (`../readme.md`).
- `modules` lists the modules the world streams (phase 5 of
  [docs/module_streaming.md](../../../docs/module_streaming.md)): `[{ id, version, api, url, sha256,
  signature? }]`, at most 32. `id` a module id (`_api/contract.ts` `MODULE_ID`), `version` a plain
  `1.2.3`, `api` the range it needs (checked when it loads), `url` http or https, absolute or relative
  to the manifest, `sha256` lowercase hex, `signature` 64 bytes in base64url. A malformed entry, a
  repeated id, one claiming `core` or one past 32 is left out and named in `modulesDropped` (the
  streamer shows a notice), never run; the rest of the document still applies. Missing means none.
- `loginTokens: true` says the world issues login tokens (our OpenMU plugin, `openmu/readme.md`);
  missing means it does not, and the client then never sends a token request or a token login
  (`serverOffersLoginTokens`). The installer always writes it (the plugin is in every image it
  builds); the proxy's own answer (`proxy/serverManifest.ts`, a proxy run alone) leaves it out.
- Fetched from the root of the world's proxy host (`https://ws.<domain>/server.json`, or
  `http://<ip>:3000/server.json`), the one address every profile has (Caddy answers it on an
  installed server; the proxy itself answers it from `MU_HELD_HIT_REQUEST`, `MU_MODULES_OFF` and
  `BAND` when it runs alone, `proxy/serverManifest.ts`), with a 5 s timeout and no
  cookies. The text is untrusted: version 1 only, `settings` an object, each known key of its type,
  `modulesOff` a list of at most 64 lowercase ids, or the whole document is refused; unknown keys
  are skipped (a newer server may know more).
- Missing, unreachable or invalid: the original behaviour (`ORIGINAL_SETTINGS`). The last good
  copy is cached in localStorage per manifest URL and applies until the fetch answers; a failed
  fetch drops it.
- Settings are the server's because they change what the server sees. `heldHitRequest` holds the
  plain attack's HitRequest until the swing's hit key: the original sends it on the click
  (ZzzInterface.cpp:3355), and the uneven intervals a held request makes can brush OpenMU's
  attack-speed check, so only a server that allows it turns it on.
- `retryLoginWhenConnected`: on "account already connected" the client sends the same login again,
  3 times 2.5 s apart (`session/net.ts`, `Session.retryLogin`); the original only shows the refusal.
  It helps only where the server drops the old session on that refusal, so the server decides.
- `muHelperAfterReconnect`: after the automatic reconnect (`session/sessionResume.ts`) the client
  asks for the MU Helper again when it was running at the drop (`mu_helper/resume.ts`). Keeping an
  AFK helper going is botting policy, so the server decides; off, it stays off.
- `autoManaPotion`: lets the player's `autoManaPotion` option drink a mana potion by itself when
  the mana runs low (`inventory/autoMana.ts`); the original never drinks by itself. Off (the
  original), the option is greyed and does nothing.
- `autoQuiver`: lets the player's `autoQuiver` option put the next quiver in as soon as the server
  takes the empty one (`ecs/systems/attackSystem.ts`). The original reloads only when a shot or
  bow skill finds the hand empty (`CheckArrow`, ZzzInterface.cpp:1206), which stays on every server.
- `restAnyWall`: lets the player's `restAnyWall` improvement lean the hero on any straight wall
  (`ecs/systems/restObjectSystem.ts`). OpenMU marks a leaning player as resting, which regenerates
  faster, so leaning anywhere is the server's call. Off (the original), the option row shows the
  refusal and only the map's pose boxes lean.
- `jewelryUpgrade`: lets the player's `jewelryUpgrade` improvement drop Bless, Soul and Life on the
  common rings and pendants (`inventory/jewelryUpgrade.ts`). Stock OpenMU refuses those upgrades, so
  only a world whose server supports them turns it on. Off (the original), the client refuses them.
- `jewelBundling`: lets the player's `jewelBundling` improvement bundle and unbundle jewels with a
  right click in the bag (`chaos_mix/jewelMix.ts`), sending Lahap's `LahapJewelMixRequest` with no NPC
  open. Stock OpenMU packs only at Lahap, so only a world whose server supports it turns it on.
- `liteAssets`: the client served beside this file was built with the lighter copies
  (`tools/liteAssets.ts`: WebP textures and icons, Opus music), so the player's `liteAssets`
  improvement may read them (`controllers/assets/liteAssets.ts`). Only the server knows what its
  build wrote, so it decides. Off (the original), every read takes the original file.
  `liteAssets.ts` (`liteAssetsAllowed`; `liteAssetsReady`, the same once the file answered, for the
  first-run download; `liteAssets.test.ts`) is that check; `module.ts` installs it
  as the assets gate.
