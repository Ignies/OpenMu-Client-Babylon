import { defineSkill } from '@/controllers/skills/define';
import { MG_EMBERS } from '../_shared';
import { MODEL, TEX } from '@/controllers/fx/recipes';
import { PlayerAction } from '../../../objects/enum';
import { emitBurst, entityGone, entityPos, type RGB } from '@/controllers/fx/core';
import { type Ribbon, type RibbonOptions } from '@/controllers/fx/ticked';
import { Step, ticks } from '@/controllers/skills/visuals';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { WEAPON_LINK_BONE, heldAt } from '../../_shared';
import { effects } from '@/controllers/fx';
import { lighting } from '@/controllers/lighting';
import { spawnLinkedModel } from '@/controllers/fx/linkedModel';

/** Flame Strike's heat glow on the blade: FlameStrike.bmd's own orange. */
const MG_FLAME_GLOW: RGB = [1, 0.45, 0.15];

/** FlameStrike.bmd's mesh 1 (flamestani, four rows): `fV = ((int)(WorldTime * 0.05) % 16 / 4) * 0.25` (ZzzEffect.cpp:9266). */
const mgFlameRow = (ms: number): number => Math.floor((Math.floor(ms * 0.05) % 16) / 4) * 0.25;
/** The blurs' sheets: `CreateObjectBlur` type 2 is motion_blur_r, type 5 Lava (ZzzEffectBlurSpark.cpp:383-397). ~105 samples at base speed. */
const MG_FLAME_BLUR: RibbonOptions = { texture: TEX.motionBlurR, maxSamples: 160 };
const MG_FLAME_LAVA: RibbonOptions = { texture: TEX.lava, maxSamples: 160 };
/** FlameStrike.bmd bones the blurs run between: Sphere04 -> Sphere02 (type 2, twice) and Sphere01 -> Sphere03 (type 5). */
const MG_FLAME_BONES = [9, 6, 8, 5];
/** The blurs sample while the owner's FLAMESTRIKE frame is inside [5, 13] (MoveHandlers.cpp:7728-7729). */
const MG_FLAME_FIRST = 5;
const MG_FLAME_LAST = 13;

/**
 * Flame Strike (236, and 492 / 494 through the aliases): MODEL_EFFECT_FLAME_STRIKE on the clip's first tick with
 * SOUND_SKILL_FLAME_STRIKE (ZzzCharacter.cpp:4754-4760; the sound is the cast's). FlameStrike.bmd hangs off the weapon
 * link bone with its rotation, its clip on the owner's frame until frame 13 (MoveHandlers.cpp:7706-7792, ZzzEffect.cpp:9248-9270):
 * both meshes bright at `Alpha`, +0.1 a tick to 1 and -0.1 a tick from LT < 20, gone below 0.1; mesh 1 steps its
 * flame rows. While the owner's frame is 5-13, ten sub-samples a tick lay three object blurs between the model's bones,
 * white: motion_blur_r twice from bone 9 to 6, Lava from 8 to 5. They live 30 ticks from their first sample, losing one
 * sample a tick, and outlive the model: the destructor's RemoveObjectBlurs misses their rand() SubTypes (ZzzEffect.cpp:110-114).
 * The frame lock waits until the clip is seen: another character's clip is applied after the packet.
 * `enh` (graded tiers) adds a heat glow and a fire light riding the blade, embers shed off the Lava edge while it
 * sweeps, and a spray of embers where the swing ends.
 */
