import { loadGLTF } from '../../common/modelLoader';
import { ModelObject } from '../../common/modelObject';
import { Rand } from '../../common/rand';
import { Vector3 } from '../../libs/babylon/exports';
import type { Entity, World } from '../../ecs/world';

/** 25 Hz, the tick `FPS_ANIMATION_FACTOR` is measured in. */
const TICKS_PER_SECOND = 25;

const DEGREES_TO_RADIANS = Math.PI / 180;

/**
 * `o->Angle[1] += (2.0f + o->Gravity) * FPS_ANIMATION_FACTOR`
 * (Render/Effects/Behaviors/MoveHandlers.cpp:465-469, the `SubType == 1`
 * arm). `Gravity` is `(float)(rand() % 80) / 10.f` for warp01/02
 * (ZzzEffect.cpp:559-568) and untouched - so zero - for warp03 (:553-558),
 * giving 2…9.9 degrees a tick against Noria's 4…11.9: the ice gate turns
 * slower than the town one.
 */
const SPIN_BASE_DEGREES = 2;
const SPIN_GRAVITY_MAX = 8;

/**
 * `o->Scale = 1.3f + (float)(rand() % 50) / 100.f` (ZzzEffect.cpp:567);
 * warp03 is a flat 0.6 (:557) and is scaled by the entity instead.
 */
const RING_SCALE_MIN = 1.3;
const RING_SCALE_SPREAD = 0.5;

/**
 * `b->BodyLight` and `o->BlendMeshLight` for MODEL_WARP4/5/6
 * (GM_Raklion.cpp:1367-1370). The map pins both every frame, so the
 * `SubType == 1` colour drift the move handler writes into `o->Light`
 * (`(0, 0.2, 0.1)` plus a small sine) never reaches the draw: on this map
 * the gate is a fixed cold blue, not Noria's wandering violet.
 */
const GATE_LIGHT = new Vector3(0.5, 0.6, 1);
const GATE_BLEND_MESH_LIGHT = 0.8;

/**
 * The Raklion boss gate. `LoadWorld` spawns it from `MapManager.cpp:751-779`
 * - one `CreateObject(MODEL_WARP4)` on Raklion at tile (171, 24) angle
 * `(0, 0, 80)`, two on the hatchery at (169, 24) and (170, 24) angle
 * `(0, 0, 85)` - and `CGM_Raklion::CreateObject` (GM_Raklion.cpp:68-80)
 * answers each with three stacked effects at `z + 520`, offset along Y by
 * -40, -36 and -20: warp01, warp02, warp03, all from `Data/Npc/`.
 *
 * The base object is not spawned here, for the reason `maps/noria` gives:
 * its `Position[2]` is left at 0 while `TerrainHeight.OZB` reads 1.70 tiles
 * at every one of the three tiles, and warp01 reaches 1.22 tiles above its
 * own origin - the whole gate model is under the ice. The three effects
 * floating at 5.2 tiles are the visible gate.
 *
 * Raklion's *other* gate, `CreateObject(MODEL_WARP)` at tile (162, 83)
 * angle 35 (MapManager.cpp:753-758), is not built at all: `CGM_Raklion`'s
 * `MODEL_WARP` case is commented out (:53-67), so it spawns no effects, and
 * the base model is buried under 3.83 tiles of terrain there. Nothing of it
 * is ever on screen. The 65 type-247 records in EncTerrain58.obj are
 * re-saves of that same buried object - see `spec.ts`.
 *
 * Each effect is `o->BlendMesh = -2`, the original's "additive whole body",
 * which maps onto `BlendMesh = 0` here because all three warp models convert
 * to exactly one mesh.
 *
 * Not ported: the `m_bCanGoBossMap` gate (:1362-1365) that stops the three
 * from drawing at all once Selupan's fight is past `RAKLION_STATE_NOTIFY_3`.
 * That flag only moves on a server state packet (`SetState`, :2747-2781) and
 * its constructor value is `true`.
 */
export class RaklionWarpHaloObject extends ModelObject {
  CastsShadow = false;

  /** Radians a second, from the per-instance `Gravity` roll. */
  #spin = 0;

  /** The entity rotation the render system reads back; see init(). */
  #rot: { x: number; y: number; z: number } | null = null;

