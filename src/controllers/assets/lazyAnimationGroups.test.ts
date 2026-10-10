import { afterAll, describe, expect, it } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { AnimationGroup } from '@babylonjs/core/Animations/animationGroup';
import { animationGroupSource, cloneTargets, forEachAnimationGroup, lazyAnimationGroups } from './lazyAnimationGroups';

const engine = new NullEngine();
const scene = new Scene(engine);
afterAll(() => engine.dispose());

function clips(count: number) {
  const sources = Array.from({ length: count }, (_, i) => new AnimationGroup(`clip${i}`, scene));
  const made: string[] = [];
  let gone = false;
  const groups = lazyAnimationGroups(sources, source => {
    if (gone) return null;
    made.push(source.name);
    return source.clone(`${source.name}:copy`);
  });
  return { sources, groups, made, drop: () => (gone = true) };
}

describe('lazyAnimationGroups', () => {
  it('clones a clip the first time its index is read, and only then', () => {
    const { groups, made } = clips(4);
    expect(groups.length).toBe(4);
    expect(made).toEqual([]);
    const third = groups[2];
    expect(third?.name).toBe('clip2:copy');
    expect(groups[2]).toBe(third);
    expect(made).toEqual(['clip2']);
    expect(groups[9]).toBeUndefined();
  });

  it('walks only the clips cloned so far, with their own index', () => {
    const { groups } = clips(4);
    void groups[3];
    void groups[1];
    expect([...groups].map(g => g.name)).toEqual(['clip1:copy', 'clip3:copy']);
    const seen: number[] = [];
    groups.forEach((_g, i) => seen.push(i));
    expect(seen).toEqual([1, 3]);
    expect(groups.some(g => g.name === 'clip3:copy')).toBe(true);
  });

  it('runs a hook on the clips there are and on each one cloned later, and appends a clip made later', () => {
    const { groups } = clips(3);
    void groups[0];
    const hooked: number[] = [];
    forEachAnimationGroup(groups, (_g, i) => hooked.push(i));
    void groups[2];
    const pushed = new AnimationGroup('extra', scene);
    expect(groups.push(pushed)).toBe(4);
    expect(groups[3]).toBe(pushed);
    expect(hooked).toEqual([0, 2]);
  });

  it('reads a clip\'s source without cloning it, and clones nothing once the copy is gone', () => {
    const { sources, groups, made, drop } = clips(2);
    expect(animationGroupSource(groups, 1)).toBe(sources[1]);
    expect(made).toEqual([]);
    drop();
    expect(groups[1]).toBeUndefined();
    expect(groups[1]).toBeUndefined();
  });

  it('a plain array is its own source and hooks with forEach', () => {
    const plain = [new AnimationGroup('a', scene)];
    const hooked: string[] = [];
    forEachAnimationGroup(plain, g => hooked.push(g.name));
    expect(hooked).toEqual(['a']);
    expect(animationGroupSource(plain, 0)).toBe(plain[0]);
  });
});

describe('cloneTargets', () => {
  function tree(names: string[]): TransformNode {
    const root = new TransformNode('root', scene);
    for (const name of names) new TransformNode(name, scene).parent = root;
    return root;
  }

  it('maps each source node onto the clone node at the same name path', () => {
    const source = tree(['bone_0', 'bone_1']);
    const clone = tree(['bone_1', 'bone_0']);
    const map = cloneTargets([source], [clone]);
    const [s0] = source.getChildren(n => n.name === 'bone_0');
    const [c0] = clone.getChildren(n => n.name === 'bone_0');
    expect(map?.get(s0)).toBe(c0);
    expect(map?.get(source)).toBe(clone);
  });

  it('gives up when a path is shared or missing', () => {
    expect(cloneTargets([tree(['a', 'a'])], [tree(['a', 'a'])])).toBeNull();
    expect(cloneTargets([tree(['a', 'b'])], [tree(['a'])])).toBeNull();
  });
});
