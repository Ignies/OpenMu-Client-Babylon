import { useEffect, useState } from 'react';
import { Store } from '../../../../store';
import { INVITE_RANGE_TILES } from '../../../../social';
import type { GuildMemberRoleEnum } from '../../../../common/packets/ServerToClientPackets';

export type NearbyPlayer = {
  netId: number;
  name: string;
  guildId: number | undefined;
  guildRole: GuildMemberRoleEnum | undefined;
};

/**
 * The players a party invite / guild join can reach: the original's command
 * window works on the character under the cursor and refuses anyone farther
 * than one tile (`abs(dx) <= 1 && abs(dy) <= 1`, ZzzInterface.cpp:4410).
 * Without a command window we offer the same set as a list.
 */
export function nearbyPlayers(range = INVITE_RANGE_TILES): NearbyPlayer[] {
  const world = Store.world;
  const hero = world?.playerEntity;
  if (!world || !hero) return [];

  // transform.pos is (tileX, height, tileY).
  const hx = Math.floor(hero.transform.pos.x);
  const hy = Math.floor(hero.transform.pos.z);

  const result: NearbyPlayer[] = [];
  for (const e of world.playersQuery.entities) {
    if (e.localPlayer || e.netId === undefined || e.dying) continue;
    const x = Math.floor(e.transform.pos.x);
    const y = Math.floor(e.transform.pos.z);
    if (Math.abs(x - hx) > range || Math.abs(y - hy) > range) continue;
    result.push({
      netId: e.netId,
      name: e.objectNameInWorld ?? `#${e.netId}`,
      guildId: e.guild?.id,
      guildRole: e.guild?.role,
    });
  }
  return result;
}

/** Re-samples the nearby list a few times a second while mounted. */
export function useNearbyPlayers(range?: number): NearbyPlayer[] {
  const [players, setPlayers] = useState<NearbyPlayer[]>(() =>
    nearbyPlayers(range)
  );

  useEffect(() => {
    const id = window.setInterval(() => {
      const next = nearbyPlayers(range);
      setPlayers(prev =>
        prev.length === next.length &&
        prev.every((p, i) => p.netId === next[i].netId && p.name === next[i].name)
          ? prev
          : next
      );
    }, 400);
    return () => window.clearInterval(id);
  }, [range]);

  return players;
}
