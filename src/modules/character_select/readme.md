# character_select

The character select screen: create and delete answers from the server, the line-up layout
(slot positions, camera) and the painted backdrop behind it. The character list and the select,
create and delete actions still live in the central `Store` (`src/app/store.ts`).

## Public API
- `characterSlotPosition(slot)` / `characterSlotAngle(slot)`: where each of the five slots stands
  and faces.
- `CHARACTER_CAMERA_POSITION`, `characterCameraTarget()`: the line-up camera.
- `characterSelectView`: observable `{ zoomedOn }`, the name the right-click close-up is on.
- `createCharacterSelectBackdrop(scene)`: the backdrop card; returns `{ dispose() }`.
- `confirmDeleteCharacter(name)` (`index.ts`, the door): the delete button's two boxes (confirm, then
  the resident number) and the delete request with the typed number.
- `CREATE_MESSAGES`: localized create notices (`minLength`, `specialName`, `reservedName`, `failed`).

## How it works
- `characterSelect.ts` holds the five slots in MU units and converts them to scene space
  (divide by 100, swap y and z). The camera target is the slot centre projected on the camera's
  forward axis.
- `characterSelectBackdrop.ts` draws `/backdrops/character-select.jpeg` on a billboard plane 90
  tiles down the camera's view. It is sized like CSS `background-size: cover`, top anchored, 15%
  oversize so the close-up never shows its edges, refit on resize, and hidden until the texture
  loads.
- `net.ts` writes the server's answers into the Store: `charactersList`, `focusedChar`,
  `deletingChar`, `creationUnlockFlags`, `charCreationPending`, `addCreatedCharacter(...)`, and pops
  message boxes with `Store.popUpMsgWin`.
- `CharacterList` and `CharacterFocused` are not handled here: the shared
  `versions/shared/ui/pages/character_select/character_list` component (`CharacterList`) handles
  them for both pages.
- Outgoing packets are Store actions: `refreshCharactersListRequest`, `focusCharacterRequest`,
  `selectCharacterRequest`, `createCharacterRequest`, `deleteCharacterRequest`.

## Packets
- `CharacterDeleteResponse`: removes the character from the list, or shows the matching error box
  (guild member, wrong security code, item block).
- `CharacterClassCreationUnlock`: sets `Store.creationUnlockFlags`.
- `CharacterCreationSuccessful`: adds the new character (blank preview gets a default appearance);
  a false `Success` shows the failed notice.
- `CharacterCreationFailed`: clears the pending flag and shows the failed notice.

## Depends on / used by
- uses: `app/store.ts`, `controllers/actors/deserializeAppearance`, `controllers/interface/msgWin`,
  `controllers/render/babylon`, `src/i18n`.
- used by: `src/app/logic.ts` (`net.ts`), `ecs/systems/characterSelectSystem.ts`,
  `ecs/systems/loginSceneSystem.ts`, `versions/shared/ui/pages/character_select/`
  (`CharacterSelectionPlate.tsx`, `CharMakeWin.tsx`).

## Change it
- move a slot or the camera: `CHARACTER_SLOTS` and the camera constants in `characterSelect.ts`.
- change the backdrop art or its fit: `ART`, `DISTANCE`, `MARGIN` in `characterSelectBackdrop.ts`.
- handle a new create or delete result: `net.ts`.
- change the list or focus handling: the pages above.

## Tests
- none yet.
