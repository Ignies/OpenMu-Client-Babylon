# website

The server's website: landing page, accounts, admin panel and toggleable modules, in plain PHP. The
installer serves it on the bare domain (`example.com`) with the game client on `<clientSubdomain>.example.com`
(`play` by default), or on port 8082 in IP mode. Accounts are OpenMU's own (`data."Account"`): one login for
the site and the game.

## Layout

```
index.php                 the front controller: the only PHP file the web server runs
config/
  settings.php            install-time settings from the installer's MU_* variables (settings.local.php for a local run)
  resources/              the only folder served as files: css/, js/ (site.js, fx/ bundle), img/ui/ (rendered art)
  logic/                  never served
    core/                 the pages: home, login, logout, account, admin, play, media, lang
      kernel/             app (boot, routes), http, db, session, auth, modules, i18n, store, view
      i18n/<code>.php     the core's text, one file per language (en is complete and the fallback)
      migrations/         001_core.sql; dev.sql seeds a local SQLite copy of OpenMU's tables
    modules/<name>/       module.php (the manifest), its pages, i18n/, migrations/
art/build.py              renders the UI art (Python + Pillow + numpy)
fx/                       the landing page's map tour and lit logo, bundled for the site (Vite)
storage/                  local runs only: dev database, sessions, uploads (production: /data/site)
```

## How it works

- **Routing.** Everything reaches `index.php`; `kernel/app.php` maps the path to a core page or an enabled
  module's route. Core routes win, so a module can never take over login or admin. Caddy serves only
  `config/resources/*` (and the landing's `/fonts`, `/icons`, `/ui/world_select`) as files.
- **Modules.** A folder in `logic/modules` with a `module.php` returning its title, routes, nav links, home
  widgets, hero slides and admin tabs. Two switches decide if it runs: the install (`MU_SITE_MODULES`, blank for
  all) and the admin panel (Admin > Modules, `web_module`). Module names come from folders, never from requests,
  and a manifest can only point at files in its own folder.
- **Database.** One PDO connection to OpenMU's Postgres; the site's own tables are `web_*`, created by the
  migrations in `core/migrations` and each module's `migrations/`, applied once each. Locally, with no Postgres,
  it runs on SQLite with OpenMU's schemas as attached files seeded by `dev.sql`.
- **Accounts.** Passwords are hashed the way OpenMU reads them: bcrypt `$2a$` at cost 11
  (`register/server/accounts.ts`). Not `PASSWORD_DEFAULT`: PHP may move it off bcrypt and the game could no
  longer log in. IDs and passwords follow the game's 4-10 character rules. Game Master accounts are the admins.
- **Security.** Sessions live outside the web root; cookies are HttpOnly, SameSite=Lax, Secure on HTTPS; every
  POST carries a CSRF token checked centrally; logins and sign-ups are throttled per IP; uploads are checked by
  their real type, renamed at random and served through `media/` from private storage; a strict CSP.
- **Gated client.** With `MU_CLIENT_GATED=on`, Caddy asks `/auth/play` (forward_auth) before serving the client
  page or opening the game socket: logged-in players pass, others get the login page or a 401. The session
  cookie is set for `.<domain>` so the client and ws hosts see it.
- **i18n.** Every string comes from `t('key')`; each owner keeps `i18n/<code>.php` next to its code. A language
  exists when `core/i18n/<code>.php` does. The default is the installer's server language; the footer switch
  remembers the visitor's choice. Names stored with a leading `@` (seeded news categories) are text keys.
- **Look.** The background is the landing page's map tour with its credits (`fx/`, the client's own
  `backdrop.tsx` and `logoLight.tsx`, bundled with a small English-only i18n stand-in), or an image, video,
  colour or gradient the admin uploads (Admin > Appearance, previewed live). The art is drawn by
  `art/build.py`: dark chrome with flowing vines, once per theme (red, orange, yellow, green, blue, purple),
  plus a `_glow` layer per piece that CSS animates. `themes.css` maps each theme to its pieces as CSS variables.

## Run it locally

```
python website/art/build.py          # the art (about a minute per theme; --theme=red, --piece=frame narrow it)
bun run build:site-fx                # the map tour bundle
php -S 127.0.0.1:8090 -t website website/index.php
php website/tests/kernel_test.php    # the kernel's rules: OpenMU hash format, ID rules, module guard, text
```

The dev database seeds two test accounts; their logins are in `config/logic/core/migrations/dev.sql`.

## Change it

- add a module: `logic/modules/<name>/module.php` (see `news/` for every hook), its `i18n/en.php`, and
  `migrations/001_<name>.sql` for its tables (portable SQL: Postgres and SQLite; one statement per `;`).
- add a language: `core/i18n/<code>.php` and the same file in each module; missing keys fall back to English.
- restyle the art: edit `art/build.py` (shapes, materials, themes) and run it; 9-slice cuts are in `site.css`.

## Decisions

- PHP, as asked, next to the Bun services: it renders pages; the game-facing services stay in Bun.
- Passwords use `PASSWORD_BCRYPT` cost 11 with the `$2a$` label, not `PASSWORD_DEFAULT` (see Accounts).
- `config/resources` sits inside `config/` as asked, so the web server serves that folder only and routes all
  else to `index.php`; sessions and uploads are outside the web root.
- "Client as a blob" became a session-gated client host: a blob URL cannot host the Vite client (its asset paths
  break) and gives no protection, since the client is fetched anyway. Gating the page and the socket does.
- The art is rendered at build time (Python in the web image), not committed: the script is the source.

## Roadmap

Built: accounts and registration, admin (modules, appearance, themes), news with editable categories and
featured carousel slides, rankings (resets, level, player kills), i18n (en, es), the installer wiring.

Next, each a module:
- VIP tiers with Discord-like roles and permissions.
- Forum: public, staff and guild boards; guild pages at `/guild/<name>` with invites.
- Character pages with previews; the web marketplace (the Bun marketplace service is already there).
- Discord: login or account linking, and news and golden notices posted to a channel.
- Golden notices: the game's server-wide announcements shown on the landing page (needs an OpenMU plugin
  that publishes them).
- Event timers: countdowns to Blood Castle, Devil Square, Chaos Castle and the rest (from OpenMU's event
  configuration).
- Most duels in rankings: OpenMU does not keep duel results; needs a plugin that counts them.
- Admin game tools: inventory management, the live map of characters, macros, spawning, mass teleport. These
  need an authenticated admin API from an OpenMU plugin on the internal network; the site never talks to game
  ports.
- Downloads: an APK (Cordova) and EXE (Electron) of the client with a custom icon, built on demand by an
  opt-in builder container (the Android SDK alone is several GB), not by the web image.