const mgFlameStrike = (enh: boolean): Step => (at, c) => {
  const caster = c.caster;
  const blade = spawnLinkedModel(c.scene, at, { model: MODEL.flameStrike, entity: caster, bone: WEAPON_LINK_BONE, seconds: ticks(36), vStep: { mesh: 1, offset: mgFlameRow } });
  let lt = 35;
  let alpha = 0;
  let bladeLive = blade.alive;
  let seen = false;
  let done = false;
  let prevF = -1;
  let heldAt = 0;
  // The four bones this tick and last, and the sub-sample between them.
  const prev = MG_FLAME_BONES.map(() => new Vector3());
  const cur = MG_FLAME_BONES.map(() => new Vector3());
  const p = MG_FLAME_BONES.map(() => new Vector3());
  let havePrev = false;
  let blurs: Ribbon[] | null = null;
  let blurLife = 0;
  // Enhanced: the blade's middle (its first blur's bones), where the glow and the light sit.
  const glow = entityPos(caster, 1.2, new Vector3());
  const ember = new Vector3();
  const ride = enh
    ? lighting.skillFollow(c.scene, 236, out => {
        out.x = glow.x;
        out.y = glow.y;
        out.z = glow.z;
      })
    : null;
  effects.spawn('ticked', c.scene, at, {
    tick(fx) {
      if (bladeLive) {
        if ((lt < 20 && alpha < 0.1) || entityGone(caster)) {
          blade.stop();
          bladeLive = false;
        } else {
          if (lt < 20) alpha -= 0.1;
          else if (alpha < 1) alpha += 0.1;
          blade.setAlpha(alpha);
          const m = caster.modelObject;
          const inClip = !!m && m.CurrentAction === PlayerAction.PLAYER_SKILL_FLAMESTRIKE;
          const f = inClip ? m!.actionFrame() : 0;
          seen ||= inClip;
          if (!done && seen && (!inClip || f > MG_FLAME_LAST)) {
            done = true;
            blade.lock(heldAt, 0);
            if (enh) emitBurst(c.scene, MG_EMBERS, glow, 20);
          } else if (!done && inClip) {
            blade.lock(f, prevF >= 0 && f > prevF ? f - prevF : 0.69);
            heldAt = f;
            let got = true;
            for (let i = 0; i < 4; i++) got = blade.bonePos(MG_FLAME_BONES[i], cur[i]) && got;
            if (got && havePrev) {
              for (let s = 0; s < 10; s++) {
                const k = s / 10;
                const sf = prevF + (f - prevF) * k;
                if (sf < MG_FLAME_FIRST || sf > MG_FLAME_LAST) continue;
                if (!blurs) {
                  blurs = [fx.ribbon(MG_FLAME_BLUR), fx.ribbon(MG_FLAME_BLUR), fx.ribbon(MG_FLAME_LAVA)];
                  blurLife = 30;
                }
                for (let i = 0; i < 4; i++) Vector3.LerpToRef(prev[i], cur[i], k, p[i]);
                blurs[0].add(p[0].x, p[0].y, p[0].z, p[1].x, p[1].y, p[1].z);
                blurs[1].add(p[0].x, p[0].y, p[0].z, p[1].x, p[1].y, p[1].z);
                blurs[2].add(p[2].x, p[2].y, p[2].z, p[3].x, p[3].y, p[3].z);
                if (enh) emitBurst(c.scene, MG_EMBERS, Vector3.LerpToRef(p[2], p[3], Math.random(), ember), 1);
              }
            }
            if (got && enh) Vector3.LerpToRef(cur[0], cur[1], 0.5, glow);
            if (got) {
              for (let i = 0; i < 4; i++) prev[i].copyFrom(cur[i]);
              havePrev = true;
            }
            prevF = f;
          }
        }
        if (--lt <= 0 && bladeLive) {
          blade.stop();
          bladeLive = false;
        }
        if (enh && bladeLive) fx.sprite(TEX.flare, MG_FLAME_GLOW, glow.x, glow.y, glow.z, 1.6 * alpha, 1.6 * alpha, lt * 0.3, 0.3 * alpha);
        if (!bladeLive) ride?.stop();
      }
      if (blurs && blurLife > 0) {
        for (const b of blurs) b.age();
        if (--blurLife <= 0) for (const b of blurs) b.light = 0;
      }
      return bladeLive || blurLife > 0;
    },
  });
};
const flameStrike = mgFlameStrike(false);
const flameStrikeEnhanced = mgFlameStrike(true);

export default defineSkill({
  id: 236,
  name: "Flame Strike",
  // 236 Flame Strike: the blade on the weapon link bone and its three blurs (flameStrike above); caster-bound, so both dispatch paths.
  visual: { cast: flameStrike, enhanced: { cast: flameStrikeEnhanced } },
});
