import { defineSkill } from '@/controllers/skills/define';
import { BOMB_SPARKS, MODEL, TEX } from '@/controllers/fx/recipes';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { effects } from '@/controllers/fx';
import { entityGone, entityPos, entityYaw, type RGB, type SheetCells } from '@/controllers/fx/core';
import type { ModelHandle } from '@/controllers/fx/model';
import type { TailStrip } from '@/controllers/fx/ticked';
import { cm, particles, perTick, ticks, type SkillContext, type Step } from '@/controllers/skills/visuals';
import { playCombat } from '@/controllers/sound';
import { DEG, bodyLight, deg, groundY, randInt, terrainLevel, whenClipKey } from '../../_shared';
import { clipSpeed, eachMove } from '../_shared';

import { A } from '@/controllers/combat/recipes';

/**
 * MODEL_DOWN_ATTACK_DUMMY_R (down_left_punch.bmd) and _L (down_right_punch.bmd, ZzzOpenData.cpp:4622-4625): a flare on bone 1
 * swung by bone 0, whose place at each key (cm, MU axes) these are; the blow on its key 3 (R) or 5 (L), gone on its key 6 or 8
 * (MoveHandlers.cpp:9221-9309).
 */
interface Punch {
  model: string;
  keys: readonly (readonly [number, number, number])[];
  hit: number;
  end: number;
}
const PUNCH_R: Punch = {
  model: 'Effect/down_left_punch.glb',
  keys: [[-101.461, 7.703, 58.546], [-101.461, 7.703, 58.546], [-43.556, -127.131, 59.235], [20.906, -131.612, 134.3], [47.187, -89.596, 191.299], [50.498, -40.189, 181.844], [13.461, 20.62, 224.077], [15.286, -18.851, 239.405], [17.111, -59.154, 244.32]],
  hit: 3,
  end: 6,
};
const PUNCH_L: Punch = {
  model: 'Effect/down_right_punch.glb',
  keys: [[47, 19.159, 192.224], [47, 19.159, 192.224], [20.941, -148.803, 138.804], [-47.762, -108.408, 79.672], [-77.08, -56.248, 54.131], [-62.421, -14.191, 57.403], [-47.762, 8.398, 60.675], [-47.762, 8.398, 60.675]],
  hit: 5,
  end: 8,
};
/** A dummy's Scale: CreateEffect's 0.9 when none is given (ZzzEffect.cpp:363-366). */
const PUNCH_SCALE = 0.9;
/** Its LifeTime, 40 once it has hit (ZzzEffect.cpp:5868, MoveHandlers.cpp:9240). */
const PUNCH_LIFE = 100;

/** BITMAP_FORCEPILLAR (ZzzEffectJoint.cpp:2709-2717): force_Pillar on its flat face, Scale 50 cm wide, Light (0.95, 0.72, 0.48), MaxTails 5. */
const PILLAR_JOINT = { texture: TEX.forcePillar, colour: [0.95, 0.72, 0.48] as const, maxTails: 5, faces: 'flat' as const, maxSegment: cm(60), batch: 8 };
const PILLAR_HALF = cm(50 / 2);
/** Its LifeTime 7: a tail a move, gone on the 8th or with its dummy (ZzzEffectJoint.cpp:6874-6884). */
const PILLAR_MOVES = 7;
/** BITMAP_FLARE at bone 0 a move: Flare 64 px x Scale 5 in (0.47, 0.36, 0.24) (MoveHandlers.cpp:9251-9254). */
const FLARE_LIGHT: RGB = [0.47, 0.36, 0.24];
const FLARE_SIZE = cm(64 * 5);

/** BITMAP_SUMMON_SAHAMUTT_EXPLOSION: loungexflow's 4x4 cells, one a tick over its 16 ticks (ZzzEffectParticle.cpp:2486-2489, :4272). */
const BLAST_CELLS: SheetCells = { w: 64, h: 64, count: 16 };
/** CreateBomb3's stones (ZzzEffect.cpp:6412-6420): MODEL_STONE1/2 sub14 in (1, 0.6, 0.2). */
const STONE_LIGHT: RGB = [1, 0.6, 0.2];

