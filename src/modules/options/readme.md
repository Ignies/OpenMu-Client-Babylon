# options

The gameplay side of the options: the handler that restores the skill hot keys the server saved
for the character, and the mobile skill pad's three slots. The player's settings themselves
(`GameOptions`) are engine-level and live in `src/controllers/settings`.

## Public API
- `MobileSkillSlots`: `slots`, `use(character)`, `assign(slot, number)`, `prune(learned)`; `MOBILE_SKILL_SLOTS`.
- `PwaInstall`, `installApp()`, `watchInstallState()` (`pwaInstall.ts`): install the client as an
  app, from the options window.

## How it works
- `MobileSkillSlots` is browser-only (key `mu_mobile_skills`, per character name). It is not
  `HeroSkills.skillHotkeys`: those ten are saved to the server, so sharing them would rewrite the desktop bar.
- The ten digit hot keys live in the skills module: `HeroSkills.skillHotkeys`, `savedSkillHotkeys`,
  `applyKeyConfiguration`, `assignSkillHotkey` (which sends `SaveKeyConfiguration`, `SaveOptions`
  in `ZzzOpenData.cpp:4764`).
- Install as an app: the browser fires `beforeinstallprompt` once, early. `main.tsx` calls
  `watchInstallState()` so the event is held from the start, and the options window spends it
  whenever the player presses the button. Installing changes no rendering; it gives a taskbar icon
  and persistent storage for downloaded assets. `pwaInstall.ts` imports nothing of the game, so
  `main.tsx` can load it before the version resolves.
- Dependency direction: `GameOptions` moved down to `controllers/settings` because render, sound,
  terrain, lighting, weather, camera, fx, item_fx, assets and the interface read it; a controller may
  not import a module. Nothing here re-exports it.

## Packets
- `ApplyKeyConfiguration` (F3 30, `ReceiveOption`): reads the ten big-endian hot key words (0xFFFF
  empty) and calls `HeroSkills.applyKeyConfiguration`. The other option bytes are ignored.

## Depends on / used by
- uses: `skills` (`HeroSkills`), `core/localStorage`, `skills/skillCasting.ts` (`isHotbarSkill`).
- used by: `src/app/logic.ts` (net), HUD `mobile_controls/skillPad.tsx` (`MobileSkillSlots`),
  `src/app/main.tsx` and the options window (`pwaInstall.ts`).

## Change it
- add a setting: `src/controllers/settings` (see its readme).
- restore more of the saved key configuration: the `ApplyKeyConfiguration` handler in `net.ts`.

## Tests
- `pwaInstall.test.ts`: install flow (no prompt yet, accepted, refused, already installed, second
  press while the dialog is up).
- `src/app/listenerOrder.golden.test.ts` pins where the handler sits.
