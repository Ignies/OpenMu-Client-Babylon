import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});
import { runInAction } from 'mobx';
import { EventBus } from '@/core/eventBus';
import { CharacterClassNumber } from '@/core/types';
import { Store } from '@/app/store';
import { ExperienceGainedPacket, MasterStatsUpdatePacket } from '@versions/shared/packets/ServerToClientPackets';
import { masterExperience } from '@/features/skills/masterLevel';
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
  beforeEach(() => runInAction(() => (Store.playerData.exp = 1000)));

  it('goes to normal experience below the master unlock', () => {
    runInAction(() => {
      Store.playerData.charClass = CharacterClassNumber.BladeKnight;
      Store.playerData.level = 200;
    });
    gain(50);
    expect(Store.playerData.exp).toBe(1050);
  });

  it('goes to master experience only for a third class at level 400', () => {
    runInAction(() => {
      Store.playerData.charClass = CharacterClassNumber.BladeMaster;
      Store.playerData.level = 400;
    });
    masterStats(5, 5000);
    const before = masterExperience().current;
    gain(50);
    expect(Store.playerData.exp).toBe(1000);
    expect(masterExperience().current).toBe(before + 50);
  });
});