/** A dummy: its AnimationFrame and PriorAnimationFrame as PlayAnimation steps them at `v` keys a move (ZzzBMD.cpp:738-800). */
interface Dummy {
  punch: Punch;
  v: number;
  frame: number;
  prior: number;
  life: number;
  joints: { strip: TailStrip; yaw: number; moves: number }[];
}
const dummy = (punch: Punch, v: number): Dummy => ({ punch, v: Math.fround(v), frame: 0, prior: 0, life: PUNCH_LIFE, joints: [] });

/** PlayAnimation's float step, and its stop on the last key: AnimationFrame = NumAnimationKeys (ZzzEffect.cpp:8519-8524). */
function step(d: Dummy): void {
  const before = Math.floor(d.frame);
  d.frame = Math.fround(d.frame + d.v);
  if (Math.floor(d.frame) !== before) d.prior = before;
  if (d.frame >= d.punch.keys.length) d.frame = d.punch.keys.length;
}

/** The moves a dummy lives at `v` keys a move: it goes on the move it sees its last key (MoveHandlers.cpp:9230, :9275). */
function punchMoves(p: Punch, v: number): number {
  const d = dummy(p, v);
  let k = 1;
  while (d.frame < p.end) {
    step(d);
    k++;
  }
  return k;
}

/**
 * Bone 0 at `frame`, its prior key blended into the frame's key (BMD::Animation, ZzzBMD.cpp:134-160: a key past the last reads
 * key 0), turned by the dummy's Angle (the caster's) and scaled by its BodyScale (TransformByObjectBone, ZzzBMD.cpp:643-679).
 */
function bone0(d: Dummy, yaw: number, feet: Vector3, out: Vector3): Vector3 {
  const keys = d.punch.keys;
  const whole = Math.floor(d.frame);
  const s = d.frame - whole;
  const a = keys[d.prior < keys.length ? d.prior : 0];
  const b = keys[whole < keys.length ? whole : 0];
  const x = a[0] * (1 - s) + b[0] * s;
  const y = a[1] * (1 - s) + b[1] * s;
  const z = a[2] * (1 - s) + b[2] * s;
  const c = Math.cos(yaw * DEG);
  const n = Math.sin(yaw * DEG);
  return out.set(feet.x + cm(PUNCH_SCALE * (x * c - y * n)), feet.y + cm(PUNCH_SCALE * z), feet.z + cm(PUNCH_SCALE * (x * n + y * c)));
}

/** A dummy's mesh at the caster, drawn bright in its BodyLight (ZzzObject.cpp:2504-2507, :212-240), its clip at its Velocity. */
function punchModel(c: SkillContext, p: Punch, v: number): void {
  const feet = entityPos(c.caster, 0, new Vector3());
  const level = terrainLevel(feet.x, feet.z);
  effects.spawn('model', c.scene, feet, {
    model: p.model,
    seconds: ticks(punchMoves(p, v)),
    scale: PUNCH_SCALE,
    keysPerTick: v,
    loop: false,
    angle: [0, 0, deg(entityYaw(c.caster))],
    colour: bodyLight(feet, [level, level, level]),
    fadeTail: 0,
    follow: out => entityPos(c.caster, 0, out),
  });
}

/** A MODEL_STONE1/2 sub14 in flight (ZzzEffect.cpp:2700-2716, :7278-7300). */
interface Stone {
  handle: ModelHandle;
  pos: Vector3;
  vx: number;
  vy: number;
  vz: number;
  gravity: number;
  angle: [number, number, number];
  alpha: number;
  life: number;
}

/**
 * CreateBomb3(target, 3, 0.9) (ZzzEffect.cpp:6373-6433): two BITMAP_SUMMON_SAHAMUTT_EXPLOSION, Scale 0.9, -40..49 cm about the
 * target and 70-169 cm up; at the last of them BITMAP_MAGIC+1 in (1, 0.5, 0.2) at Scale 2.2 x 0.9 (+0.048-0.079, growing 0.1 and
 * keeping 0.9 of its Light a move, ZzzEffectParticle.cpp:928-932, :4138-4144), three stones thrown at Scale 2.2 x 0.9 and twenty
 * BITMAP_SPARK sub2. The particles share an Angle (150-209, 0, 0-29).
 */
