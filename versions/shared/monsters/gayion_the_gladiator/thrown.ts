import { Quaternion, Vector3, type AbstractMesh, type TransformNode } from '@/controllers/render/babylon/exports';
import type { World } from '@/ecs/world';
import { loadGLTF } from '@/controllers/assets';
import { getMaterial } from '@/controllers/assets/modelLoader';
import { ModelObject } from '@/controllers/actors';
import { HeldSprites, type HeldLook, type HeldPoint } from '@/controllers/fx/effectParticles';
import { lighting } from '@/controllers/lighting';
import { angleMatrixQuaternion } from '@/controllers/render/renderAngles';
import { playCombat } from '@/controllers/sound/combat';
import { BlendState } from '../../objects/enum';
import { sample, type Flight, type Vec } from './flights';
import { GAION_SWORDS, SWORD_SPRITES } from './swords';

/** One 25 Hz tick, in seconds. */
const TICK = 1 / 25;
const DEG = Math.PI / 180;

/** Mesh 1 is drawn bright (RENDER_BRIGHT), mesh 2 bright in (0.2, 0.2, 1) at full alpha (ZzzEffect.cpp:9395-9401). */
const BRIGHT_MESH = 1;
const BLUE_MESH = 2;
const BLUE = new Vector3(0.2, 0.2, 1);

/** The sprites' sheets, scales and lights (ZzzEffect.cpp:9455-9478): two red jewels, seven big and two small edge lights. */
const SPRITE_LOOKS = [
  ...[1.3, 1.3].map(scale => ({ texture: 'flare01Red' as const, scale, r: 1, g: 0.4, b: 0.1 })),
  ...[1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1, 1].map(scale => ({ texture: 'flare01' as const, scale, r: 0.3, g: 0.3, b: 1 })),
];

/** The side swords light the ground blue under them in flight (MoveHandlers.cpp:8396-8429, :8646-8650). */
const FLIGHT_LIGHT = { color: [0, 0.2, 0.9] as const, range: 2, release: 0 };

/** left02 / right02 leave a shadow every tick while the rate is in (0.3, 1.01) (MoveHandlers.cpp:8098-8115, :8358-8364). */
const SHADOW_FROM = 0.3;
const SHADOW_TO = 1.01;
/** SubType 20 lives 5 ticks of a 10-tick span, so its alpha `0.7 -> 0` runs 0.35 down by 0.07 a tick (ZzzEffect.cpp:5196-5240). */
const SHADOW_TICKS = 5;
const SHADOW_ALPHA = 0.35;
const SHADOW_STEP = 0.07;

/** The thrown swords' sounds on their second tick (MoveHandlers.cpp:8563-8580). */
const curved = (sword: number) => sword === 1 || sword === 3;

/**
 * A sword model drawn the way RenderEffect draws Gaion's (ZzzEffect.cpp:9358-9480): mesh 2 bright and blue,
 * and with `sprites` its two jewels and nine edge lights on its own bones. Mesh 1 is the model's `BlendMesh`.
 */
export function dressSword(model: ModelObject, sword: number, sprites: boolean): HeldSprites | null {
  const mesh = model.getMesh(BLUE_MESH);
  if (mesh) {
    mesh.material = getMaterial(mesh.getScene(), false, 2, BlendState.ALPHA_ONEOE, true);
    mesh.metadata = { ...mesh.metadata, brightMesh: true, blendMeshLight: 1, bodyLight: BLUE, csmCaster: false };
  }
  const bones = model.gltf?.skeleton?.bones;
  if (!sprites || !bones) return null;
  const { red, edge } = SWORD_SPRITES[sword];
  const points: HeldPoint[] = [...red, ...edge].map((bone, i) => ({
    node: bones[bone + 1]?.getTransformNode() ?? model.node,
    texture: SPRITE_LOOKS[i].texture,
    blend: 'add',
  }));
  return new HeldSprites(model.node.getScene(), points);
}

/** `SPRITE_LOOKS` for `HeldSprites.update`. */
export function spriteLook(i: number, out: HeldLook): void {
  const look = SPRITE_LOOKS[i];
  out.scale = look.scale;
  out.r = look.r;
  out.g = look.g;
  out.b = look.b;
  out.rotation = 0;
}

/** A free-standing sword: a flight (with its sprites) or a shadow. Reused once done. */
type Body = { readonly sword: number; readonly model: ModelObject; readonly sprites: HeldSprites | null; readonly blue: AbstractMesh | null };

/** A flight and its own `o->Position` / `o->Angle`, kept when no key holds the rate. */
type LiveFlight = {
  readonly sword: number;
  readonly flight: Flight;
  readonly born: number;
  readonly pos: Vec;
  readonly angle: Vec;
  readonly at: Vector3;
  readonly light: ReturnType<typeof lighting.flash> | null;
  body: Body | null;
  ticks: number;
};

type LiveShadow = { readonly body: Body; readonly born: number; step: number };

const ang: Vec = [0, 0, 0];

/**
 * Gaion's thrown swords: each a flight along its keys (flights.ts), the curved ones leaving a shadow every
 * tick. A body loads the first time its sword needs one and is reused after.
 */
export class ThrownSwords {
  readonly #flights: LiveFlight[] = [];
  readonly #shadows: LiveShadow[] = [];
  readonly #idle: Body[][] = GAION_SWORDS.map(() => []);
  readonly #idleShadows: Body[][] = GAION_SWORDS.map(() => []);
  #disposed = false;

  constructor(
    private readonly world: World,
    private readonly parent: TransformNode,
    private readonly scale: number
  ) {}

