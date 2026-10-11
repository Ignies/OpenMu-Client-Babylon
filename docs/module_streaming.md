# Streamed modules (phases 3 to 6): design

What is left of the modules plan (`src/modules/readme.md`): a server ships modules the client does
not have, and the client downloads and runs them. Phases 1 and 2 are done: every module installs
its listeners in `install`, and a world turns optional modules off in its `server.json`
(`modulesOff`). This file is the design for the rest, with the decisions it needs.

## The problem with running a server's code in the client

The client is one web origin (`play.ignies.net`). Everything that origin stores is readable by any
script running in it: the saved accounts of every world (`ServerAccounts`: names and, since phase 6,
login tokens; passwords in plain text before), the cash shop and marketplace sessions, the settings. A module downloaded from
server B and loaded into that origin can read all of it, send packets as the player, and stay
loaded until the page reloads. Consent, hash pinning and "only while connected" do not change
that: once a script runs in the origin, nothing can unload it or keep it out of storage.

So a module from a server that is not the client's own publisher cannot run in the client's origin.

## Proposal

**Two kinds of module, by who signed it.**

- **First party** (signed with the key whose public half is built into the client): loads in the
  page like a built-in module (`defineModule`, its own `install`), with the full module API.
- **Third party** (any other server): runs in a sandboxed iframe, an opaque origin with no access to
  the page's storage, and talks to the client only through a versioned message API. It can draw its
  own window (the iframe is the window), react to its own packets, send its own packets, and ask the
  client to play sounds and effects by name. It cannot read the bag, the accounts or other
  modules' state unless the API hands it a read-only view. The player is asked once per module and
  version (the consent covers what it can do, which is now small), and it is unloaded (iframe
  removed) when the player leaves that server.

**Phase 3: the module API.** One versioned surface (semver, `MODULE_API_VERSION`), described once
and served two ways: in process for first-party modules (an object the app hands to `install`), and
as messages for third-party ones (the same calls, serialized). It starts small and grows only when a
module needs more: register a window, register text (`registerText`), listen to and send the
module's own packets, play a sound or effect by id, read the hero's public state, get told about
map changes. A module declares the API range it needs; the client refuses one it cannot serve.

**Phase 4: the packet range.** Module packets travel inside one extension packet: a reserved code,
then the module id and its payload, so OpenMU's own protocol never changes and the client routes a
payload to its module by id. The OpenMU side is a plugin (`openmu/plugins/`) that owns the same
range. The installer turns both halves on and off together. The code has to be one OpenMU and the
band relay do not use (the band uses `0xFA`).

**Phase 6 (before 5): no passwords in browser storage.** Saved logins become per-world tokens.
After a password login the server issues a token (random, stored hashed by the server, revocable,
bound to one account on one world), the client keeps the token instead of the password, and the next
login sends the token. The issuer is an OpenMU plugin, so tokens are checked where the account
lives; a proxy that stored passwords to replay them would keep reversible passwords on the server,
which OpenMU itself does not. Worlds without the plugin keep the name only: the client stores no
password for any world.

**Phase 5: streaming.** `server.json` gains `modules`: `[{ id, version, api, url, sha256,
signature? }]`. On entering a world the client compares it with what it has, asks consent for
anything third party and new, downloads into Cache Storage keyed by hash, checks the hash (and the
signature for first party), then loads it (in process or in its iframe). A module whose hash or API
range does not match is skipped with a notice, never run.

## Decisions (2026-10-05)

1. Third-party modules run in a sandboxed iframe with the message API, not in the page.
2. Saved logins become per-world tokens issued by an OpenMU plugin, not by the proxy.
3. First-party modules are signed with the owner's own ed25519 key, kept offline outside the repo
   (never in CI); only its public half is built into the client. Needed from phase 5 on.
4. The order is 3, 4, 6, then 5.

Phases 3 to 6 are built (below).

## Phase 3: built (2026-10-06)

All in [src/modules/_api/](../src/modules/_api/readme.md), a folder that is not a module:

