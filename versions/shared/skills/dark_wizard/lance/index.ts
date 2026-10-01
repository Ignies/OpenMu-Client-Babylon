import { defineSkill } from '@/controllers/skills/define';
import { DW1_RELEASE, placeBodyLight, releaseSound } from '../_shared';
import { type Entity } from '@/ecs/world';
import { LANCE_PUFF, LANCE_SPARKS, LANCE_STRIKE, MODEL, TEX } from '@/controllers/fx/recipes';
import { spawnModel, type ModelHandle } from '@/controllers/fx/model';
import { delay, entityGone, entityPos, entityYaw, fxNow, type ParticleRecipe, type PointSource, type RGB } from '@/controllers/fx/core';
import { type ParticlesOptions } from '@/controllers/fx/particles';
import { SkillContext, Step, TICK, cm, particles, seq, sprite, ticks } from '@/controllers/skills/visuals';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { deg, humTurn, lit, rad } from '../../_shared';
import { effects } from '@/controllers/fx';
import { lighting } from '@/controllers/lighting';

const LANCE_TICKS = 35;
const LANCE_TINT: RGB = [1, 0.6, 0.3];
const LANCE_PUFF_ONE: ParticlesOptions = { recipe: LANCE_PUFF, count: 1 };

/** What the graded tiers add to a Lance star: sparks shed in flight, and a step run where it first strikes home. */
interface LanceLook {
  sparks: ParticleRecipe;
  strike: Step;
}
const LANCE_SPARK_RATE = 40;

/** MODEL_SKILL_JAVELIN's `BlendMeshLight = LifeTime / 10` (MoveHandlers.cpp:7108), on its pyochang_R glow. */
const lanceBlend = (t: number): number => (LANCE_TICKS - Math.floor(t / TICK)) / 10;

/** One Lance star's drawn state at a tick. */
interface LanceFrame {
  p: Vector3;
  angle: number;
  scale: number;
}

/**
 * One MODEL_SKILL_JAVELIN, sub 0/1/2 (ZzzEffect.cpp:4232-4247; Move_MODEL_SKILL_JAVELIN, MoveHandlers.cpp:7053-7124):
 * from the caster +150 cm heading its facing -Ang / 0 / +Ang (Ang 10-89 deg per star), LT 35, Scale 1.2 +0.015 a
 * tick. For 10 ticks it drifts 5 cm a tick while its spin speeds up by 10 deg a tick; then the speed ramps 8 cm a
 * tick to 53, the spin is re-rolled 30-59 deg a tick and the turn rate grows 1.5 deg a tick from 10. From LT 20 it
 * homes in yaw and pitch on the target +150 cm (MoveHumming, ZzzAI.cpp:135-146); within 100 cm it snaps there and
 * swells (+0.04), shedding a BITMAP_POUNDING_BALL each tick in flight and every third stuck, and still steps off
 * each tick. Sub 1 / 2 ride the goal's height +-30 sin(LT * 0.1) from the first tick. The body is the tinted
 * (1, 0.6, 0.3) textured pass with an additive Chrome01 pass over mesh 0 (ZzzObject.cpp:1571-1576), all fading
 * over the last 10 ticks (`Alpha = LT/10`), and it carries the orange range-2 light.
 */