  /** Starts `sword` on `flight` now; it shows once its body has loaded. */
  throw(sword: number, flight: Flight, now: number): void {
    const at = new Vector3();
    const light = sword === 4
      ? null
      : lighting.flash(this.world.scene, { ...FLIGHT_LIGHT, seconds: flight.ticks * TICK }, { position: at });
    const pos: Vec = [...flight.pos[0].a];
    const live: LiveFlight = { sword, flight, born: now, pos, angle: [...flight.head], at, light, body: null, ticks: 0 };
    this.#pose(live, 0);
    this.#flights.push(live);
    void this.#take(this.#idle[sword], sword, true).then(body => {
      if (!body) return;
      if (!this.#flights.includes(live)) return this.#release(this.#idle[sword], body);
      live.body = body;
      place(body, live);
    });
  }

  update(gameTime: World['gameTime']): void {
    const now = gameTime.TotalGameTime.TotalSeconds;

    for (let i = this.#flights.length - 1; i >= 0; i--) {
      const live = this.#flights[i];
      const { flight, sword } = live;
      const t = now - live.born;

      if (t >= flight.ticks * TICK) {
        live.light?.stop();
        if (live.body) this.#release(this.#idle[sword], live.body);
        this.#flights.splice(i, 1);
        continue;
      }

      // The ticks this frame crossed: the sound, then the shadows.
      const due = Math.floor(t / TICK);
      while (live.ticks < due) {
        live.ticks++;
        const rate = live.ticks / flight.ticks;
        this.#pose(live, rate);
        if (live.ticks === 1) playCombat(curved(sword) ? 'Sound/eMeleeHit5' : 'Sound/eBloodAttack', live.at);
        if (curved(sword) && rate > SHADOW_FROM && rate < SHADOW_TO) this.#shadow(live, now);
      }

      this.#pose(live, t / (flight.ticks * TICK));
      const body = live.body;
      if (!body) continue;
      place(body, live);
      body.model.Update(gameTime);
      body.sprites?.update(true, spriteLook);
    }

    for (let i = this.#shadows.length - 1; i >= 0; i--) {
      const live = this.#shadows[i];
      const step = Math.floor((now - live.born) / TICK);
      if (step === live.step) continue;
      live.step = step;
      if (step >= SHADOW_TICKS) {
        this.#release(this.#idleShadows[live.body.sword], live.body);
        this.#shadows.splice(i, 1);
      } else {
        fade(live.body, SHADOW_ALPHA - SHADOW_STEP * step);
      }
    }
  }

  dispose(): void {
    this.#disposed = true;
    for (const live of this.#flights) {
      live.light?.stop();
      if (live.body) disposeBody(live.body);
    }
    for (const live of this.#shadows) disposeBody(live.body);
    for (const pool of this.#idle) pool.forEach(disposeBody);
    for (const pool of this.#idleShadows) pool.forEach(disposeBody);
    this.#flights.length = 0;
    this.#shadows.length = 0;
  }

  /** MoveHandlers.cpp:8057-8070: the keys at `rate` (angle plus `HeadAngle`), the position also in tiles. */
  #pose(live: LiveFlight, rate: number): void {
    const { flight } = live;
    sample(flight.pos, rate, live.pos);
    if (sample(flight.angle, rate, ang)) {
      for (let k = 0; k < 3; k++) live.angle[k] = ang[k] + flight.head[k];
    }
    live.at.set(live.pos[0] / 100, live.pos[2] / 100, live.pos[1] / 100);
  }

  /** A SubType 20 copy where the flight is now; the first ones of a sword load its body for the next. */
  #shadow(live: LiveFlight, now: number): void {
    const body = this.#idleShadows[live.sword].pop();
    if (!body) {
      void this.#take([], live.sword, false).then(b => b && this.#release(this.#idleShadows[live.sword], b));
      return;
    }
    place(body, live);
    body.model.node.setEnabled(true);
    fade(body, SHADOW_ALPHA);
    this.#shadows.push({ body, born: now, step: 0 });
  }

  async #take(pool: Body[], sword: number, sprites: boolean): Promise<Body | null> {
    const idle = pool.pop();
    if (idle) {
      idle.model.node.setEnabled(true);
      return idle;
    }
    const { file } = GAION_SWORDS[sword];
    const model = new ModelObject(this.world.scene, this.parent);
    model.NodeNamePrefix = `${file}_`;
    model.SkipBoundingBox = true;
    model.ClassicShadow = false;
    model.CastsShadow = false;
    model.FixedLight = true;
    model.BlendMesh = BRIGHT_MESH;
    model.setPartPose({ action: 0, speed: 0 });
    model.load(await loadGLTF(`Monster/${file}.glb`, this.world));
    if (this.#disposed) {
      model.dispose();
      return null;
    }
    model.node.scaling.setAll(this.scale);
    model.node.rotationQuaternion = new Quaternion();
    return { sword, model, sprites: dressSword(model, sword, sprites), blue: model.getMesh(BLUE_MESH) ?? null };
  }

  #release(pool: Body[], body: Body): void {
    body.sprites?.update(false, spriteLook);
    body.model.node.setEnabled(false);
    pool.push(body);
  }
}

/** The body at the flight's position and `AngleMatrix(o->Angle)`. */
function place(body: Body, live: LiveFlight): void {
  const node = body.model.node;
  node.position.copyFrom(live.at);
  const a = live.angle;
  node.rotationQuaternion = angleMatrixQuaternion(a[0] * DEG, a[1] * DEG, a[2] * DEG, node.rotationQuaternion ?? new Quaternion());
}

/** Meshes 0 and 1 at `alpha`, mesh 2 always at full (ZzzEffect.cpp:9398-9401). */
function fade(body: Body, alpha: number): void {
  body.model.setFadeAlpha(alpha);
  if (body.blue) body.blue.visibility = 1;
}

function disposeBody(body: Body): void {
  body.sprites?.dispose();
  body.model.dispose();
}
