import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Entity, World } from '@/ecs/world';

vi.mock('@/ecs/systems/teleportSystem', () => ({
  beginTeleport: vi.fn(),
  endTeleport: vi.fn(),
  justArrived: vi.fn(() => false),
}));
vi.mock('@/app/store', () => ({ Store: {} }));
vi.mock('../_shared/net_helpers', () => ({ applyObjectEffect: vi.fn(), playCastAnimation: vi.fn() }));
vi.mock('@versions/shared/skills/skillVisuals', () => ({
  playAreaSkillVisual: vi.fn(),
  playChainLightningHop: vi.fn(),
}));
vi.mock('./skillCasting', () => ({ TELEPORT: 6 }));

import { beginTeleport } from '@/ecs/systems/teleportSystem';
import { playTeleportAnimation } from './net';

const KANTURU_3RD = { mapIndex: 39 } as unknown as World;
const monster = (npcType: number) => ({ monsterAnimation: {}, npcType }) as unknown as Entity;

beforeEach(() => vi.mocked(beginTeleport).mockClear());

// ReceiveMagic AT_SKILL_TELEPORT (WSclient.cpp:4319-4327): only the Nightmare, and only in Kanturu 3rd.
describe('a monster teleporting', () => {
  it('plays the Nightmare its own sound in Kanturu 3rd', () => {
    playTeleportAnimation(KANTURU_3RD, 6, monster(361), null);
    expect(vi.mocked(beginTeleport).mock.calls[0][2]).toEqual({ clip: false, soundKey: 'Sound/w39/nightmare_tele' });
  });

  it('plays any other monster in Kanturu 3rd the plain teleport sound', () => {
    playTeleportAnimation(KANTURU_3RD, 6, monster(360), null);
    expect(vi.mocked(beginTeleport).mock.calls[0][2]).toEqual({ clip: false, soundKey: undefined });
  });

  it('plays the Nightmare elsewhere the plain teleport sound', () => {
    playTeleportAnimation({ mapIndex: 38 } as unknown as World, 6, monster(361), null);
    expect(vi.mocked(beginTeleport).mock.calls[0][2]).toEqual({ clip: false, soundKey: undefined });
  });
});
