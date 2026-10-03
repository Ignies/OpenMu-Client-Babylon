# band

Instruments a player takes out and plays from a MIDI file, alone or in a band with other players.
Not in the original client: the notes travel through our proxy (`proxy/band/`), not the game server.

## Public API
- `instruments.ts`: `INSTRUMENTS` (the registry), `InstrumentId`, `instrumentById(id)`,
  `instrumentParts(def)`, `isInstrumentId(value)`.
- `music/index.ts`: the `Band` observable (phase, instrument, song, role, band, window, `available`) and
  the hero's commands: `takeOutInstrument`, `putAwayInstrument`, `loadMidiFile`, `playSong`,
  `pauseSong`, `stopPlaying`, `setLoop`, `joinBand`, `leaveBand`, `toggleInstrumentWindow`,
  `remotePerformers()`. `BandSystem` calls back with `takenOut`, `refused`, `performanceEnded`.
- `music/performing.ts`: `startPerforming`, `stopPerforming`, `BandHit` (the `performing` component).
- `music/instrumentClip.ts`: `instrumentClip(model, source, from, to, sway)`.
- `music/bandState.ts`: `PERCUSSION_CHANNEL`. `music/testMidi.ts`: `buildTestMidi()` (tools and tests).
- `bandNet.ts`: `installBandNet()`, the module's `install` (`module.ts`).

## How it works
- `music/index.ts` is the facade: the Instrument window, the emote wheel, `BandSystem` and `bandNet.ts`
  only talk to it. Taking an instrument out goes through `world.bandRequest` and `BandSystem`, like emotes.
- Playback runs on a 100 ms timer. `Sequencer` walks the song on the audio clock, voices the hero's notes
  through the sampler (`controllers/sound/instruments`) and sends each window ahead as one batch.
- `Receiver` turns a remote performer's batches back into notes on this client's audio clock, with a
  delay that grows with the ping; a sequence gap or a quiet stream silences it.
- A band: members double the master's song on their own instrument, on the channels in their mask.
  Percussion (channel 9) is only voiced by a drum kit (`bandState.ts`).
- `bandNet.ts` plugs a `BandTransport` into the facade. Before the proxy's hello (or offline) the
  transport is silent and the hero just plays for themselves. `BandSender` numbers batches, splits
  big ones and keeps under the proxy's rate.
- Frames are encoded in `controllers/net/protocols/bandProtocol.ts` and sent with `Store.sendBandFrame`.
- A warp (`requestWarp`) resets every stream and puts the hero's instrument away.

## Packets
- `BandRelay` (C1 FA, from the proxy), by sub type:
  - `Hello`: the relay is there; `Band.available` if the version matches.
  - `Start` / `Stop`: a performer in scope starts or stops; for the hero, a stop by the proxy.
  - `Refused`: the hero's request was refused (cooldown, busy, full, range, map, rate).
  - `Batch`: notes from a performer.
  - `Join` / `Leave`: a member joins or leaves the hero's band.
  - `BandState`: a master's member list.
- `wsClosed` (event): the game socket that said hello closed; the band is unavailable.
- Outgoing frames: start, stop, batch, join, leave, band state.

## Depends on / used by
- uses: `social/social.ts` (system lines), `Store`, `controllers/net/protocols/bandProtocol.ts`,
  `controllers/sound/instruments`, `controllers/render/boneLink`, `src/i18n`.
- used by: `src/app/logic.ts`, `ecs/systems/bandSystem.ts`, `ecs/world.ts` (types),
  `controllers/sound/instruments` (`InstrumentId`), `tools/instrumentSamples.ts`. UI:
  `windows/instrument_window`, `windows/emote_menu`.

## Change it
- add an instrument: append a row to `INSTRUMENTS` (never reorder or remove: the wire sends the index),
  run `bun run tools/instrumentSamples.ts <id>` for the notes, add a builder in
  `tools/instrumentModels.ts` for the model, add `instrument.<id>` in every language.
- change timing (lead, delay): `music/sequencer.ts`, `music/receiver.ts`.
- handle a new relay sub type: `bandNet.ts`, plus the codec in `bandProtocol.ts`.
- change the window: `versions/shared/ui/windows/instrument_window/index.tsx`.

## Tests
- `music/bandState.test.ts`: who voices which channel, joins and leaves, drum kit channels.
- `music/midiFile.test.ts`: MIDI parsing, tempo changes, running status, skipped and refused input.
- `music/receiver.test.ts`: offset, late batches, gaps, sequence wrap, delay from ping.
- `music/sequencer.test.ts`: send window ahead of playback, batch timing, local channels, pause, loop.
