# Marketplace escrow plugin for OpenMU

The game server half of the marketplace. Seven C# files that go into an
OpenMU build at the paths under `src/`, plus a Dockerfile that produces the
world's image from upstream OpenMU at a pinned commit with these files laid
on top. No fork to maintain: bump `OPENMU_COMMIT` when moving to a newer
OpenMU, rebuild, done.

What it does: packet group `0xE7`. The client sends a token the marketplace
service signed (`C1 len E7 01 <token>`); the plugin checks the signature,
the expiry and that the token was minted for this very account and
character, then moves an item between the player's bag and an escrow box
(an `ItemStorage` row owned by nobody) in the player's own session, or
moves the Zen waiting in a box into the player's wallet. It answers with
`C1 len E7 02 op status listingId boxId amount itemLen item`. The service
never gets called; it reads the outcome from the game database.

## Build the image

```bash
docker build -t openmu-escrow marketplace/openmu
```

Run it in place of `munique/openmu` with the shared secret in its
environment (the same value the marketplace service has as
`MARKETPLACE_ESCROW_SECRET` in `/etc/mu-marketplace.env`). In a compose
override next to OpenMU's `docker-compose.yml`:

```yaml
services:
  openmu-startup:
    image: openmu-escrow
    environment:
      MARKETPLACE_ESCROW_SECRET: change-me
```

Without the secret every token is refused and nothing else changes.

Pick `OPENMU_COMMIT` at or after the commit the live database is migrated
to (`select "MigrationId" from "__EFMigrationsHistory" order by 1 desc
limit 1` on the box, compared with `src/Persistence/EntityFramework/Migrations`
upstream). A newer commit migrates the database on first start; an older one
does not start.

The plugins register themselves at startup and are active by default; the
admin panel lists them under Packet Handlers as "Marketplace Group Handler"
and "Marketplace Escrow Request Handler".
