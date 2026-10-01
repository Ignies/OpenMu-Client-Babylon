import { type BoneGlow } from '@/controllers/fx/aura';
import { RGBS, TEX } from '@/controllers/fx/recipes';

/** The Ourforces glow's 17 bones, in three breathing groups (ZzzEffect.cpp:9602-9636). */
const OURFORCES_BONES = [12, 17, 5, 10, 36, 27, 37, 28, 11, 35, 2, 3, 36, 20, 27, 4, 26] as const;
const OURFORCES_SLOW = new Set([5, 12, 7, 8, 9, 14, 15, 16]);
const ourforcesBreathe = (t: number, i: number): number =>
  i < 3 ? (Math.sin(t * 10) + 1) * 0.25 + 0.2 : OURFORCES_SLOW.has(i) ? (Math.sin(t * 5) + 1) * 0.25 + 0.5 : (Math.sin(t * 10) + 1) * 0.3 + 0.3;
export const OURFORCES_GLOW: BoneGlow = { bones: OURFORCES_BONES, texture: TEX.flareRed, colour: RGBS.white, size: 0.96, breathe: ourforcesBreathe };
