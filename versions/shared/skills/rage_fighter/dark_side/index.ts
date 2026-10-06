import { defineSkill } from '@/controllers/skills/define';
import { darkSideCast, beginDarkSide, isDarkSide, observeDarkSideEcho, observeDarkSideTargets, observeRageHit, rageLayer, rageStreak } from './rage';
import { DarksideRendering, type DarksideSink, type DarksideState } from './rendering';
import { MODEL, RGBS, TEX } from '@/controllers/fx/recipes';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { effects } from '@/controllers/fx';
import type { AfterimageHandle } from '@/controllers/fx/afterimage';
import { WHITE, entityGone, entityPos, fxNow } from '@/controllers/fx/core';
import type { TickedFx } from '@/controllers/fx/ticked';
import { cm, seq, ticks, type SkillContext, type Step } from '@/controllers/skills/visuals';
import { inChaosCastle } from '@/controllers/actors/locomotion';
import type { PlayerObject } from '@/controllers/actors/playerObject';
import type { ModelObject } from '@/controllers/render/modelObject';
import { Ecs } from '@/ecs/current';
import type { Entity } from '@/ecs/world';

import { A } from '@/controllers/combat/recipes';
import { currentMap, groundY, movesAt, randInt } from '../../_shared';
import { clipSpeed, eachMove, eventCloud, magicGround13, windForce } from '../_shared';

/** RageCreateEffect's MODEL_WINDFOCE sub2 (1, 0.5, 0.2) and the sub3s (1, 0.5, 0) it raises (MonkSystem.cpp:1297-1298, MoveHandlers.cpp:9579-9596). */
const windPillar = windForce([1, 0.5, 0.2], true, [1, 0.5, 0]);

/** Helms that leave the head on (MODEL_HELM + these), so BODYPART_HEAD is drawn too (SetCharacterScale, ZzzCharacter.cpp:12114-12128). */
const OPEN_HELMS: ReadonlySet<number> = new Set([0, 2, 10, 11, 12, 13, 63, 65, 68, 70]);

/**
 * Skins whose SubType takes the Rage Fighter branch, one part and bChange (ZzzCharacter.cpp:9347-9350, MonkSystem.cpp:786-792):
 * MODEL_SKELETON1, _SKELETON_PCBANG, _HALLOWEEN, _XMAS_EVENT_CHANGE_GIRL, _PANDA, _SKELETON_CHANGED (ZzzCharacter.cpp:14183-14243, :14787-14799).
 */
const CHANGED_SKINS: ReadonlySet<number> = new Set([14, 372, 373, 374, 503, 548]);

/**
 * The parts RenderCharacter calls DarksideRendering for, in its order, or null for none: a changed body's one part (on Armor),
 * the Angel alone in Chaos Castle (:9536-9568), else boots to helm and the head under an open helm (:9572-9654); ours always
 * keeps the head (Helm) and puts a worn helm on HelmMask.
 */
function drawnParts(hero: Entity, body: PlayerObject): ModelObject[] | null {
  if (hero.skin) return CHANGED_SKINS.has(hero.skin) ? [body.Armor] : null;
  if (inChaosCastle(currentMap() ?? -1)) return [body.Armor];
  const helm = hero.charAppearance?.helm;
  const parts = [body.Boots, body.Gloves, body.Pants, body.Armor, helm ? body.HelmMask : body.Helm];
  if (helm && OPEN_HELMS.has(helm.num)) parts.push(body.Helm);
  return parts;
}

/** An afterimage outlives no cast: the READY clip runs about 45 ticks. */
const COPY_SECONDS = 10;

/**
 * MODEL_SHOCKWAVE01 sub3 (the body's, Light 1) or sub4 (an afterimage's, Light 0.2), Scale 0.8, at (90, 0, `angle`): its
 * StartPosition is 30 cm along the line from its Owner's StartPosition `from` to it, ground to ground, and it starts 150 cm on
 * (ZzzEffect.cpp:5895-5930). Each move Scale x1.15 and it backs off by StartPosition, x0.99 a move (sub3) or x1.04; Light x0.7
 * (sub3) or x1.5 until past 0.6, when it turns sub5 and keeps 0.5 a move; 180 + Scale x 80 cm above sea level (sub3), else
 * 160 + Scale x 10 (MoveHandlers.cpp:9397-9425). Drawn on Damage2, sub3 twice (ZzzObject.cpp:2475-2485). It lives
 * 5 / (2 x READY PlaySpeed) ticks (sub3) or 12.
 */
