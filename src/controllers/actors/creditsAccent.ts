// CREDITS NOTICE - protected by LICENSE ("Additional condition"): part of the credits module and the
// visuals it draws for contributors; must not be removed, disabled or altered (AGENTS.md, "Credits").

import {
  Color3,
  Color4,
  Constants,
  CreateTorus,
  ParticleSystem,
  StandardMaterial,
  Vector3,
  type Mesh,
  type Scene,
} from '../render/babylon/exports';
import { loadEffectTexture } from '../fx/effectTexture';
import { fxTicks, hash, type RGB } from '../fx/core';
import { addEffectGlow, releaseEffectGlow } from '../fx/glow';
import { inPlaceLines, type InPlaceLines } from '../fx/greasedLineInPlace';
import { disposeLine, makeLine, type Line } from '../fx/joint';
import { RGBS, TEX } from '../fx/recipes';
import { reportLoadFailure } from '../assets';

export const RING = { diameter: 0.48, thickness: 0.035, tessellation: 48, colour: [1, 1, 1] as RGB };
export const ARCS = {
  count: 5,
  segments: 6,
  width: 0.022,
  /** Radial and vertical swing of an arc's middle off the ring. */
  jitter: 0.045,
  /** Arc length round the ring, radians. */
  minSpan: 0.6,
  maxSpan: 1.6,
  /** Re-rolled every 3 ticks (0.12 s); a re-roll leaves an arc dark this often. */
  rerollTicks: 3,
  blink: 0.3,
  texture: TEX.jointThunder,
  colour: RGBS.arc,
};
export const SPARKS = { texture: TEX.flare, capacity: 30, rate: 16, radius: RING.diameter / 2, minSize: 0.05, maxSize: 0.11 };
export const MOTES = { texture: TEX.flare, capacity: 60, rate: 30, halfWidth: 0.3, height: 1.6, minSize: 0.1, maxSize: 0.24 };
export const GLOW = { texture: TEX.flare, capacity: 8, rate: 5, halfWidth: 0.08, minSize: 1.0, maxSize: 1.4 };

const PARKED = [0, -1000, 0];

/** One shared mesh and material per scene, cloned per character. */
const rings = new WeakMap<Scene, Mesh>();

function ringOf(scene: Scene): Mesh {
  let ring = rings.get(scene);
  if (ring && !ring.isDisposed()) return ring;
  ring = CreateTorus('creditsRing', RING, scene);
  const material = new StandardMaterial('creditsRing', scene);
  material.disableLighting = true;
  material.emissiveColor = Color3.FromArray(RING.colour);
  material.diffuseColor = Color3.Black();
  material.alpha = 0.99;
  material.alphaMode = Constants.ALPHA_ADD;
  material.disableDepthWrite = true;
  ring.material = material;
  ring.isPickable = false;
  ring.isVisible = false;
  rings.set(scene, ring);
  return ring;
}

/** One arc into `out` from `offset`. */
export function ringArc(out: Float32Array | number[], offset: number, start: number, span: number, seed: number): void {
  const r = RING.diameter / 2;
  for (let i = 0; i <= ARCS.segments; i++) {
    const t = i / ARCS.segments;
    const k = Math.sin(t * Math.PI) * ARCS.jitter;
    const d = r + (hash(seed + i * 1.37) - 0.5) * 2 * k;
    const a = start + span * t;
    const o = offset + i * 3;
    out[o] = Math.cos(a) * d;
    out[o + 1] = (hash(seed + i * 2.71) - 0.5) * 2 * k;
    out[o + 2] = Math.sin(a) * d;
  }
}

function motes(scene: Scene, name: string, p: { texture: string; capacity: number; rate: number; minSize: number; maxSize: number }, emitter: Vector3): ParticleSystem {
  const ps = new ParticleSystem(name, p.capacity, scene);
  ps.blendMode = ParticleSystem.BLENDMODE_ADD;
  ps.emitter = emitter;
  ps.emitRate = p.rate;
  ps.minSize = p.minSize;
  ps.maxSize = p.maxSize;
  ps.colorDead = new Color4(1, 1, 1, 0);
  ps.gravity = Vector3.Zero();
  void loadEffectTexture(scene, p.texture)
    .then(texture => {
      if (scene.particleSystems.indexOf(ps) >= 0) ps.particleTexture = texture;
    })
    .catch(reportLoadFailure(p.texture));
  return ps;
}

/** Drawn for the credits (`ecs/systems/creditsAccent.ts` places it each frame). */
export class CreditsAccent {
  private readonly ring: Mesh;
  private readonly arcs: Line;
  private readonly arcLines: number[][] = [];
  private readonly arcPoints: InPlaceLines | null;
  private readonly systems: ParticleSystem[];
  private readonly rates: number[];
  private readonly head = new Vector3();
  private readonly feet = new Vector3();
  private shown = true;
  private roll = -1;
  private seed = Math.random() * 1000;