- `contract.ts`: `MODULE_API_VERSION` (`1.0.0`), `canServe(range)` and the v1 calls (`ModuleApi`):
  `registerText`, `registerWindow`, `playSound`, `playEffect` (an fx burst by name), `hero()` (a
  read-only snapshot) and `onMapChange`. It imports nothing, so a streamed module can import it alone.
- The range check: `ModuleDef.api` (`src/modules/module.ts`). `installModules` refuses a module whose
  range this client cannot serve, and every module that requires it, and lists them in
  `refusedModules()`.
- In process: `host.ts` builds one API per module id over the game (`ports.ts`: hero, warp's
  `onMapChanged`, i18n, sound, fx, the window registry and `ModuleWindowFrame` in
  `controllers/interface`) and `dispose(id)` takes back its windows and listeners. A module's text
  keys and titles must start with its id, and its windows show as `<module>:<id>`, so it cannot
  overwrite the client's own. `src/app/logic.ts` hands the host to `installModules`; built-in
  modules ignore it.
- As messages: `protocol.ts` (the JSON wire, versioned by `v`), `dispatcher.ts` (`serveModule`: the
  client's end refuses anything invalid before the game sees it) and `guest.ts` (`connectModule`:
  the module's end, the same calls answering with promises).
- `sandbox.ts`: the iframe's attributes (`sandbox="allow-scripts"` only, a `srcdoc` or `blob:`
  source) and the port hand-over. Mounting it in the world page is phase 5.
- `example.test.ts`: a module that uses nothing but the API runs in process and over messages and
  makes the same calls.

Left for phase 5, when third-party code first runs (decided 2026-10-06): caps on a sandboxed module's
windows, listeners and calls and a rate limit (today only the 64K message cap); a timeout on the
guest's pending calls; refusing a streamed module that claims `core` (all done in phase 5, below).
`playEffect` and `playSound` stay narrow until a module needs more.

## Phase 4: the extension code

The module packet is `0xE8`, the same code in both directions. Checked on 2026-10-06:

- OpenMU master, `src/Network/Packets/ClientToServer/ClientToServerPackets.xml`: the codes from 0xE0
  up are E1, E2, E5, E6, E9, EB, F1, F2, F3, F5, F6, F7, F8. `ServerToClient/ServerToClientPackets.xml`:
  E5, E6, E9, EB, F1, F3, F5, F6, F7, F8, F9. No E8 in either (free in both from 0xE0 up: E0, E3, E4,
  E7, E8, EA, EC to F0, F4, FA to FF).
- The original client (`references/MuMain-main`, `WSclient.cpp` `ProcessPacket`) handles no 0xE8 and
  sends none, so OpenMU has no reason to take it later.
- Ours: 0xE7 is the marketplace (`escrowWire.ts`, `openmu/plugins/`), 0xFA the band and 0xFB the map
  ping (both answered by the proxy, never by OpenMU), C1 B1 00 the hand-written map-server move.
  Nothing in `src/`, `versions/`, `proxy/` or `openmu/` uses 0xE8.
- It sits next to the marketplace's 0xE7, the other code our OpenMU plugin owns.

## Phase 4: built (2026-10-06)

The client half, in [src/modules/_api/](../src/modules/_api/readme.md) ("Packets"):

- `packetWire.ts`: the frame, `C1 len E8 idLength id payload` (C2 when the frame does not fit 255
  bytes), the id being the module API's own (`MODULE_ID` in `contract.ts`). Encoding throws on a bad
  id or a frame over 65535 bytes; decoding never throws and answers why.