function darkWave(c: SkillContext, sub: 3 | 4, at: Vector3, angle: number, from: Vector3): void {
  const life = sub === 3 ? Math.ceil(5 / (2 * clipSpeed(c, A.PLAYER_SKILL_DARKSIDE_READY))) : 12;
  const back = new Vector3(at.x - from.x, groundY(at.x, at.z) - groundY(from.x, from.z), at.z - from.z);
  if (back.lengthSquared() > 0) back.normalize().scaleInPlace(cm(30));
  const p = at.add(back.scale(5));
  const points: Vector3[] = [p.clone()];
  const scales = [0.8];
  const lights = [sub === 3 ? 1 : 0.2];
  let kind: number = sub;
  for (let m = 1; m < life; m++) {
    const scale = scales[m - 1] * 1.15;
    back.scaleInPlace(kind === 3 ? 0.99 : 1.04);
    p.subtractInPlace(back);
    let light = lights[m - 1];
    if (kind === 5) light *= 0.5;
    else {
      light *= kind === 3 ? 0.7 : 1.5;
      if (light > 0.6) kind = 5;
    }
    p.y = cm(sub === 3 && m === 1 ? 180 + scale * 80 : 160 + scale * 10);
    points.push(p.clone());
    scales.push(scale);
    lights.push(light);
  }
  const t0 = fxNow();
  const move = (t: number): number => Math.min(movesAt(t), life - 1);
  for (let pass = 0; pass < (sub === 3 ? 2 : 1); pass++) {
    effects.spawn('model', c.scene, points[0].clone(), {
      model: MODEL.shockwave,
      // Only its first draw is sub3's, twice; from its first move it is sub5.
      seconds: ticks(pass === 0 ? life : 1),
      angle: [90, 0, angle],
      colour: WHITE,
      texture: TEX.damage2,
      scaleAt: t => scales[move(t)],
      follow: out => out.copyFrom(points[move(fxNow() - t0)]),
      blendMesh: 0,
      blendLight: t => lights[move(t)],
      blendClamp: true,
      fadeTail: 0,
    });
  }
}

/** A BITMAP_DAMAGE2 particle in flight. */
interface Burst {
  x: number;
  y: number;
  z: number;
  scale: number;
  light: number;
  life: number;
}

/** BITMAP_DAMAGE2 sub0 (ZzzEffectParticle.cpp:3826-3831): LifeTime 15, Scale 0.9 + 0.2 or 0.3, 80-99 cm over its spot. */
const burstAt = (at: Vector3): Burst => ({ x: at.x, y: at.y + cm(80 + randInt(20)), z: at.z, scale: 0.9 + (randInt(2) + 2) * 0.1, light: 1, life: 15 });

/** One move (ZzzEffectParticle.cpp:8888-8892): Scale x1.2, Light x0.55; false once its LifeTime is out. */
function moveBurst(b: Burst): boolean {
  if (--b.life <= 0) return false;
  b.scale *= 1.2;
  b.light *= 0.55;
  return true;
}

/** Drawn at Light x 1.4, Damage2's 128 px x Scale (ZzzEffectParticle.cpp:8996, :9332-9338). */
const drawBurst = (fx: TickedFx, b: Burst): void => fx.sprite(TEX.damage2, RGBS.white, b.x, b.y, b.z, cm(128 * b.scale), cm(128 * b.scale), 0, Math.min(1, 1.4 * b.light));

/** The hero's running afterimages: a new cast drops the last one's (InitDummyCal, MonkSystem.cpp:1300). */
let running: (() => void) | null = null;

/**
 * DarksideRendering (MonkSystem.cpp:697-857) for the hero's cast: the CMonkSystem it reads is his own, so other casters draw
 * none. Each tick he plays DARKSIDE_READY, one call a body part he draws (rendering.ts): the body running out to the next
 * target, the afterimages, their waves and BITMAP_DAMAGE2 bursts. Ends when he leaves the clip; the bursts burn out.
 */
