// Migrated to `src/sound/`: positioned one-shots live in
// `sound/listener.ts`, interface sounds in `sound/ui.ts`. Kept as a re-export
// for the existing import sites.
export {
  playSfx,
  setSfxListener,
  clearSfxListener,
  UI_SOUNDS,
  UI_SOUND_KEYS,
  playUiSound,
  uiClick,
  type SfxPosition,
  type UiSound,
} from '../sound';
