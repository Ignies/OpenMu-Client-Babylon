import type { BodyFxEmitter } from '@/controllers/monsters';
import { halo, mark } from '../_shared/bodyFx';

/**
 * The game master's aura (ZzzCharacter.cpp:9441-9462). The outer light is
 * `CreateSprite(BITMAP_LIGHT, …, 6.0f, (0.4,0.6,0.8), o, 0.5f)` and the one inside it rides
 * `sin(WorldTime * 0.05) * 0.4 + 0.9` on (0.3,0.5,0.8) - taken at its mean, as the sines here are.
 * `RenderAurora`'s own `sin(t*0.0015)*0.3+0.7` and the marks' `*0.3+0.5` likewise. The outer
 * light's `Alpha` of 0.5 is folded into its colour: the card is additive.
 */
const HALO_OUTER = [0.2, 0.3, 0.4] as const;
const HALO_INNER = [0.27, 0.45, 0.72] as const;
const AURORA = [0.21, 0.14, 0.7] as const;
const MARK = [0.5, 0.5, 0.5] as const;
/** Both pairs turn on `WorldTime * 0.01`: degrees per millisecond. */
const SPIN = 10;

/**
 * MODEL_GM_CHARACTER, also what the Game Master Transformation Ring puts a character in: a light
 * over the head, and two pairs of counter-turning marks on the ground - the blue `RenderAurora`
 * pair and the `BITMAP_GM_AURORA` pair inside it (:9436-9462). The physics-cloth hair of the same
 * branch has no equivalent and is not here.
 */
export const GAME_MASTER_FX: readonly BodyFxEmitter[] = [
  halo('flare', HALO_OUTER, 4.2, 100),
  halo('flare', HALO_INNER, 1.4, 100),
  mark('magicGround2', AURORA, 2.5, SPIN),
  mark('magicGround2', AURORA, 2.5, -SPIN),
  mark('gmAurora', MARK, 1.5, SPIN),
  mark('gmAurora', MARK, 1.0, -SPIN),
];
