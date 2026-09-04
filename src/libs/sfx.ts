// Migrated to `src/sound/`: positioned one-shots live in
// `sound/listener.ts`, interface sounds in `sound/ui.ts`. Kept as a re-export
// for the existing import sites. Re-exported from the leaf modules, not the
// `sound` facade: the facade reaches `Store`, and dragging that cycle into
// every button's import breaks chunk-level init order once the app splits.
export {
  playSfx,
  setSfxListener,
  clearSfxListener,
  type SfxPosition,
} from '../sound/listener';
export {
  UI_SOUNDS,
  UI_SOUND_KEYS,
  playUiSound,
  uiClick,
  type UiSound,
} from '../sound/ui';
