import { type RGB } from '@/controllers/fx/core';
import { SOUL_MOTES, TEX } from '@/controllers/fx/recipes';
import { Step, after, flash, particles, perTick, seq, ticks } from '@/controllers/skills/visuals';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { effects } from '@/controllers/fx';

/** RemovalStun / RemovalInvisible: a BITMAP_FLASH ribbon from +1200 z dropping on the target at Vel 70 (LT 40, MaxTails 10, width 120). */
export const flashDrop = (colour: RGB): Step => (at, c) => {
  const top = at.clone();
  top.y += 12;
  effects.spawn('joint', c.scene, top, { heading: new Vector3(0, -1, 0), velocity: perTick(70), seconds: ticks(40), maxTails: 10, width: 1.2, colour, texture: TEX.flash });
  after(0.6, seq(flash(TEX.flash, colour, 1.4, 0.4), particles({ recipe: SOUL_MOTES, count: 16, height: 0.4 })))(at, c);
};
