import { afterAll, describe, expect, it, vi } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { Skeleton } from '@babylonjs/core/Bones/skeleton';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

const { World } = await import('@/ecs/world');
const { ModelObject } = await import('./modelObject');
const { addPropToBatch, disposePropBatches, flushPropBatches, propBatchStats } = await import('./propBatches');
const { GameOptions } = await import('@/controllers/settings');

const engine = new NullEngine();
const scene = new Scene(engine);
afterAll(() => engine.dispose());

/** The cached model every clone of a file draws from (modelLoader's container), and one placement's clone of it. */
const cached = new Mesh('statue', scene);
VertexData.CreateBox({ size: 1 }).applyToMesh(cached);
cached.setEnabled(false);

class Statue extends ModelObject {
  static override Batchable = true;
  override async init(): Promise<void> {
    const root = new Mesh('statueRoot', scene);
    const body = cached.clone('statueBody', root) as Mesh;
    body.setEnabled(true);
    this.load({ mesh: root, skeleton: new Skeleton('statue', 'statue', scene), animationGroups: [] });
    this.Ready = true;
  }
}

/** The cached model still holds its GPU buffers. */
function whole(): void {
  expect(cached.getVertexBuffer(VertexBuffer.PositionKind)?.getBuffer()?.references).toBeGreaterThan(0);
  expect(cached.geometry?.getIndexBuffer()?.references).toBeGreaterThan(0);
}

/** A map's statues, batched and drawn, then the map left. */
async function visit(world: InstanceType<typeof World>): Promise<void> {
  for (const x of [10, 20, 100]) {
    const entity = world.add({ worldIndex: world.mapIndex, transform: { pos: new Vector3(x, 0, 10), rot: Vector3.Zero(), scale: 1 }, modelId: 7 });
    addPropToBatch(world, entity, Statue);
  }
  await Promise.resolve();
  flushPropBatches(world);
  expect(propBatchStats()?.meshes).toBeGreaterThan(1);
  disposePropBatches();
}

// A map change between maps of one folder (the Chaos Castle floors) keeps the folder's cached models.
describe('the prop batches', () => {
  it('leave the model they borrow buffers from whole when they go', async () => {
    const world = new World(scene as never);
    await visit(world);
    whole();

    // The next map clones the same cached model and batches it again.
    await visit(world);
    whole();
  });

  // The Blood Castle statues: shadowed from the terrain under them (ZzzObject.cpp:1050-1053).
  it("fold a batched caster's shadow from the ground when it asks to", async () => {
    class GroundStatue extends Statue {
      MapShadow = true;
      ShadowFromGround = true;
    }
    // The batched blob is Classic's alone.
    const tier = GameOptions.lightingQuality;
    GameOptions.lightingQuality = 0;
    const world = new World(scene as never);
    const entity = world.add({ worldIndex: world.mapIndex, transform: { pos: new Vector3(30, 0, 30), rot: Vector3.Zero(), scale: 1 }, modelId: 8 });
    addPropToBatch(world, entity, GroundStatue);
    await Promise.resolve();
    flushPropBatches(world);
    const shadows = scene.meshes.filter(mesh => mesh.name.includes('_pbShadow8_'));
    const fromGround = shadows.map(mesh => mesh.metadata?.shadowFromGround);
    disposePropBatches();
    GameOptions.lightingQuality = tier;
    expect(fromGround.length).toBeGreaterThan(0);
    expect(fromGround.every(flag => flag === true)).toBe(true);
  });
});