  /** File under `NPC/`; MODEL_WARP4/5/6 open warp01/02/03. */
  protected modelFile(): string {
    return 'NPC/warp01.glb';
  }

  /** Rolled for warp01/02 only; warp03 spins at the bare 2 deg/tick. */
  protected gravity(): number {
    return Rand.nextFloat(0, SPIN_GRAVITY_MAX);
  }

  async init(world: World, entity: Entity) {
    // Set before load(): applyBlendMesh runs inside it.
    this.BlendMesh = 0;
    this.BlendMeshLight = GATE_BLEND_MESH_LIGHT;

    // The spin has to live on the *entity*, not on `node.rotation`: the
    // render system re-derives the node's Euler angles from `transform.rot`
    // after every Update (renderSystem.ts:84-95).
    this.#rot = entity.transform?.rot ?? null;

    this.#spin =
      (SPIN_BASE_DEGREES + this.gravity()) *
      TICKS_PER_SECOND *
      DEGREES_TO_RADIANS;

    this.load(await loadGLTF(this.modelFile(), world));

    for (const mesh of this.getMeshes(true)) {
      if (!mesh.metadata) continue;
      mesh.metadata.bodyLight = GATE_LIGHT;
    }
  }

  dispose(): void {
    this.#rot = null;
    super.dispose();
  }

  Update(gameTime: World['gameTime']): void {
    super.Update(gameTime);

    if (!this.Ready || this.OutOfView || !this.#rot) return;

    const deltaSeconds = this.node.getScene().getEngine().getDeltaTime() / 1000;

    // `Angle[1]` is the MU Y axis, which the loader's `-toRadians(rot.y)`
    // puts in `transform.rot.z`, hence the minus. Wrapped so the accumulator
    // keeps its precision over a long session.
    this.#rot.z = (this.#rot.z - this.#spin * deltaSeconds) % (Math.PI * 2);
  }
}

/** MODEL_WARP5, the `RENDER_BRIGHT` ring (GM_Raklion.cpp:1377-1381). */
export class RaklionWarpHalo2Object extends RaklionWarpHaloObject {
  protected modelFile(): string {
    return 'NPC/warp02.glb';
  }
}

/**
 * MODEL_WARP6 (GM_Raklion.cpp:1382-1386): the flat disc rather than a ring,
 * `o->Scale = 0.6f` and no `Gravity` roll.
 */
export class RaklionWarpHalo3Object extends RaklionWarpHaloObject {
  protected modelFile(): string {
    return 'NPC/warp03.glb';
  }

  protected gravity(): number {
    return 0;
  }
}

/** Per-instance scale for the two ring copies; warp03 is a fixed 0.6. */
export function warpRingScale(): number {
  return RING_SCALE_MIN + Rand.nextFloat(0, RING_SCALE_SPREAD);
}

/**
 * The three effects one `CreateObject(MODEL_WARP4)` record turns into, added
 * at `tile` with `Position[2] + 520` as their height.
 */
export function createRaklionWarpGate(
  world: World,
  tileX: number,
  tileY: number,
  yawDegrees: number
): void {
  /** `Position[2] + 520.f`, in tiles. The stack floats; no terrain lookup. */
  const height = 5.2;

  const yaw = yawDegrees * DEGREES_TO_RADIANS;

  const stack = [
    { factory: RaklionWarpHaloObject, offsetY: -40, scale: warpRingScale() },
    { factory: RaklionWarpHalo2Object, offsetY: -36, scale: warpRingScale() },
    { factory: RaklionWarpHalo3Object, offsetY: -20, scale: 0.6 },
  ];

  for (const { factory, offsetY, scale } of stack) {
    world.add({
      worldIndex: world.mapIndex,
      transform: {
        // The Y offsets are in MU units: -0.40, -0.36 and -0.20 of a tile,
        // so the three sit almost inside one another and beat against each
        // other as they spin at different rates.
        pos: new Vector3(tileX, height, tileY + offsetY / world.terrainScale),
        // Matches what createObjects builds for a map record: MU-positive yaw
        // in `rot.y`, flipped once by `toRenderAngles`.
        rot: new Vector3(0, yaw, 0),
        scale,
      },
      modelFactory: factory,
      visibility: {
        state: 'hidden',
        lastChecked: 0,
      },
    });
  }
}