  constructor(private readonly scene: Scene) {
    this.ring = ringOf(scene).clone('creditsRing');
    this.ring.isVisible = true;
    this.ring.isPickable = false;
    addEffectGlow(scene, this.ring);

    const n = (ARCS.segments + 1) * 3;
    for (let i = 0; i < ARCS.count; i++) {
      const line = new Array<number>(n);
      ringArc(line, 0, (i / ARCS.count) * Math.PI * 2, ARCS.maxSpan, i);
      this.arcLines.push(line);
    }
    this.arcs = makeLine(scene, this.arcLines, ARCS.colour, ARCS.width, {
      texture: ARCS.texture,
      textureRepeats: 2,
      textureScroll: 1,
    });
    this.arcPoints = inPlaceLines(this.arcs.mesh, ARCS.segments + 1, ARCS.count);

    const sparks = motes(scene, 'creditsSparks', SPARKS, this.head);
    sparks.createDirectedCylinderEmitter(SPARKS.radius, 0.02, 0, new Vector3(-0.03, 0.15, -0.03), new Vector3(0.03, 0.35, 0.03));
    sparks.color1 = new Color4(1, 1, 1, 1);
    sparks.color2 = new Color4(0.85, 0.92, 1, 0.9);
    sparks.minLifeTime = 0.5;
    sparks.maxLifeTime = 0.9;
    sparks.minEmitPower = 0.3;
    sparks.maxEmitPower = 0.6;

    const motesPs = motes(scene, 'creditsMotes', MOTES, this.feet);
    motesPs.minEmitBox = new Vector3(-MOTES.halfWidth, 0, -MOTES.halfWidth);
    motesPs.maxEmitBox = new Vector3(MOTES.halfWidth, MOTES.height, MOTES.halfWidth);
    motesPs.color1 = new Color4(1, 1, 1, 0.95);
    motesPs.color2 = new Color4(0.9, 0.95, 1, 0.8);
    motesPs.minLifeTime = 0.7;
    motesPs.maxLifeTime = 1.3;
    motesPs.direction1 = new Vector3(-0.05, 0.3, -0.05);
    motesPs.direction2 = new Vector3(0.05, 0.6, 0.05);
    motesPs.minEmitPower = 0.2;
    motesPs.maxEmitPower = 0.4;

    const glow = motes(scene, 'creditsGlow', GLOW, this.feet);
    glow.minEmitBox = new Vector3(-GLOW.halfWidth, 0.5, -GLOW.halfWidth);
    glow.maxEmitBox = new Vector3(GLOW.halfWidth, 1.1, GLOW.halfWidth);
    glow.color1 = new Color4(1, 1, 1, 0.2);
    glow.color2 = new Color4(0.92, 0.96, 1, 0.16);
    glow.minLifeTime = 1.2;
    glow.maxLifeTime = 1.8;
    glow.direction1 = new Vector3(0, 0.02, 0);
    glow.direction2 = new Vector3(0, 0.05, 0);

    this.systems = [sparks, motesPs, glow];
    this.rates = [SPARKS.rate, MOTES.rate, GLOW.rate];
    for (const ps of this.systems) ps.start();
  }

  /** Follows `head` and `feet`; off when not `shown`. */
  place(head: Vector3, feet: Vector3, shown: boolean): void {
    if (shown !== this.shown) {
      this.shown = shown;
      this.ring.setEnabled(shown);
      this.arcs.mesh.setEnabled(shown);
      for (let i = 0; i < this.systems.length; i++) this.systems[i].emitRate = shown ? this.rates[i] : 0;
    }
    if (!shown) return;
    this.ring.position.copyFrom(head);
    this.arcs.mesh.position.copyFrom(head);
    this.head.copyFrom(head);
    this.feet.copyFrom(feet);
    this.arcs.scroll();
    const roll = Math.floor(fxTicks() / ARCS.rerollTicks);
    if (roll !== this.roll) this.reroll(roll);
  }

  /** New arcs, the way fx/joint.ts `spawnBoltSet` re-rolls. */
  private reroll(roll: number): void {
    this.roll = roll;
    const lines = this.arcPoints;
    if (!lines) return;
    const out = lines.points;
    const n = (ARCS.segments + 1) * 3;
    for (let i = 0; i < ARCS.count; i++) {
      const s = (this.seed += 3.3);
      if (hash(s + 0.5) < ARCS.blink) {
        // Dark this roll: parked out of sight, as joint.ts parks a spare line.
        for (let o = i * n; o < (i + 1) * n; o += 3) out.set(PARKED, o);
        continue;
      }
      const span = ARCS.minSpan + hash(s + 0.9) * (ARCS.maxSpan - ARCS.minSpan);
      ringArc(out, i * n, hash(s) * Math.PI * 2, span, s);
    }
    lines.write();
    this.arcs.fade(0.7 + 0.3 * hash(this.seed + 0.2));
  }

  dispose(): void {
    releaseEffectGlow(this.ring);
    this.ring.dispose();
    this.arcPoints?.dispose();
    disposeLine(this.scene, this.arcs, this.arcLines);
    // The flare is the shared effect texture: keep it for everyone else (fx/itemAura.ts).
    for (const ps of this.systems) ps.dispose(false);
  }
}
