# Streamed modules (phases 3 to 6): design

What is left of the modules plan (`src/modules/readme.md`): a server ships modules the client does
not have, and the client downloads and runs them. Phases 1 and 2 are done: every module installs
its listeners in `install`, and a world turns optional modules off in its `server.json`
(`modulesOff`). This file is the design for the rest, with the decisions it needs.

## The problem with running a server's code in the client

The client is one web origin (`play.ignies.net`). Everything that origin stores is readable by any
script running in it: the saved accounts of every world (`ServerAccounts`, plain text in
localStorage today), the cash shop and marketplace sessions, the settings. A module downloaded from
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
which OpenMU itself does not. Worlds without the plugin keep today's behaviour, but the client
stops remembering their passwords by default.

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

Nothing in phases 3 to 6 is built yet; phase 3 is next.