const afterimages: Step = (at, c) => {
  const hero = c.caster;
  const body = hero.modelObject as PlayerObject | undefined;
  const parts = hero.localPlayer && body ? drawnParts(hero, body) : null;
  if (!body || !parts) return;
  running?.();
  const copyOf = (): AfterimageHandle =>
    effects.spawn('afterimage', c.scene, at, { body, parts, clip: A.PLAYER_SKILL_DARKSIDE_ATTACK, seconds: COPY_SECONDS }) as AfterimageHandle;
  const runner = copyOf();
  const dummies: (AfterimageHandle | null)[] = [null, null, null, null, null];
  const rendering = new DarksideRendering();
  const spots: Vector3[] = [];
  const targets: Vector3[] = [];
  const echo = c.target ? entityPos(c.target, 0, new Vector3()) : null;
  const s: DarksideState = { caster: new Vector3(), frame: 0, targets, sent: 0, echoTarget: echo, fast: false };
  const bursts: Burst[] = [];
  const sink: DarksideSink = {
    copy: (part, p, angle) => runner.place(part, p, angle, 1),
    dummy: (i, part, p, angle, alpha) => (dummies[i] ??= copyOf()).place(part, p, angle, alpha),
    wave: (sub, p, angle, from) => darkWave(c, sub, p, angle, from),
    damage: p => bursts.push(burstAt(p)),
  };
  let serial = darkSideCast.serial;
  let drawing = true;
  const stop = (): void => {
    drawing = false;
    runner.stop();
    for (const d of dummies) d?.stop();
  };
  running = stop;
  eachMove(c.scene, at, (_m, fx) => {
    let n = 0;
    for (const b of bursts) if (moveBurst(b)) bursts[n++] = b;
    bursts.length = n;
    const m = hero.modelObject;
    if (drawing && (entityGone(hero) || m?.CurrentAction !== A.PLAYER_SKILL_DARKSIDE_READY)) stop();
    if (drawing && m) {
      runner.hide();
      for (const d of dummies) d?.hide();
      readState(hero, m.actionFrame(), spots, s);
      if (serial !== darkSideCast.serial) {
        serial = darkSideCast.serial;
        rendering.resetTargets();
      }
      for (let part = 0; part < runner.parts; part++) rendering.call(part, s, sink);
    }
    for (const b of bursts) drawBurst(fx, b);
    return drawing || bursts.length > 0;
  });
};

/** The call's view of the world this tick; a target out of view keeps where it was last seen. */
function readState(hero: Entity, frame: number, spots: Vector3[], s: DarksideState): void {
  entityPos(hero, 0, s.caster);
  s.frame = frame;
  s.sent = darkSideCast.sent;
  // m_fAniFrameSpeed: a changed body (bChange, the only skins drawnParts lets through) or Chaos Castle.
  s.fast = !!hero.skin || inChaosCastle(currentMap() ?? -1);
  const ids = darkSideCast.targets;
  const targets = s.targets as Vector3[];
  targets.length = 0;
  for (let i = 0; i < ids.length; i++) {
    const spot = (spots[i] ??= s.caster.clone());
    const e = Ecs.world?.getByNetId(ids[i]);
    if (e && !entityGone(e)) entityPos(e, 0, spot);
    targets.push(spot);
  }
}

export default defineSkill({
  id: 263,
  name: "Dark Side",
  // Master numbers with no row of their own that draw as this skill (SKILL_REPLACEMENTS).
  lookAliases: [559],
  // 263 Dark Side: RageCreateEffect at the caster, once a cast (MonkSystem.cpp:1281-1298): BITMAP_EVENT_CLOUD sub1, BITMAP_MAGIC
  // sub14 and the wind pillar; for the hero, DarksideRendering's body running out and afterimages (see above).
  visual: {
    cast: seq(eventCloud([1, 0.6, 0.6], 5), magicGround13([1, 0.4, 0]), windPillar, afterimages),
  },
  sound: 'Sound/Ragefighter/Rage_Darkside', // Dark Side
  clip: { ground: A.PLAYER_SKILL_DARKSIDE_READY }, // Dark Side
  // Dark Side follow-ups and the Rage streak (rage.ts).
  combat: {
    layer: rageLayer,
    hooks: {
      darkSide: {
        isDarkSide,
        begin: beginDarkSide,
        observeTargets: observeDarkSideTargets,
        observeEcho: observeDarkSideEcho,
        observeRageHit,
        streak: rageStreak,
      },
    },
  },
});