function lanceStar(c: SkillContext, target: Entity, sub: number, look?: LanceLook): void {
  // Heading and pitch in degrees, as humTurn steps them.
  const spread = 10 + Math.floor(Math.random() * 80);
  let head = deg(entityYaw(c.caster)) + (sub - 1) * spread;
  let pitch = 0;
  let speed = 5;
  let turn = 10;
  let spin = 2;
  let lt = LANCE_TICKS;
  let angle = entityYaw(c.caster);
  let scale = 1.2;
  let struck = false;
  const goal = entityPos(target, 1.5, new Vector3());
  const pos = entityPos(c.caster, 1.5, new Vector3());
  const move = (): void => {
    const d = cm(speed);
    const h = rad(head);
    const v = rad(pitch);
    pos.x += Math.sin(h) * Math.cos(v) * d;
    pos.y += Math.sin(v) * d;
    pos.z -= Math.cos(h) * Math.cos(v) * d;
  };
  const step = (into: LanceFrame): void => {
    if (!entityGone(target)) entityPos(target, 1.5, goal);
    scale += 0.015;
    if (lt < 25) {
      if (lt < 20) {
        const dx = goal.x - pos.x;
        const dy = goal.y - pos.y;
        const dz = goal.z - pos.z;
        const flat = Math.hypot(dx, dz);
        head = humTurn(head, flat > 1e-6 ? deg(Math.atan2(dx, -dz)) : 0, turn);
        pitch = humTurn(pitch, deg(Math.atan2(dy, flat)), turn);
        if (Math.hypot(flat, dy) < 1) {
          pos.copyFrom(goal);
          scale += 0.04;
          if (look && !struck) {
            struck = true;
            // Computed a tick before it is drawn.
            const at = goal.clone();
            delay(TICK, () => look.strike(at, c));
          }
          if (lt % 3 === 0) effects.spawn('particles', c.scene, pos, LANCE_PUFF_ONE);
        } else effects.spawn('particles', c.scene, pos, LANCE_PUFF_ONE);
      }
      turn += 1.5;
      move();
      spin = 30 + Math.floor(Math.random() * 30);
      if (speed < 50) speed += 8;
    } else {
      spin += 10;
      move();
    }
    angle += rad(spin);
    const bob = 0.3 * Math.sin(lt * 0.1);
    if (sub === 1) pos.y = goal.y + bob;
    else if (sub === 2) pos.y = goal.y - bob;
    lt--;
    into.p.copyFrom(pos);
    into.angle = angle;
    into.scale = scale;
  };

  // Drawn between tick n and tick n + 1.
  const a: LanceFrame = { p: new Vector3(), angle: 0, scale: 0 };
  const b: LanceFrame = { p: new Vector3(), angle: 0, scale: 0 };
  step(a);
  step(b);
  let n = 0;
  const t0 = fxNow();
  const facingDir = new Vector3();
  let handle: ModelHandle | null = null;
  const source: PointSource = out => {
    const k = (fxNow() - t0) / TICK;
    while (n + 1 <= k && lt > 0) {
      a.p.copyFrom(b.p);
      a.angle = b.angle;
      a.scale = b.scale;
      step(b);
      n++;
    }
    const w = Math.min(1, k - n);
    Vector3.LerpToRef(a.p, b.p, w, out);
    const yaw = a.angle + (b.angle - a.angle) * w;
    handle?.yawTo(facingDir.set(Math.sin(yaw), 0, Math.cos(yaw)));
    handle?.scaleTo(a.scale + (b.scale - a.scale) * w);
    return out;
  };
  handle = spawnModel(c.scene, a.p, {
    model: MODEL.javelin,
    follow: source,
    seconds: ticks(LANCE_TICKS),
    scale: 1.2,
    colour: LANCE_TINT,
    blendMesh: 1,
    blendLight: lanceBlend,
    blendClamp: true,
    solidFade: true,
    fadeTail: 10 / LANCE_TICKS,
    shine: { mesh: 0, colour: LANCE_TINT },
  });
  if (look) effects.spawn('particles', c.scene, a.p, { recipe: look.sparks, rate: LANCE_SPARK_RATE, seconds: ticks(LANCE_TICKS - 10), follow: source });
  const lit = new Vector3();
  lighting.skillLand(c.scene, 45, a.p, out => {
    source(lit);
    out.x = lit.x;
    out.y = lit.y;
    out.z = lit.z;
  });
}

/**
 * 45 Lance (ZzzCharacter.cpp:5011-5017): at the release, three MODEL_SKILL_JAVELIN at the target and
 * SOUND_BCS_JAVELIN. The original loads that sound only in Battle Castle (MapManager.cpp:251-278), so it is
 * silent elsewhere; it plays on every map here.
 */
const lance = (look?: LanceLook): Step => (_at, c) => {
  delay(DW1_RELEASE, () => {
    if (entityGone(c.caster) || !c.target || entityGone(c.target)) return;
    for (let sub = 0; sub < 3; sub++) lanceStar(c, c.target, sub, look);
    releaseSound('Sound/battlecastle/sCShockWave')(_at, c);
  });
};

/** Lance on the graded tiers: each star sheds sparks in flight and strikes home in a spray, a flash and a light. */
const LANCE_LOOK: LanceLook = {
  sparks: LANCE_SPARKS,
  strike: seq(
    particles({ recipe: LANCE_STRIKE, count: 12 }),
    sprite({ texture: TEX.flare, colour: [1, 0.62, 0.3], size: 1.1, seconds: 0.2, growFrom: 0.5, grow: 1.3, fadeTail: 0.7 }),
    placeBodyLight(45, 'strike')
  ),
};

export default defineSkill({
  id: 45,
  name: "Lance",
  // 45 Lance: at the release, three MODEL_SKILL_JAVELIN fan out, spin up and home on the target 150 cm up (lance).
  // Enhanced: sparks shed in flight and a spray where each star strikes home.
  visual: { impact: lance(), enhanced: { impact: lance(LANCE_LOOK) } },
});
