import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});
import { runInAction } from 'mobx';
import { EventBus } from '@/core/eventBus';
import { CharacterClassNumber } from '@/core/types';
// The whole app, for the hero listeners it installs.
import '@/app/logic';
import { Hero } from './state';
import { ExperienceGainedPacket, MasterStatsUpdatePacket } from '@versions/shared/packets/ServerToClientPackets';
import { masterExperience } from '@/modules/skills/masterLevel';
import './net';

// ReceiveDieExp (WSclient.cpp:5719-5743): a kill feeds master experience OR normal
// experience, never both.

function gain(amount: number) {
  const p = ExperienceGainedPacket.createPacket();
  p.AddedExperience = amount;
  EventBus.emit('ExperienceGained', p.buffer);
}

function masterStats(level: number, exp: number) {
  const p = MasterStatsUpdatePacket.createPacket();
  p.MasterLevel = level;
  p.MasterExperience = BigInt(exp);
  p.MasterExperienceOfNextLevel = BigInt(exp * 10);
  EventBus.emit('MasterStatsUpdate', p.buffer);
}

describe('experience from a kill', () => {
  beforeEach(() => runInAction(() => (Hero.exp = 1000)));

  it('goes to normal experience below the master unlock', () => {
    runInAction(() => {
      Hero.charClass = CharacterClassNumber.BladeKnight;
      Hero.level = 200;
    });
    gain(50);
    expect(Hero.exp).toBe(1050);
  });

  it('goes to master experience only for a third class at level 400', () => {
    runInAction(() => {
      Hero.charClass = CharacterClassNumber.BladeMaster;
      Hero.level = 400;
    });
    masterStats(5, 5000);
    const before = masterExperience().current;
    gain(50);
    expect(Hero.exp).toBe(1000);
    expect(masterExperience().current).toBe(before + 50);
  });
});

// ReceiveDieExp (WSclient.cpp:5745-5754): every kill share prints GlobalText 486 (or 1750 for a
// master) in the system log.
describe('the kill share line', () => {
  it('says the experience obtained', async () => {
    const { Social } = await import('@/modules/social/social');
    const said = vi.spyOn(Social, 'systemMessage').mockImplementation(() => undefined);
    runInAction(() => {
      Hero.charClass = CharacterClassNumber.BladeKnight;
      Hero.level = 200;
    });
    gain(50);
    expect(said).toHaveBeenCalledWith('Obtained 50 Exp');

    runInAction(() => {
      Hero.charClass = CharacterClassNumber.BladeMaster;
      Hero.level = 400;
    });
    masterStats(5, 5000);
    gain(70);
    expect(said).toHaveBeenCalledWith('Master EXP achievement 70');
    said.mockRestore();
  });
});

// Receive_Master_LevelUp (WSclient.cpp:8227-8236): a master class levelling up gets the twenty flare joints.
describe('a master level-up', () => {
  it('swirls the flares around the hero', async () => {
    const { Ecs } = await import('@/ecs/current');
    const { effects } = await import('@/controllers/fx');
    const { MasterCharacterLevelUpdatePacket } = await import('@versions/shared/packets/ServerToClientPackets');
    const spawn = vi.spyOn(effects, 'spawn').mockReturnValue({ alive: false, stop() {} });
    const world = Ecs.world;
    runInAction(() => {
      Hero.charClass = CharacterClassNumber.BladeMaster;
      Ecs.world = { scene: {}, playerEntity: { transform: { pos: { x: 10, y: 0, z: 20 } } } } as never;
    });
    const p = MasterCharacterLevelUpdatePacket.createPacket();
    p.MasterLevel = 6;
    EventBus.emit('MasterCharacterLevelUpdate', p.buffer);
    expect(spawn.mock.calls.filter(([name]) => name === 'joint')).toHaveLength(20);
    runInAction(() => {
      Ecs.world = world;
    });
    spawn.mockRestore();
  });
});
