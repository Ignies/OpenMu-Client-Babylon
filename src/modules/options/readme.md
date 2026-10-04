# options

The player's settings, kept in the browser (`GameOptions`), the mobile skill pad's three slots, and
the handler that restores the skill hot keys the server saved for the character.

## Public API
- `GameOptions`: the live options object, a MobX observable; read it anywhere.
- `setGameOption(key, value)`: sets one option, saves all of them, calls the listeners.
- `onGameOptionsChanged(listener)`: subscribe; returns the unsubscribe.
- `defaultGameOption(key)`: the fresh-install value (the Options window's Defaults).
- `optionsFrom(parsed)`: a stored blob over the defaults, cleaned and clamped (what `load` uses).
- `uiScaleFactor(step)`, `UI_SCALE_MAX`, `TONE_MAPPER_MAX`, `BRIGHTNESS_MIN` / `BRIGHTNESS_MAX`.
- `MobileSkillSlots`: `slots`, `use(character)`, `assign(slot, number)`, `prune(learned)`; `MOBILE_SKILL_SLOTS`.

## How it works
- `GameOptions` is loaded once from localStorage key `mu_options`: `DEFAULTS` first, the stored blob
  on top, then numeric options clamped to `RANGES`. `migrate` drops retired keys (`DROPPED_KEYS`) and
  maps the two that survive (`toneMapping` -> `toneMapper`, `exposure` -> `brightness`, plus the
  vignette rescale), then saves.
- Fidelity: `fidelity` (0 Classic / 1 Enhanced / 2 Ultra) and `fidelityOverrides` (improvement id ->
  boolean, only the ones set apart from the preset). `optionsFrom` drops a bad overrides blob; a
  save from before the option gets Enhanced and no overrides, which is how the client behaved. On
  load and on every change of either key the module pushes them to `controllers/fidelity`
  (`setFidelityChoice`), which answers `isOn(id)`; ids no improvement registers are ignored there.
- Several ranges are literals, not imported constants: the modules that own those constants import
  `gameOptions.ts`, so importing them back would close a cycle.
- `MobileSkillSlots` is browser-only (key `mu_mobile_skills`, per character name). It is not
  `Store.skillHotkeys`: those ten are saved to the server, so sharing them would rewrite the desktop bar.
- The ten digit hot keys live in the Store: `Store.skillHotkeys`, `savedSkillHotkeys`,
  `applyKeyConfiguration`, `assignSkillHotkey` (which sends `SaveKeyConfiguration`, `SaveOptions`
  in `ZzzOpenData.cpp:4764`).

## Packets
- `ApplyKeyConfiguration` (F3 30, `ReceiveOption`): reads the ten big-endian hot key words (0xFFFF
  empty) and calls `Store.applyKeyConfiguration`. The other option bytes are ignored.

## Depends on / used by
- uses: `core/localStorage`, `controllers/fidelity` (pushes the choice), `hero/lowVitals.ts`, `skills/skillCasting.ts` (`isHotbarSkill`),
  `controllers/camera/recipes`, `controllers/render` (render distance and scale limits).
- used by: `src/app/logic.ts` (net) and about 80 files that read `GameOptions`: controllers (render,
  lighting, terrain, sound, weather, interface), ECS systems, several modules. Windows:
  `versions/shared/ui/windows/options/` (the Options window, `catalogue.ts`), `debug_menu/`; HUD
  `mobile_controls/skillPad.tsx` (`MobileSkillSlots`), `minimap/`, `low_health_overlay/`, `chat/`.

## Change it
- add an option: add the field (with a comment) to the `GameOptions` type, its value to `DEFAULTS`,
  a range to `RANGES` if numeric, and a row in `versions/shared/ui/windows/options/catalogue.ts`.
- add an improvement (a Fidelity check): [docs/how_to/add_improvement.md](../../../docs/how_to/add_improvement.md);
  nothing changes here.
- retire an option: remove it and add the key to `DROPPED_KEYS`; map it in `migrate` if it survives in
  another shape.
- restore more of the saved key configuration: the `ApplyKeyConfiguration` handler in `net.ts`.

## Tests
- `gameOptions.test.ts`: `migrate` (retired keys, tone mapper and brightness mapping, vignette rescale,
  stored tiers kept); `optionsFrom` (old saves get Enhanced, the preset is clamped, a bad overrides
  blob is dropped).
