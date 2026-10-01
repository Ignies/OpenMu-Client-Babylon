# openmu

Our plugins for OpenMU. We do not ship or fork OpenMU: the installer runs OpenMU the OpenMU way (its
repository at a release tag, its `deploy/all-in-one` compose, the official `munique/openmu` image),
and this folder adds one thin layer on top.

## What is here

```
plugins/            MuPlugins.csproj: one DLL with every plugin, compiled against the image's own assemblies
  StartupHook.cs    loads the DLL before OpenMU starts (DOTNET_STARTUP_HOOKS), so its plugin discovery finds it
  GameLogic/        marketplace escrow: token check, item and Zen moves (EscrowToken, MarketplaceEscrowAction)
  GameServer/       packet group 0xE7: the group handler, the escrow request handler, the result view
Dockerfile          FROM the OpenMU image, + plugins/ in /app/plugins, + the startup hook
appsettings.Production.json   adds a compact JSON log (logs/events-*.jsonl) that ops/server reads
```

## How it works

- OpenMU's `PlugInManager` registers every `[PlugIn]` type in the loaded assemblies. The startup hook
  loads our DLL first, so our plugins register like built-in ones and show in the admin panel
  (Packet Handlers: "Marketplace Group Handler", "Marketplace Escrow Request Handler").
- OpenMU's own external-assembly option (`ExternalAssemblyName`) loads `plugins\<name>`, a relative
  Windows path, and fails in the Linux image; the startup hook avoids it.
- A plugin outside OpenMU sees only public types. `MarketplaceGroupHandler` repeats the few lines of
  OpenMU's internal `GroupPacketHandlerPlugIn`; the result view reads the internal
  `RemotePlayer.Connection` once by reflection and fails loudly if OpenMU renames it.

Marketplace escrow: the client sends a token the marketplace service signed (`C1 len E7 01 <token>`).
The plugin checks signature, expiry, account and character, then moves an item between the bag and
an escrow box (an `ItemStorage` owned by nobody), or pays out the Zen waiting in a box. It answers
`C1 len E7 02 op status listingId boxId amount itemLen item`. Config: `MARKETPLACE_ESCROW_SECRET`, the
same value the marketplace service has; without it every token is refused.

## Change it

- add a plugin: a new `[PlugIn]` class under `plugins/`, public OpenMU types only. Rebuild with
  `mu update` (or `docker build -t mu-openmu:local openmu`).
- another OpenMU version: `mu config` > OpenMU version. The DLL is recompiled against that image, so
  an API change shows up as a build error, not at run time.
- a database newer than the last release: `mu config` > OpenMU source at a commit; OpenMU's own
  `src/Startup/Dockerfile` builds the base image.

## Tests

Built and run by the installer's end-to-end run: the three plugins appear active in
`config."PlugInConfiguration"` and `logs/events-*.jsonl` is written.
