/**
 * CMonkSystem::DarksideRendering (MonkSystem.cpp:697-857), one call at a time. RenderCharacter makes a call for each body
 * part it draws while the hero plays DARKSIDE_READY (ZzzCharacter.cpp:9572-9654), and each call moves everything on, so the
 * parts of one frame stand apart. A call draws the body running out to the next target (:711-763) and the afterimages
 * (CDummyUnit, :765-834, :1379-1498), and makes their waves and bursts. Positions are tiles; the original's cm are `cm()`.
 */
import { Vector3 } from '@/controllers/render/babylon/exports';
import { createAngleDeg } from '@/core/turnAngle';
import { cm } from '@/controllers/skills/visuals';

const f32 = Math.fround;

/** `DARKSIDE_TARGET_MAX`: one afterimage a target, five at most (:767). */
const DUMMIES = 5;
/** IsDistance: an afterimage fades out past 300 cm and is no longer drawn past MAX_DUMMYDISTANCE (MonkSystem.h:43). */
const FADE_OUT = cm(300);
const GONE = cm(500);
/** SetDummy: (150, 150, 0) turned 60 degrees a dummy about the target (:863-867). */
const RING = cm(150);
const RING_TURN = (60 * Math.PI) / 180;
const ALPHA_TOP = f32(0.6);
/** `m_fAniFrameSpeed`: in Chaos Castle or a changed body the afterimage runs 30 times as far a call (:1413, :1489-1493). */
const FAST = 30;

/** What a call reads: the hero, his READY key, the targets the 0x4B named, the follow-ups gone and the echo's target. */
export interface DarksideState {
  /** `pObj->Position` (vOrgPos). */
  caster: Vector3;
  /** `pObj->AnimationFrame`: the hero's DARKSIDE_READY key. */
  frame: number;
  /** Where each target named stands (`m_DarkTargetIndex`); their count is `GetDarksideEffectTotal`. */
  targets: readonly Vector3[];
  /** `m_nDarksideCnt`: the follow-ups gone since the targets came. */
  sent: number;
  /** `CharactersClient[m_sTargetIndex]`: the echo's target, null when none is known (its key matched nobody). */
  echoTarget: Vector3 | null;
  /** Chaos Castle or a changed body. */
  fast: boolean;
}

/** What a call draws and makes. The vectors are the call's own: copy them to keep them. */
export interface DarksideSink {
  /** The body running out, part `part`, turned to MU `angle` degrees, at full alpha. */
  copy(part: number, at: Vector3, angle: number): void;
  /** Afterimage `index`, part `part`, at `alpha` (drawn even at 0 or under, which shows nothing). */
  dummy(index: number, part: number, at: Vector3, angle: number, alpha: number): void;
  /** MODEL_SHOCKWAVE01 sub `sub` at `at`, the original's Angle (90, 0, `angle`), its Owner's StartPosition `from`. */
  wave(sub: 3 | 4, at: Vector3, angle: number, from: Vector3): void;
  /** A BITMAP_DAMAGE2 particle at `at`. */
  damage(at: Vector3): void;
}

/** CDummyUnit: an afterimage running from 150, 150 cm off its target through it. */
class Dummy {
  readonly start = new Vector3();
  readonly at = new Vector3();
  readonly way = new Vector3();
  /** Made where nobody stands (an echo naming no one): never drawn. */
  lost = false;
  frame = 0;
  distance = 0;
  alpha = f32(0.2);

  /** Init (:1389-1414) from SetDummy's spot (:858-871). */
  init(target: Vector3 | null, index: number): void {
    this.lost = !target;
    if (!target) return;
    const turn = RING_TURN * index;
    const c = Math.cos(turn);
    const s = Math.sin(turn);
    this.start.set(target.x + RING * (c - s), target.y, target.z + RING * (s + c));
    this.at.copyFrom(this.start);
    target.subtractToRef(this.start, this.way);
    if (this.way.lengthSquared() > 0) this.way.normalize();
    this.frame = 0;
    this.distance = 0;
    this.alpha = f32(0.2);
  }

  /** IsDistance (:1423-1457): its alpha a call, and false once it is past 500 cm. */
  near(): boolean {
    const d = Vector3.Distance(this.start, this.at);
    if (d > FADE_OUT) this.alpha = this.alpha < 0 ? 0 : f32(this.alpha - f32(0.07));
    else this.alpha = this.alpha > ALPHA_TOP ? ALPHA_TOP : f32(this.alpha + f32(0.02));
    return d <= GONE;
  }

