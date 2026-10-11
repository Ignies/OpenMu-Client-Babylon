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
});