function bomb(c: SkillContext, target: Vector3, stones: Stone[]): void {
  const pitch = randInt(60) + 150;
  const at = new Vector3();
  for (let i = 0; i < 2; i++) {
    at.set(target.x + cm(randInt(90) - 40), target.y + cm(randInt(100) + 70), target.z + cm(randInt(90) - 40));
    effects.spawn('sprite', c.scene, at.clone(), { texture: TEX.sahamuttBlast, cells: BLAST_CELLS, size: cm(256) * 0.9, seconds: ticks(16), fadeTail: 0 });
  }
  const scale = 2.2 * 0.9;
  effects.spawn('sprite', c.scene, at.clone(), { texture: TEX.magicGround2, colour: [1, 0.5, 0.2], size: cm(128) * (scale + (randInt(32) + 48) * 0.001), scaleRate: perTick(12.8), decay: 0.9, seconds: ticks(10), fadeTail: 0 });
  for (let i = 0; i < 3; i++) stones.push(stone(c, at, pitch, scale));
  particles({ recipe: BOMB_SPARKS, count: 20 })(at, c);
}

/**
 * One stone: LifeTime 20-35, Scale (0.24-1.2) x `scale`, Gravity 3-5 cm; its Angle the bomb's with a random turn, along which
 * (0, 6.4-19.1, 0) is thrown, 15 cm a move more upward (ZzzEffect.cpp:2700-2716).
 */
function stone(c: SkillContext, from: Vector3, pitch: number, scale: number): Stone {
  const life = randInt(16) + 20;
  const size = (randInt(13) + 3) * 0.08 * scale;
  const gravity = randInt(3) + 3;
  const turn = randInt(360);
  const speed = (randInt(128) + 64) * 0.1;
  // (0, v, 0) turned by AngleMatrix(pitch, 0, turn): MU (-v cos p sin t, v cos p cos t, v sin p).
  const p = pitch * DEG;
  const t = turn * DEG;
  const pos = from.clone();
  const angle: [number, number, number] = [pitch, 0, turn];
  const s: Stone = {
    pos,
    vx: cm(-speed * Math.cos(p) * Math.sin(t)),
    vz: cm(speed * Math.cos(p) * Math.cos(t)),
    vy: cm(speed * Math.sin(p) + 15),
    gravity: cm(gravity),
    angle,
    alpha: 1,
    life,
    handle: effects.spawn('model', c.scene, pos, { model: randInt(2) ? MODEL.stone2 : MODEL.stone, seconds: ticks(life), scale: size, colour: STONE_LIGHT, angle, blendMesh: -1, loop: false, fadeTail: 0, follow: out => out.copyFrom(pos) }) as ModelHandle,
  };
  return s;
}

/** One move (ZzzEffect.cpp:7278-7300): it falls, tumbles 0.5 x LifeTime a move, and on the ground slows, bounces and fades. */
function moveStone(s: Stone): boolean {
  if (--s.life < 0) return false;
  s.vy -= s.gravity;
  s.pos.x += s.vx;
  s.pos.y += s.vy;
  s.pos.z += s.vz;
  s.angle[0] += 0.5 * s.life;
  s.angle[1] += 0.5 * s.life;
  const ground = groundY(s.pos.x, s.pos.z);
  if (s.pos.y <= ground) {
    s.pos.y = ground;
    s.vx *= 0.6;
    s.vz *= 0.6;
    s.vy += cm(s.life);
    if (s.vy < cm(0.5)) s.vy = 0;
    s.alpha -= 0.1;
  }
  s.handle.setAngle(s.angle);
  s.handle.setAlpha(s.alpha);
  return s.alpha > 0;
}

/**
 * RageCreateEffect: Rage_Stamp and MODEL_DOWN_ATTACK_DUMMY_R at its Velocity, 2 x the caster's STAMP PlaySpeed, read a tick in
 * once the clip is on (MonkSystem.cpp:1107-1119, ZzzEffect.cpp:5864-5872). Each dummy move (MoveHandlers.cpp:9221-9309): R on its
 * key 6 goes and makes _L; on its blow key the blow on the target, CreateBomb3 and Rage_Stamp_Att, but with no target it returns
 * there and every move after; else a FORCEPILLAR joint and a flare at its bone 0, the caster's Angle and place. Its joints ride
 * bone 0 as the dummy stands after its move (MoveJoints) and go with it.
 */
