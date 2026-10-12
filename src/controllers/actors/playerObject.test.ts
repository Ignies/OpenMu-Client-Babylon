import { afterAll, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { TransformNode } from '../render/babylon/exports';
import { PlayerObject } from './playerObject';

const engine = new NullEngine();
const scene = new Scene(engine);
afterAll(() => engine.dispose());

describe('the wing slot', () => {
  it('draws no model for the Cape of Lord and the Cape of Fighter, only their cloth (ZzzCharacter.cpp:7004-7011)', async () => {
    const player = new PlayerObject(scene, new TransformNode('player', scene));
    const load = vi.spyOn(player, 'loadPartAsync').mockResolvedValue();
    await player.setWingsAsync({ group: 13, num: 30 });
    await player.setWingsAsync({ group: 12, num: 49 });
    expect(load).not.toHaveBeenCalled();
  });

  it('keeps the model of the Mantle of Monarch and the Cape of Overrule, which hang cloth beside it', async () => {
    const player = new PlayerObject(scene, new TransformNode('player', scene));
    const load = vi.spyOn(player, 'loadPartAsync').mockResolvedValue();
    await player.setWingsAsync({ group: 12, num: 40 });
    await player.setWingsAsync({ group: 12, num: 50 });
    expect(load.mock.calls.map(call => call[2])).toEqual(['DarkLordRobe02.glb', 'Wing51.glb']);
  });
});

// RenderCharacter's shadow pass draws BodyPart[] and Weapon[] alone: none for a Uniria or Dinorant rider out
// of a safe zone, no weapon in a safe zone, never a bow or crossbow (ZzzCharacter.cpp:8590-8628).
describe('the Classic shadow of a character', () => {
  const sword = { group: 0, num: 0 };
  const bow = { group: 4, num: 3 };
  const flags = (player: PlayerObject) =>
    [player.Armor, player.Weapon1, player.Weapon2, player.PhoenixWing1, player.Pet, player.QuestItem].map(o => o.ClassicShadow);

  it('falls from the body and the hand weapons, and never from the rest', () => {
    const player = new PlayerObject(scene, new TransformNode('player', scene));
    player.setClassicShadows(false, false, sword, bow);
    expect(flags(player)).toEqual([true, true, false, false, false, false]);
    player.setClassicShadows(false, true, sword, null);
    expect(flags(player)).toEqual([true, false, false, false, false, false]);
    player.setClassicShadows(true, false, sword, null);
    expect([player.ClassicShadow, ...flags(player)]).toEqual([false, false, false, false, false, false, false]);
  });

  // `o->Alpha >= 0.5f` opens the player's shadow pass (ZzzCharacter.cpp:8588).
  it('is drawn from half alpha', () => {
    const player = new PlayerObject(scene, new TransformNode('player', scene));
    expect([player.ShadowMinAlpha, player.Armor.ShadowMinAlpha, player.Weapon1.ShadowMinAlpha]).toEqual([0.5, 0.5, 0.5]);
  });
});

describe('the parts RenderLinkObject draws', () => {
  it('are unlit: the hand weapons and the phoenix wings, not the worn parts (ZzzCharacter.cpp:6651-6652)', () => {
    const player = new PlayerObject(scene, new TransformNode('player', scene));
    const parts = [player.Weapon1, player.Weapon2, player.PhoenixWing1, player.PhoenixWing2, player.Armor, player.Helm];
    expect(parts.map(p => p.Unlit)).toEqual([true, true, true, true, false, false]);
  });

  // c->Wing (wings and capes, :15400-15430), the Imp (:15433-15455), the Archangel quest weapon (:15367-15391).
  it('are unlit: the wings and capes, the Imp and the quest weapon too, not the cloth or the GM mark', () => {
    const player = new PlayerObject(scene, new TransformNode('player', scene));
    expect([player.Wings, player.Pet, player.QuestItem, player.GmMark].map(p => p.Unlit)).toEqual([true, true, true, false]);
  });
});

// The cloth reads the rig's bones in the BMD frames the original's matrices use (SetFixedVertices' (z, -y, x)).
describe('the player rig the cloth hangs on', () => {
  it('turns the cape bone 19 with its x up, its -y behind and its z across, the body facing -y', async () => {
    const { readFileSync } = await import('fs');
    const { SceneLoader } = await import('@babylonjs/core/Loading/sceneLoader');
    await import('@babylonjs/loaders/glTF/2.0/index');
    const { Quaternion, Vector3 } = await import('../render/babylon/exports');
    const bytes = readFileSync('public/game-assets/Player/player.glb');
    const rig = await SceneLoader.LoadAssetContainerAsync('', `data:;base64,${bytes.toString('base64')}`, scene, null, '.glb');
    rig.addAllToScene();
    // ModelObject.load's basis change on the model root.
    const root = rig.meshes[0];
    root.scaling.set(1, -1, 1);
    root.rotationQuaternion = Quaternion.FromEulerAngles(-Math.PI / 2, 0, 0);
    const idle = rig.animationGroups[1];
    idle.start(false, 1);
    idle.goToFrame(idle.from);
    idle.pause();
    const bone = (i: number) => {
      const node = rig.transformNodes.find(n => n.name.startsWith(`bone_${i}_`));
      if (!node) throw new Error(`no bone ${i}`);
      return node;
    };
    for (const node of [root, ...rig.transformNodes]) node.computeWorldMatrix(true);
    const world = bone(19).getWorldMatrix();
    const axis = (x: number, y: number, z: number) => Vector3.TransformNormal(new Vector3(x, y, z), world).asArray().map(v => Math.round(v) + 0);
    // Scene axes: y up, MU's y is the scene's z.
    expect([axis(1, 0, 0), axis(0, -1, 0), axis(0, 0, 1)]).toEqual([
      [0, 1, 0],
      [0, 0, 1],
      [1, 0, 0],
    ]);
    // The toes point the other way: the body faces -y (MU), the wind blows behind it.
    expect(bone(6).getAbsolutePosition().z).toBeLessThan(bone(5).getAbsolutePosition().z);
    rig.dispose();
  }, 60_000);
});
