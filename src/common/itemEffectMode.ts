import { GameOptions } from './gameOptions';
import type { TextKey } from '../i18n';

/**
 * Item effect style (Options → Video → "Item effects"):
 *   0 Off                 — no level tints, no glow, no item lights
 *   1 Legacy              — the original client's passes only (itemMaterial.ts)
 *   2 Legacy + improved   — original passes plus the GlowLayer / light layer
 *   3 Improved            — only the modern layer
 *
 * `effectLevel` is the original's "+Effect limitation" (`g_pOption->GetRenderLevel()`,
 * 0–4): it caps the rendered item level at `2n + 5` and, at 0, drops the
 * excellent / ancient passes entirely (ZzzObject.cpp:9555, :10307). It applies
 * to both styles so the slider means the same thing whichever look is on.
 */
export const enum ItemEffectMode {
  Off = 0,
  Legacy = 1,
  Both = 2,
  Improved = 3,
}

export const ITEM_EFFECT_MODE_MAX = 3;

/** The mode names, as text keys - the Options slider prints `t()` of these. */
export const ITEM_EFFECT_MODE_LABEL_KEYS: Record<number, TextKey> = {
  [ItemEffectMode.Off]: 'common.off',
  [ItemEffectMode.Legacy]: 'options.itemEffects.legacy',
  [ItemEffectMode.Both]: 'options.itemEffects.both',
  [ItemEffectMode.Improved]: 'options.itemEffects.improved',
};

export function itemEffectMode(): ItemEffectMode {
  const v = GameOptions.itemEffects;
  return v === 0 || v === 1 || v === 2 || v === 3 ? v : ItemEffectMode.Both;
}

export function legacyItemEffectsOn(): boolean {
  const m = itemEffectMode();
  return m === ItemEffectMode.Legacy || m === ItemEffectMode.Both;
}

export function improvedItemEffectsOn(): boolean {
  const m = itemEffectMode();
  return m === ItemEffectMode.Improved || m === ItemEffectMode.Both;
}

/** The original's render level (0–4). */
export function legacyRenderLevel(): number {
  return Math.max(0, Math.min(4, GameOptions.effectLevel | 0));
}

/** `Level = min(Level, RenderLevel * 2 + 5)` when the cap is below max. */
export function capItemLevel(level: number): number {
  const rl = legacyRenderLevel();
  return rl < 4 ? Math.min(level, rl * 2 + 5) : level;
}

/** A cheap key for "did anything that changes item looks move?" */
export function itemEffectSignature(): string {
  return `${itemEffectMode()}/${legacyRenderLevel()}`;
}