const downAttack: Step = (_at, c) => {
  const p = c.caster.transform?.pos;
  if (p) playCombat('Sound/Ragefighter/Rage_Stamp', { x: p.x, z: p.z });
  punchModel(c, PUNCH_R, 2 * clipSpeed(c, A.PLAYER_SKILL_STAMP));
  // Undefined until R's first move reads its Velocity; null once L is gone.
  let d: Dummy | null | undefined;
  const stones: Stone[] = [];
  const feet = entityPos(c.caster, 0, new Vector3());
  const at = new Vector3();
  const aim = new Vector3();
  eachMove(c.scene, feet.clone(), (_m, fx) => {
    for (let i = stones.length - 1; i >= 0; i--) {
      if (moveStone(stones[i])) continue;
      stones[i].handle.stop();
      stones[i] = stones[stones.length - 1];
      stones.pop();
    }
    if (d === undefined) d = dummy(PUNCH_R, 2 * clipSpeed(c, A.PLAYER_SKILL_STAMP));
    if (!d) return stones.length > 0;
    const self = d;
    const gone = entityGone(c.caster);
    const yaw = deg(entityYaw(c.caster));
    let next: Dummy | null = self;
    if (self.frame >= self.punch.end || gone) {
      next = null;
      if (self.punch === PUNCH_R && !gone) {
        const v = 2 * clipSpeed(c, A.PLAYER_SKILL_STAMP);
        next = dummy(PUNCH_L, v);
        punchModel(c, PUNCH_L, v);
      }
    }
    const target = c.target && !entityGone(c.target) ? c.target : null;
    let held = false;
    if (self.frame >= self.punch.hit && self.life > 50) {
      if (!target) held = true;
      else {
        bomb(c, entityPos(target, 0, aim), stones);
        if (p) playCombat('Sound/Ragefighter/Rage_Stamp_Att', { x: p.x, z: p.z });
        self.life = 40;
      }
    }
    if (!held && !gone) {
      entityPos(c.caster, 0, feet);
      self.joints.push({ strip: fx.strip(PILLAR_JOINT), yaw: entityYaw(c.caster), moves: 0 });
      bone0(self, yaw, feet, at);
      fx.sprite(TEX.flareBig, FLARE_LIGHT, at.x, at.y, at.z, FLARE_SIZE, FLARE_SIZE, 0);
    }
    step(self);
    if (--self.life <= 0 && next === self) next = null;
    // MoveJoints: each rides bone 0 as the dummy stands after its move, or goes with it.
    bone0(self, yaw, feet, at);
    for (let i = self.joints.length - 1; i >= 0; i--) {
      const j = self.joints[i];
      if (next !== self || ++j.moves > PILLAR_MOVES) {
        fx.drop(self.joints.splice(i, 1)[0].strip);
        continue;
      }
      j.strip.push(at.x, at.y, at.z, PILLAR_HALF, j.yaw, 0);
    }
    d = next;
    return d !== null || stones.length > 0;
  });
};

/**
 * Another caster's effect comes with the packet (WSclient.cpp:13404-13418); the hero's own waits for STAMP key 2
 * and is lost if the clip is left first (SkillCast.cpp:1104-1115, :1131-1136).
 */
const uppercut: Step = (at, c) => {
  if (c.caster.localPlayer) whenClipKey(A.PLAYER_SKILL_STAMP, 2, 14, downAttack, false, 'drop')(at, c);
  else downAttack(at, c);
};

export default defineSkill({
  id: 261,
  name: "Beast Uppercut",
  // Master numbers with no row of their own that draw as this skill (SKILL_REPLACEMENTS).
  lookAliases: [552, 555],
  // 261 Beast Uppercut: the two punch dummies, their pillars and flares, and CreateBomb3 on each blow; see downAttack.
  // Rage_Stamp is the effect's (MonkSystem.cpp:1117), so it plays with it rather than at the click; see uppercut.
  visual: { impact: uppercut },
  clip: { ground: A.PLAYER_SKILL_STAMP }, // Beast Uppercut
  stepIn: 'midClip',
});
