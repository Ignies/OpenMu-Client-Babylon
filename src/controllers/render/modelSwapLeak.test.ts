import { afterAll, describe, expect, it, vi } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { Skeleton } from '@babylonjs/core/Bones/skeleton';
import { Bone } from '@babylonjs/core/Bones/bone';
import { AnimationGroup } from '@babylonjs/core/Animations/animationGroup';
import { runInAction } from 'mobx';
import { ModelObject } from '@/controllers/render/modelObject';
import { Ecs } from '@/ecs/current';
import type { World } from '@/ecs/world';
import { InventoryConstants } from '@/core/inventoryConstants';
import { Hero } from '@/modules/hero/state';

/**
 * The memory that grew 200-700 MB an hour in long sessions. A model swapped
 * for another left the old clone's skeleton (and its bone texture) and clips in the scene, and
 * every inventory change swapped every worn part for an identical one.
 */

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

const engine = new NullEngine();
const scene = new Scene(engine);
afterAll(() => {
  Ecs.world = null;
  scene.dispose();
  engine.dispose();
});

/** One `loadGLTF` clone: meshes, its own skeleton and a clip, all in the scene. */
function clone(name: string) {
  const root = new Mesh(`${name}.glb`, scene);
  const body = CreateBox('node_0', { size: 1 }, scene);
  body.parent = root;
  const skeleton = new Skeleton(`skeleton_${name}`, `skeleton_${name}`, scene);
  new Bone('bone_0', skeleton);
  body.skeleton = skeleton;
  return { mesh: root, skeleton, animationGroups: [new AnimationGroup(`${name}_action_0`, scene)] };
}

describe('a model loaded over another', () => {
  it('frees the old clone whole: meshes, skeleton and clips', () => {
    const object = new ModelObject(scene);
    const first = clone('Sword01');
    object.load(first);
    const second = clone('Sword02');
    object.load(second);

    expect(first.mesh.isDisposed()).toBe(true);
    expect(scene.skeletons).not.toContain(first.skeleton);
    expect(scene.animationGroups).not.toContain(first.animationGroups[0]);
    // The new one is untouched.
    expect(scene.skeletons).toContain(second.skeleton);
    expect(scene.animationGroups).toContain(second.animationGroups[0]);
    object.dispose();
  });

  it('leaves nothing behind after many swaps', () => {
    const object = new ModelObject(scene);
    const skeletons = scene.skeletons.length;
    const clips = scene.animationGroups.length;
    for (let i = 0; i < 50; i++) object.load(clone(`Wing${i}`));
    object.dispose();
    expect(scene.skeletons.length).toBe(skeletons);
    expect(scene.animationGroups.length).toBe(clips);
  });
});

describe('the hero dressed from the inventory', () => {
  // `Ecs.world` is deeply observable: it keeps a copy, so the appearance is read back from it.
  Ecs.world = { scene, playerEntity: { charAppearance: { changed: false } } } as unknown as World;
  const appearance = (Ecs.world.playerEntity as unknown as { charAppearance: { changed: boolean } }).charAppearance;

  const wear = (slot: number, item: object | null) =>
    runInAction(() => {
      Hero.items[slot] = item as never;
    });

  it('is dressed again only when what is worn changes', () => {
    wear(InventoryConstants.ArmorSlot, { group: 8, num: 1, lvl: 7, durability: 40 });
    Hero.syncPlayerAppearance();
    expect(appearance.changed).toBe(true);

    // A potion drunk, loot picked up, durability lost: nothing worn looks different.
    appearance.changed = false;
    wear(InventoryConstants.ArmorSlot, { group: 8, num: 1, lvl: 7, durability: 39 });
    Hero.syncPlayerAppearance();
    Hero.syncPlayerAppearance();
    expect(appearance.changed).toBe(false);

    // A higher level does.
    wear(InventoryConstants.ArmorSlot, { group: 8, num: 1, lvl: 8, durability: 39 });
    Hero.syncPlayerAppearance();
    expect(appearance.changed).toBe(true);
  });
});
