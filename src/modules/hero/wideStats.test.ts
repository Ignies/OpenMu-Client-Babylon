import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});
import { runInAction } from 'mobx';
import { EventBus } from '@/core/eventBus';
import { Ecs } from '@/ecs/current';
import type { World } from '@/ecs/world';
// The whole app, for the hero listeners it installs.
import '@/app/logic';
import { Hero } from './state';
import { StatType } from './characterStats';
import {
  CharacterInformationPacket,
  CharacterLevelUpdatePacket,
  CharacterStatIncreaseResponsePacket,
  CurrentHealthAndShieldPacket,
  CurrentManaAndAbilityPacket,
  CurrentStatsExtendedPacket,
  MaximumHealthAndShieldPacket,
  MaximumManaAndAbilityPacket,
  MaximumStatsExtendedPacket,
  RespawnAfterDeathPacket,
} from '@versions/shared/packets/ServerToClientPackets';

// A server may send the 32-bit pools next to the 16-bit ones; past 65535 the short fields wrap
// (100000 life reads 34464). The original's extended protocol reads only the extended layouts.

const emit = (name: string, p: { buffer: DataView }) => EventBus.emit(name as never, p.buffer as never);
const pools = () => [Hero.currentHP, Hero.maxHP, Hero.currentMP, Hero.maxMP, Hero.currentSD, Hero.maxSD, Hero.currentAG, Hero.maxAG];

function shortPools(value: number) {
  const cur = CurrentHealthAndShieldPacket.createPacket();
  cur.Health = value;
  cur.Shield = value;
  emit('CurrentHealthAndShield', cur);
  const max = MaximumHealthAndShieldPacket.createPacket();
  max.Health = value;
  max.Shield = value;
  emit('MaximumHealthAndShield', max);
  const mana = CurrentManaAndAbilityPacket.createPacket();
  mana.Mana = value;
  mana.Ability = value;
  emit('CurrentManaAndAbility', mana);
  const maxMana = MaximumManaAndAbilityPacket.createPacket();
  maxMana.Mana = value;
  maxMana.Ability = value;
  emit('MaximumManaAndAbility', maxMana);
  const level = CharacterLevelUpdatePacket.createPacket();
  level.Level = 300;
  level.MaximumHealth = value;
  level.MaximumMana = value;
  level.MaximumShield = value;
  level.MaximumAbility = value;
  emit('CharacterLevelUpdate', level);
  const stat = CharacterStatIncreaseResponsePacket.createPacket();
  stat.Success = true;
  stat.Attribute = StatType.Vitality;
  stat.UpdatedDependentMaximumStat = value;
  stat.UpdatedMaximumShield = value;
  stat.UpdatedMaximumAbility = value;
  emit('CharacterStatIncreaseResponse', stat);
  const respawn = RespawnAfterDeathPacket.createPacket();
  respawn.CurrentHealth = value;
  respawn.CurrentMana = value;
  respawn.CurrentShield = value;
  respawn.CurrentAbility = value;
  emit('RespawnAfterDeath', respawn);
}

describe('the 16-bit stat fields', () => {
  beforeEach(() => {
    const playerEntity = {
      attributeSystem: { setValue: () => {} },
      playerAnimation: { action: 0 },
      transform: { pos: { x: 0, y: 0, z: 0 }, rot: { y: 0 } },
      playerMoveTo: {},
      pathfinding: {},
    };
    runInAction(() => (Ecs.world = { mapIndex: 0, playerEntity, getTerrainHeight: () => 0 } as unknown as World));
    emit('CharacterInformation', CharacterInformationPacket.createPacket());
  });

  it('are read until a 32-bit packet arrives', () => {
    shortPools(1234);
    expect(pools()).toEqual(new Array(8).fill(1234));
  });

  it('are ignored once the 32-bit pools arrived', () => {
    const max = MaximumStatsExtendedPacket.createPacket();
    max.Health = max.Mana = max.Shield = max.Ability = 100000;
    emit('MaximumStatsExtended', max);
    const cur = CurrentStatsExtendedPacket.createPacket();
    cur.Health = cur.Mana = cur.Shield = cur.Ability = 90000;
    emit('CurrentStatsExtended', cur);

    shortPools(100000 & 0xffff);
    expect(pools()).toEqual([90000, 100000, 90000, 100000, 90000, 100000, 90000, 100000]);
  });
});