  /** CalDummyPosition (:1479-1498): 0.7 x 0.7 cm more a call along its way; returns the frame it reports. */
  move(fast: boolean): number {
    this.distance = f32(this.distance + f32(0.7));
    this.frame = f32(this.frame + f32(0.05));
    if (this.frame >= 2) this.frame = f32(1.9);
    let step = f32(this.distance * f32(0.7));
    let frame = this.frame;
    if (fast) {
      step = f32(step * FAST);
      frame = f32(frame * FAST);
    }
    this.at.addInPlaceFromFloats(this.way.x * cm(step), this.way.y * cm(step), this.way.z * cm(step));
    return frame;
  }
}

/** One cast's DarksideRendering: the body running out (`m_fDistanceFrame`, AttCnt) and the afterimages (InitDummyCal). */
export class DarksideRendering {
  /** `m_nDarksideEffectAttCnt`: the target the body runs at. */
  private visited = 0;
  /** `m_fDistanceFrame`. */
  private step = 0;
  /** `m_bDarkSideEffOnce`, `m_bDarkSideEffOnce2`. */
  private passed = false;
  private waved = false;
  private readonly dummies = Array.from({ length: DUMMIES }, () => new Dummy());
  private made = 0;
  private readonly spot = new Vector3();
  private readonly body = new Vector3();
  private readonly way = new Vector3();

  /** InitDarksideTarget (:615-639): the targets came, or were dropped. */
  resetTargets(): void {
    this.visited = 0;
    this.step = 0;
    this.passed = false;
    this.waved = false;
  }

  /** One call, for body part `part`. */
  call(part: number, s: DarksideState, out: DarksideSink): void {
    // vPos: the caster, then the target the body runs at (:707, :723-726).
    const spot = this.spot.copyFrom(s.caster);
    if (s.targets.length > this.visited) {
      spot.copyFrom(s.targets[this.visited]);
      this.step += 1;
      const angle = this.runOut(s.caster, spot, this.step);
      if (Math.trunc(Vector3.Distance(this.body, s.caster) * 100) > 30 && !this.waved) {
        out.wave(3, this.body, angle - 180, s.caster);
        this.waved = true;
      }
      if (this.passed) {
        out.damage(spot);
        this.passed = false;
      }
      if (s.sent > this.visited) {
        this.visited++;
        this.step = 0;
        this.passed = false;
        this.waved = false;
      }
      out.copy(part, this.body, angle);
    }
    if (s.sent <= 0) return;
    if (s.frame > this.made * 2 && this.made < DUMMIES) {
      const target = s.targets.length > this.visited ? s.targets[this.visited] : s.echoTarget;
      if (target) spot.copyFrom(target);
      this.dummies[this.made].init(target, this.made);
      this.made++;
    }
    for (let i = 0; i < this.made; i++) {
      const d = this.dummies[i];
      if (!d.near() || d.lost) continue;
      const frame = Math.trunc(f32(d.move(s.fast) * 10));
      const angle = createAngleDeg(d.start.x, d.start.z, d.at.x, d.at.z);
      if (frame === 15) out.wave(4, d.at, angle - 180, d.start);
      if (frame === 10 && s.targets.length > this.visited) out.damage(spot);
      out.dummy(i, part, d.at, angle, d.alpha);
    }
  }

  /**
   * CalculateDarksideTrans (:646-695): the body `n x n x 0.05` cm from the caster toward `target`, turned to it; marks the call
   * before it passes the target. Returns the turn, MU degrees.
   */
  private runOut(caster: Vector3, target: Vector3, n: number): number {
    const reach = f32(f32(n * n) * f32(0.05));
    const next = f32(f32((n + 1) * (n + 1)) * f32(0.05));
    target.subtractToRef(caster, this.way);
    const far = this.way.length() * 100;
    // Tiles a cm along the way.
    if (far > 0) this.way.scaleInPlace(1 / far);
    this.body.copyFrom(caster).addInPlace(this.way.scaleInPlace(reach));
    if (far > reach && far < next) this.passed = true;
    return createAngleDeg(caster.x, caster.z, target.x, target.z);
  }
}