- The module API is `1.1.0`: `onPacket(fn)` (this module's payloads only; returns the unsubscribe)
  and `sendPacket(payload)` (refused over the frame limit), in process and over messages (the payload
  as base64, checked by `readCall`; about 48 K fits the 64 K message cap). `dispose` drops the
  module's packet listeners. A module asking for `^1.0` or `^1.1` is served, `~1.0` no longer is.
- `router.ts` and `ports.ts`: the hand-written `ModulePacket` (`versions/season6/packets/`, in both
  versions' sets) makes the socket emit every E8 frame; `installModuleRouter()`, called by
  `src/app/logic.ts` right after `installModules`, is its one listener and hands each frame to the
  module it names. A frame nobody listens to, or one it cannot read, is dropped and counted
  (`moduleRouter.dropped`). Outgoing frames go through `Session.sendToGS`. The listener dump shows
  this one listener added and nothing else changed (`listenerOrder.golden.test.ts` hash updated).

The server half, in [openmu/plugins/](../openmu/readme.md): `ModulePacketHandlerPlugIn` (0xE8) reads
the id and hands the payload to the `IModulePacketPlugIn` registered for it (a plugin point keyed by
the module id, found with `PlugInManager.GetStrategy` like chat commands), or drops the frame and logs
the id once; `ModulePacketViewPlugIn` (`IModulePacketViewPlugIn`) sends a module's frame to one
player. No module plugin ships, so every frame is dropped for now.

The installer needs no switch: the plugin DLL is in every OpenMU image it builds (`openmu/Dockerfile`)
and the router in every client it builds, so both halves are always on together, and with no module
plugin they do nothing. A client sends E8 only for a loaded module that calls `sendPacket`, and from
phase 5 a world's modules are the ones its `server.json` lists, so a world without our plugin (which
lists none) never gets one.

Built and checked on 2026-10-11 (Docker Desktop, munique/openmu:0.9.10, the installer's e2e stack on this machine):
`docker build -t mu-openmu:local openmu` compiles every plugin (no errors; 20 MSB3277 warnings, version conflicts
between OpenMU's own assemblies); all five plugin types are active in `config."PlugInConfiguration"`; the probe
frame below, sent twice from a GM character in Lorencia, logged "Module packet for "probe" dropped" once and the
player stayed connected; an escrow request with a junk token got `C1 2F E7 02 01 01` (status 1, bad token) and
the player stayed connected. The checklist as it was written:

- `mu update` (or `docker build -t mu-openmu:local openmu`): the four new files compile against the
  image's assemblies. They use only public OpenMU types: `IPacketHandlerPlugIn`,
  `IStrategyPlugIn<string>`, `PlugInPointAttribute`, `PlugInManager.GetStrategy`, `IViewPlugIn`,
  `RemotePlayer`, `IConnection` and `ConnectionExtensions.SendAsync`, all checked against the v0.9.10
  sources.
- The admin panel lists "Module Packet Handler" (packet handlers) and "Module Packet" (view plugins)
  as active, and the startup log has no plugin registration error for them.
- With a client in the world (dev build), a frame for a module nobody registered, sent from the
  console: `__modules.Session.sendToGS(new DataView(Uint8Array.of(0xC1, 10, 0xE8, 5, 112, 114, 111,
  98, 101, 1).buffer))` (`C1 0A E8 05 "probe" 01`). OpenMU logs "Module packet for probe dropped"
  once, not again for the same frame sent twice, and the player stays connected.
- When the first module ships: its `[PlugIn]` class implementing `IModulePacketPlugIn` (with its own
  `[Guid]`) receives the payload, and its answer through `IModulePacketViewPlugIn` reaches the
  module's `onPacket` in the client (and `moduleRouter.dropped` stays 0).

Since 2026-10-11 the handler drops every module frame until the player's character is in the world
(the login, the character list, a disconnect): a module belongs to a character in the world. The
states inside the world (a trade, an NPC dialog, dead) still count as in it. The installer's e2e
check proves both sides: a frame sent at the character list is never read, one sent in the world is.

## Phase 6: built (2026-10-11)

Saved logins are per-world tokens; no password is written to browser storage any more.

The wire, in our packet group 0xE7 (01 and 02 are the marketplace escrow; definitions in
`versions/shared/packets/packetsDefinitions/*.xml`, generated like OpenMU's own):

| packet | header | layout | when |
|---|---|---|---|
| 03 `LoginTokenRequest` | C1 | `C1 04 E7 03` | client, at the character list after a password login, where tokens are kept |
| 04 `LoginTokenAnswer` | C1 | `C1 25 E7 04 status(1) token(32)` | server: after 03, and right behind the login result of a token login (the replacement) |
| 05 `TokenLogin` | C3 | `C3 33 E7 05 account(10, Xor3) token(32) clientVersion(5)` | client, at the login window, instead of F1 01 |

Status 0 is Ok, 1 Refused (not logged in, a template account, or a token already issued on this
connection), 2 Failed (not stored). 05 is a C3 like the login: OpenMU decrypts SimpleModulus before
any handler, and a handler that expects encryption drops a C1 copy (`PacketHandlerPlugInContainer`),
so a token is wrapped exactly as a password is (Xor32 and SimpleModulus, then the proxy's wss in
domain mode). The account name sits where the login has it, so the proxy's presence (the cash
shop's ticket) names a token login's socket the same way. A token login answers with the normal
login result (F1 01), so nothing after it changes.

The server half (`openmu/plugins/GameLogic/LoginTokens`, [openmu/readme.md](../openmu/readme.md)):

- A token is 32 random bytes. The table `mu_plugins.login_token` in OpenMU's database keeps its
  SHA-256, the account id, the issue time and a SHA-256 of the account's password hash at issue, so a
  password change voids every token of the account. Created at start when missing (the "Login Token
  Upkeep" periodic task, which also drops expired tokens hourly); OpenMU's database dump, and so
  `mu backup`, carries it. A token works 30 days; an account keeps at most 10 (one per browser).
- The token login follows OpenMU's `LoginAction` (v0.9.10): the token in place of the password
  (refused as a wrong password), the ban states, the state machine, an offline session's handover,
  the login server and its "already connected" answers, then the login result and the client
  version. The one difference: `LoginAction` holds the state machine's lock across the login
  server call through a context whose `Allowed` only OpenMU can set; the plugin checks the
  transition first and makes it last, and undoes the login server's entry if the transition then
  fails. Each token login replaces the token (the old one stops working at once).

The client half: `src/modules/servers/serverAccounts.ts` stores the name and, on a world whose
`server.json` says `loginTokens: true` (the installer writes it, the plugin being in every image it
builds), the token, under the improvement `loginTokens` (Enhanced and Ultra; Classic types the
password each time, as the original). Passwords an older client saved (`mu_accounts`, the legacy
`_mu_key` blob) are wiped on load, names kept. `Session` (`src/modules/session/state.ts`) sends
05 when the password field is empty and a token is saved, asks for one (03) after a password login,
keeps each 04, and drops a refused token, the login window then asking for the password with the
name filled; a token login with no answer in 10 s is given up the same way (a `server.json` that
offers tokens without the plugin behind it). The password stays in memory only, for the session's own reconnects; a session that
logged in with a token reconnects with the token it holds.

Live proof: the installer's e2e `check` (`install/cli/loginCheck.ts`) plays the protocol with the
client's own code: password login as the test GM, token request, reconnect, token login reaching the
character list with the token replaced, the proxy naming that socket, the replaced token and a junk
one refused, the new token logging in. A password change (the same password hashed again) was
checked by hand to void the account's tokens.


## Phase 5: built (2026-10-11)

A world's `server.json` lists the modules it streams; the client downloads, checks and loads them while
the player is on that world. Streaming is new behaviour, not a correction, and it is on whenever a world
lists modules: a world that lists none (every world until its owner adds one) sees nothing new, so
Classic is unchanged. Details and the code: [src/modules/_api/](../src/modules/_api/readme.md)
("Streaming", "Limits").

- The list: `modules: [{ id, version, api, url, sha256, signature? }]` (`servers/serverManifest.ts`, at
  most 32). A malformed entry, a repeated id or one claiming `core` is dropped with a notice, never
  the whole file. The installer writes it from its modules folder (`<state>/modules/<name>.js` with a
  `<name>.json` description, [install/readme.md](../install/readme.md)) and Caddy serves the files at
  `/server-modules/` next to `server.json`.
- Before loading (`download.ts`): the API range (`canServe`; never downloaded when it fails), Cache
  Storage by hash (memory on a plain-http page), a download of at most 4 MB in 30 s, the hash. Any
  failure skips the module with a notice (`moduleStream.*`, every language).
- First party (`signature.ts`): `signature` is the owner's ed25519 signature over the text
  `id|version|sha256`, checked with WebCrypto against `VITE_MODULE_SIGNING_KEY` (the raw 32-byte
  public key in base64url) built into the client. Why the text and not the bytes: the hash is checked
  against the bytes first, so the signature covers the file anyway, and signing the text also binds the
  id and the version (a server cannot relabel a signed module or pass an old version off as new). No
  key built in: no module is first party.
- Loading (`streamer.ts`, `streamPorts.ts`), once the hero is in the world: first party in the page
  (the checked bytes through a `blob:` URL, `install(api, 'page')`); everything else, unsigned or badly
  signed, in a `sandbox="allow-scripts"` iframe (`sandboxPage`) after the player's consent, asked once
  per world per module version (a message box; both answers remembered in localStorage,
  `mu_module_consent`). A module claiming `core` or a built-in module's id is refused. Going back to the
  server choice unloads everything (frames removed, windows and listeners gone).
- The limits phase 3 left (`dispatcher.ts` `SANDBOX_LIMITS`, `guest.ts`), for third-party modules only:
  1 window (its frame is its one surface), 4000 text lines of at most 1000 characters, 100 calls a
  second with 200 at once, 30 packets a second with 60 at once, one map and one packet subscription;
  a guest call with no answer fails after 10 s.
- The example (`tools/modules/example/`): a window with a line of text that sends "hello" through 0xE8
  and plays a click (and, in its frame, shows the echo) when the answer comes back, which needs a module
  plugin answering "example" on the server (none ships). `bun tools/modules/example/build.ts <out.js>`
  builds it to one file; its test streams that file both ways: signed in process, unsigned in a faked
  frame under a fake consent, the same calls.

### Signing

The owner's key pair is made offline, once; the private key never enters the repository, CI or a
server. `tools/modules/sign.ts` refuses a key path inside the repository.

1. `bun tools/modules/sign.ts keygen <path outside the repo>/mu-modules.pem` writes the private key
   (PKCS#8 PEM, mode 600) and prints `VITE_MODULE_SIGNING_KEY=...`, the public key. (`openssl genpkey
   -algorithm ed25519 -out mu-modules.pem` makes the same kind of key; `sign.ts pubkey <key>` prints its
   public half.) Keep the PEM offline, with a backup.
2. Build the client with that public key: `VITE_MODULE_SIGNING_KEY=<public key>` in the build's
   environment. It is public; without it, every module runs as third party. A server the installer
   runs takes it as `MU_MODULE_SIGNING_KEY` (`mu config` > Features), which it passes to the web
   image's build ([install/readme.md](../install/readme.md)).
3. For each module release: build it to one file, then `bun tools/modules/sign.ts sign <key.pem>
   <module.js> --id <id> --version <x.y.z> --api <range>`, which writes `<module>.json` (id, version,
   api, signature) beside it. Copy both files into a server's modules folder and save the config
   (`mu config`); the installer hashes the file into `server.json`.
4. A new version is a new signature (the version is signed); a changed file under the same version
   fails its hash or signature check.

### What needs a browser look

Node runs the logic, not a real iframe or Cache Storage: the first live run should check that the
sandboxed frame loads its `srcdoc` page and imports the module from its `data:` URL (an opaque origin),
that the frame sits over its window's content area and follows a window resize (item windows do not
move; one that does would leave the frame behind), that a first-party module imports from its `blob:`
URL in the production build, that Cache Storage keeps a module across reloads on https, that the
consent box shows in the world and both answers stick, and that leaving for the server choice removes
the frame.
