# install

The server installer and manager (`mu`). Player-facing steps are in the root
[README](../README.md#installing-your-own-server); this file is for whoever changes the installer
or runs a server and wants to know what it did.

## One line

```bash
curl -fsSL https://raw.githubusercontent.com/Ignies/OpenMu-Client-Babylon/main/install/get.sh | sudo bash
```

```powershell
irm https://raw.githubusercontent.com/Ignies/OpenMu-Client-Babylon/main/install/get.ps1 | iex
```

`get.*` installs git, clones the repo (`/opt/mu-server`, `C:\mu-server`) and runs `install.*`, which
installs Docker and Bun 1.4.2 when missing and starts `cli/main.ts`. `MU_BRANCH`, `MU_DIR` and
`MU_REPO_URL` override the defaults (to try a branch: `MU_BRANCH=clean_slate`).

## What runs

One Compose project, `mu`: OpenMU's own `deploy/all-in-one/docker-compose.yml` (OpenMU's repo,
checked out at the release tag) with `stack/compose.yml` layered over it.

| service | from | notes |
|---|---|---|
| database | OpenMU's compose, `postgres:18` | our password; not published |
| openmu-startup | `munique/openmu:<release>` + `../openmu` (our plugins) | not published; advertises loopback |
| proxy | `stack/services.Dockerfile` | shares OpenMU's network namespace; band, ping, weather, presence, tracker |
| register, cashshop, marketplace, ops | same image, other command | |
| web | `stack/web.Dockerfile` (client + register site) on Caddy | the only published ports |
| mailserver, webmail | `mailserver/docker-mailserver:16.0.1`, `roundcube/roundcubemail:1.7.4-apache` | optional, profile `mail` ([Mail server](#mail-server)) |

OpenMU's nginx is switched off (profile `openmu-nginx`); Caddy serves the client, routes to every
service, gets HTTPS certificates in domain mode (the certificate e-mail is optional) and asks for the
admin panel login. Only the web
container publishes ports: 80/443 (domain mode) or 80, 3000, 8080, 8081 (IP mode, `stack/compose.ip.yml`),
plus the mail server's 25, 465, 587 and 993 when it is on.
Postgres, presence and the OpenMU game ports are never reachable from outside; the cash shop gate
relies on that.

## Where things live on the server

```
/etc/mu-server/  (Windows: C:\ProgramData\mu-server)     outside the repo; `git clean` never touches it
  mu.env            the config: every answer, secrets, the admin password's bcrypt hash (mode 600)
  stack.env         what Compose interpolates (paths, OpenMU image, database password, client build args)
  env/<service>.env each service's environment, rendered from mu.env
  Caddyfile, serverlist.md, server.json
  modules/          streamed modules: <name>.js and its <name>.json, served at /server-modules/
  mail/             the mail server's config: postfix-accounts.cf (bcrypt hashes), opendkim/ (DKIM keys)
  openmu/           OpenMU's repository at the release we run
  backups/<time>/   openmu.dump, roles.sql, data/ (every SQLite file), mail.tar.gz (with mail on), mu.env; the last 10 are kept
  logs/             build and update logs
Docker volumes: mu_dbdata (Postgres), mu_data (/data in the Bun services), mu_openmu-logs, mu_caddy-*,
mu_mail-data, mu_mail-state, mu_mail-logs, mu_webmail-db (mail only)
```

`mu` itself is `/usr/local/bin/mu` (Windows: `mu.cmd` next to `bun.exe`).

## The code

```
get.sh / get.ps1          clone, then install.*
install.sh / install.ps1  Docker, Bun, then the CLI
cli/main.ts               commands and the menu
cli/commands/             install, adopt, manage (config, update, status, logs, backup, restore, uninstall), mail, questions
cli/config.ts             the config and its env-file form       cli/validate.ts   answer checks, secrets
cli/render/               env files, Caddyfile, server list, server.json, mail: pure functions, tested
cli/stack.ts              names, ports, subnet (mirrors stack/compose.yml)
cli/state.ts              writes everything in the state folder   cli/paths.ts      where things live
cli/docker.ts             every docker call                       cli/compose.ts    the compose command line
cli/openmu.ts             OpenMU checkout / source build          cli/health.ts     checks, wait for OpenMU
cli/backup.ts             backup and restore                      cli/firewall.ts, ports.ts, launcher.ts
cli/ui.ts                 the look (@clack/prompts)               cli/exec.ts       running programs
cli/e2e.ts, loginCheck.ts  the end-to-end run and its game check (the client's own protocol code)
stack/                    compose files and Dockerfiles
```

Rules: passwords travel on stdin, never in argv; secrets are only in the state folder (mode 600);
everything the stack reads is rendered from `mu.env`, so `mu config` can change any of it.

## Notable behaviour

- First start: OpenMU seeds the database, including 20 public test accounts whose password is their
  login (three are Game Masters). `register/server/accountsCli.ts lock-test-accounts` bans every one
  still on its default password, on install and on adopt. The GM account is created the same way.
- OpenMU 0.9.10 has no admin panel login; Caddy `basic_auth` guards it with the admin password.
- `mu update` refuses when the checkout has local changes, backs up, fast-forwards, rebuilds, checks
  every service and resets to the previous commit if anything fails (the backup path is printed).
- `mu adopt` dumps the old database and its roles, copies the old SQLite files, checks that the
  chosen OpenMU knows the database's last migration (else asks for a newer release or a source ref),
  stops (never deletes) the old containers and `mu-*`/caddy/nginx units, then restores into the stack.
- Changing the database password runs `ALTER USER` first; changing the address rebuilds the client.
- `server.json` is this server's settings for every player, read by the client when it enters the
  world (`src/modules/servers/serverManifest.ts`). Caddy serves it at `/server.json` on the client
  and on the proxy host (`https://ws.<domain>/server.json`, `http://<ip>:3000/server.json`), to any
  origin, so a client loaded from another site reads it too:

  ```json
  { "version": 1, "settings": { "heldHitRequest": false }, "modulesOff": [], "loginTokens": true, "directLogin": false, "modules": [] }
  ```

  `heldHitRequest` (`mu config` > Features, `MU_HELD_HIT_REQUEST` in `mu.env`, default off) sends a
  plain attack's hit when the swing lands; the original sends it on the click. The intervals then
  follow the swing, not the clicks, and can trip OpenMU's attack-speed check; leave it off unless
  you have tested it. A missing or broken file means the original behaviour.

  `retryLoginWhenConnected` (`mu config` > Features, `MU_RETRY_LOGIN_WHEN_CONNECTED`, default off)
  sends the same login again, 3 times 2.5 s apart, when the server answers "account already
  connected" (usually the same player after a dropped connection); the original only shows the
  refusal. Turn it on only if your server closes the old session on that refusal: otherwise the
  retries are refused too.

  `muHelperAfterReconnect` (`mu config` > Features, `MU_HELPER_AFTER_RECONNECT`, default off)
  asks for the MU Helper again after the client's automatic reconnect when it was running at the
  drop. Off, it stays off until the player starts it. Your botting policy: it keeps an AFK
  helper hunting through a dropped connection.

  `autoManaPotion` (`mu config` > Features, `MU_AUTO_MANA_POTION`, default off) lets a player
  turn on the client's automatic mana potion (Options > Game): under a tenth of the mana it drinks
  the biggest mana potion in the bag, at most one a second, the same request the W key sends. Off,
  the player's option does nothing, as in the original. Gameplay automation: your call.

  `autoQuiver` (`mu config` > Features, `MU_AUTO_QUIVER`, default off) lets a player turn on the
  automatic quiver (Options > Game): the next arrows or bolts in the bag go into the hand as soon
  as the server takes the empty quiver, the same move a drag sends. Off, the original's reload
  stays: the next quiver goes in when the next shot finds the hand empty.

  `restAnyWall` (`mu config` > Features, `MU_REST_ANY_WALL`, default off) lets a player turn on
  resting against any wall (Options > Fidelity): a click on a straight wall or fence leans the hero
  on it, as at a lean spot. OpenMU regenerates a resting player faster, so this gives that bonus
  anywhere. Off, players lean only at the map's lean spots, as in the original.

  `jewelryUpgrade` (`mu config` > Features, `MU_JEWELRY_UPGRADE`, default off) lets a player turn on
  dropping Bless, Soul and Life on the common rings and pendants (Options > Fidelity). Turn it on
  only if your server supports it: stock OpenMU refuses those upgrades. Off, the client refuses
  them before sending, as in the original.

  `jewelBundling` (`mu config` > Features, `MU_JEWEL_BUNDLING`, default off) lets a player turn on
  bundling and unbundling jewels with a right click in the inventory, without Lahap (Options >
  Fidelity). The client sends Lahap's own request with no NPC open: turn it on only if your server
  supports that; stock OpenMU packs jewels only at Lahap. Off, jewels are packed at Lahap, as in the
  original.

  `liteAssets` (`mu config` > Features, `MU_LITE_ASSETS`, default off) makes the client build also
  write lighter copies beside the original files (`tools/liteAssets.ts`: WebP textures and item
  icons, Opus music; the web image then installs ffmpeg for the music) and tells players to read them: smaller
  downloads, slightly lower quality. The originals stay served, and a player can keep them (Options >
  Fidelity, or Classic). Changing it rebuilds the client.

  `modulesOff` (`mu config` > Features, `MU_MODULES_OFF` in `mu.env`, comma separated, default
  none) lists the optional client modules this world does without: their windows hide for its
  players. `band` is added by itself when the band relay is off. The ids are the folders of
  `src/modules/` that are not core: events, quests, marketplace, guild, guild_war, party, friends,
  economy, trade, vault, personal_shop, chaos_mix, pets, mu_helper, band, gm.

  `loginTokens` (always `true`, nothing to set) says this world issues login tokens: our OpenMU
  plugin does (`openmu/readme.md`), and it is in every OpenMU image the installer builds. A client
  with "remember" ticked keeps a token instead of the password (Enhanced and Ultra). The tokens live
  in the `mu_plugins` schema of OpenMU's database, so `mu backup` (the database dump) carries them.

  `directLogin` (`mu config` > Server list entry, `MU_DIRECT_LOGIN`, default off) makes the client
  served here open straight on this server's login: no worlds list, no game server picker (it takes
  the first channel), and logout, Select Server and a lost connection come back to the login. The
  client reads it at boot from its own site's `/server.json` and takes the world from the
  `serverlist.md` beside it; a client loaded from another site ignores it, and a missing or broken
  file means the worlds list as before. Changing it needs no rebuild.

  `modules` (the `modules` folder of the state folder, empty by default) lists the modules this world
  streams to its players ([docs/module_streaming.md](../docs/module_streaming.md)). Put each module's
  built file there as `<name>.js` with a `<name>.json` beside it: `{ "id": "example", "version":
  "1.0.0", "api": "^1.1" }`, plus `"signature"` for a module the client's publisher signed
  (`tools/modules/sign.ts`). Every save (`mu config`, `mu update`) hashes the files and writes the list;
  a file without a valid description is left out with a warning. Caddy serves the folder at
  `/server-modules/` next to `server.json`, to any origin. A signed module runs in the page; any other
  runs in a sandbox once each player allows it.

  `MU_MODULE_SIGNING_KEY` (`mu config` > Features, empty by default) is the public key whose
  signatures make a module first party: 32 raw bytes in base64url, what `tools/modules/sign.ts pubkey`
  prints. It is baked into the client build (`VITE_MODULE_SIGNING_KEY`, a build argument of the web
  image), so changing it rebuilds the client. The prompt refuses PEM text and the lengths of a private
  key (48 and 64 bytes); a 32-byte private seed looks the same as a public key, so never paste from the
  private key file. Empty: every streamed module runs sandboxed.

## Mail server

Optional, off by default, domain mode only. The certificate e-mail question (install, or `mu config`
> Address) offers: none, an address you already have, or **host a mail server here**. The last
creates the mailbox `admin@<domain>` (its password is asked and stored only as a bcrypt hash,
`MU_MAIL_ADMIN_HASH`), uses it as the certificate e-mail and sets `MU_MAIL=on`. The register service
sends no mail, so nothing else uses it.

- **Webmail**: `https://mail.<domain>` (Roundcube), log in as `admin@<domain>` or `admin`. IMAP
  `mail.<domain>:993`, SMTP submission `mail.<domain>:587` (STARTTLS) or `:465` (TLS), for any mail app.
- **Stack**: docker-mailserver (Postfix, Dovecot, OpenDKIM, OpenDMARC) and Roundcube under the Compose
  profile `mail`, which `mu` passes only when mail is on. Turning it off in `mu config` removes both
  containers and keeps their volumes.
- **TLS**: Caddy gets the certificate for `mail.<domain>` (the webmail site, Let's Encrypt only) and the
  mail server reads it from Caddy's volume (`SSL_TYPE=manual`; it reloads on renewal). One ACME client,
  no second fight over port 80. Until that certificate exists (DNS not in place yet) the mail server
  waits and `mu status` shows the IMAPS check DOWN.
- **Mailboxes**: `mu mail add|remove|passwd <address>`, `mu mail list` (or `mu mail` for a menu). They
  live in `mail/postfix-accounts.cf` of the state folder as `address|{BLF-CRYPT}<bcrypt>`; the mail server
  notices a change by itself. Removing a mailbox keeps its stored mail in the volume.
- **Backup**: `mu backup` adds `mail.tar.gz` (`/var/mail`, `/var/mail-state` and the config folder with
  the accounts and DKIM keys); `mu restore` puts it back.

### DNS records

`mu mail dns` prints them with your values (also shown at the end of the install and by `mu status`);
it makes the DKIM key first if there is none yet.

| type | name | value |
|---|---|---|
| A | `mail.<domain>` | this server's IP (with the other A records) |
| MX | `<domain>` | `10 mail.<domain>` |
| TXT | `<domain>` | `v=spf1 mx -all` |
| TXT | `mail._domainkey.<domain>` | `v=DKIM1; h=sha256; k=rsa; p=...` (the generated key) |
| TXT | `_dmarc.<domain>` | `v=DMARC1; p=quarantine; rua=mailto:admin@<domain>` |
| PTR | this server's IP | `mail.<domain>`: set at your VPS provider, not at the DNS host |

### Before you turn it on

- Many VPS providers block port 25 (in and out) until you ask them to open it. Without it no mail
  arrives or leaves; webmail still opens.
- Mail from a new server lands in spam unless PTR, SPF, DKIM and DMARC are all in place.
- Running a mail server is your responsibility: abuse reports, blocklists and delivery problems are yours.

## Change it

- a new question: `cli/commands/questions.ts` (+ a field in `cli/config.ts`, + where it renders).
- a new service: a block in `stack/compose.yml`, its env in `cli/render/env.ts`, a health check in
  `cli/health.ts`, and its SQLite path under `/data` (backups pick up every `*.sqlite`).
- a new route: `cli/render/caddy.ts`.
- a new server setting: a field in `cli/config.ts`, a question, `cli/render/manifest.ts`, and the
  client's reader (`src/modules/servers/serverManifest.ts`, which ignores keys it does not know).

## Tests

- `cli/config.test.ts`: config round trip, answer checks, secrets, the module signing key (public only).
- `cli/render/render.test.ts`: service env (secrets only where used, proxy pinned, trusted proxy),
  Caddyfile (both modes, admin login, route order), server list, compose interpolation,
  `server.json` (default, the setting, the direct login, the modules off, the modules folder, accepted by the client's
  parser, served on both hosts with the module files), the module signing key reaching the client build.
- `cli/render/mail.test.ts`: the mail switch and the certificate e-mail choice, the mail site, ports,
  profile and env, the compose services (pinned, profile, volumes), the DNS records, the DKIM key file,
  the accounts file, the mail backup and restore commands.
- `cli/backup.test.ts`: role filtering, backup names.
- End to end, with Docker: `MU_STATE=<scratch folder> bun install/cli/e2e.ts` (build, start, check;
  then `backup`, `down`). It refuses to run without `MU_STATE`, so it never touches a real install.
  Its `check` also plays the game through the proxy as the test GM (`cli/loginCheck.ts`, with the
  client's packet classes and encryption): `server.json` offering login tokens, password login, the
  character list, a login token (E7 03/04), a module packet (0xE8) sent at the character list dropped
  unread while one sent in the world reaches the handler, then after a reconnect a token login (E7 05)
  reaching the character list with the token replaced, the proxy naming that socket for the cash
  shop, the replaced token and a junk one refused, and the new token logging in.

## Troubleshooting

| symptom | look at |
|---|---|
| "Port 80 is taken by ..." | another web server (Apache, nginx, an old Caddy); stop it and rerun |
| build failed | the log path it prints (`/etc/mu-server/logs/`) |
| OpenMU did not start in time | `mu logs openmu-startup` |
| a service DOWN in `mu status` | `mu logs <service>` |
| HTTPS not working | DNS A records for play., ws., register., api., admin. must point here; `mu logs web` |
| mail does not arrive or leave | port 25 open at the VPS provider; `mu mail dns` records in place; `mu logs mailserver` |
| Mail server (IMAPS) DOWN | Caddy has no certificate for mail.<domain> yet: its A record; `mu logs web` |
