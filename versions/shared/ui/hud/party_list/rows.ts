/**
 * `CPartyManager::SearchPartyMember` (PartyManager.cpp:41-88): a member is found when a live,
 * drawn player carries the name (`index >= 0`), the hero is himself (`-3`), and anyone else is
 * out of sight (`-1`), which the list draws on red with a dim name.
 */
export type Sight = 'near' | 'hero' | 'far';

export type RowLook = { sight: Sight; defense: boolean };

/** A player the scene holds: on screen, dead, and under Greater Defense (`eBuff_Defense`). */
export type SeenPlayer = { name: string; visible: boolean; dead: boolean; defense: boolean };

export function rowLooks(
  members: readonly { name: string }[],
  heroName: string,
  players: Iterable<SeenPlayer>
): RowLook[] {
  const found = new Map<string, SeenPlayer>();
  for (const p of players) if (p.visible && !p.dead) found.set(p.name.trimEnd(), p);

  return members.map(({ name }) => {
    const player = found.get(name.trimEnd());
    if (player) return { sight: 'near', defense: player.defense };
    return { sight: name === heroName ? 'hero' : 'far', defense: false };
  });
}

/** The name's colour (NewUIPartyListWindow.cpp:247-271): the leader orange, the rest white. */
export function nameColor(row: number, sight: Sight): string {
  const far = sight === 'far';
  if (row === 0) return far ? 'rgb(128, 75, 11)' : 'rgb(255, 148, 22)';
  return far ? 'rgb(128, 128, 128)' : 'rgb(255, 255, 255)';
}
