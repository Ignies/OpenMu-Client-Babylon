/**
 * The server's maps, by the number `/move` and `/teleport` expect.
 *
 * These are OpenMU's own `GameMapDefinition.Number` and `Name`
 * (`Persistence/Initialization/**\/Maps/*.cs`), not the client's `ENUM_WORLD`.
 * The two agree for most maps and disagree for enough of them - Blood Castle
 * runs 11..17 plus 52, Chaos Castle 18..23 plus 53, Kalima 24..29 plus 36 -
 * that guessing from the client side would warp a game master somewhere they
 * did not ask for.
 *
 * Numbers, not names, are what the panel sends: `/move` accepts either, but a
 * name has to match the server's spelling in the player's language, and
 * `Land_of_Trials` and `Silent Map?` are not names anyone will type.
 */

export type GmMap = {
  number: number;
  name: string;
  /** Groups the picker; also what its filter matches against. */
  kind: 'town' | 'field' | 'dungeon' | 'event' | 'other';
};

export const GM_MAPS: readonly GmMap[] = [
  { number: 0, name: 'Lorencia', kind: 'town' },
  { number: 2, name: 'Devias', kind: 'town' },
  { number: 3, name: 'Noria', kind: 'town' },
  { number: 4, name: 'Lost Tower', kind: 'field' },
  { number: 51, name: 'Elvenland', kind: 'town' },
  { number: 62, name: 'Santa Village', kind: 'town' },
  { number: 79, name: 'Loren Market', kind: 'town' },

  { number: 1, name: 'Dungeon', kind: 'dungeon' },
  { number: 5, name: 'Exile', kind: 'field' },
  { number: 7, name: 'Atlans', kind: 'field' },
  { number: 8, name: 'Tarkan', kind: 'field' },
  { number: 10, name: 'Icarus', kind: 'field' },
  { number: 30, name: 'Valley of Loren', kind: 'field' },
  { number: 31, name: 'Land of Trials', kind: 'field' },
  { number: 33, name: 'Aida', kind: 'field' },
  { number: 34, name: 'Crywolf Fortress', kind: 'field' },
  { number: 37, name: 'Kanturu I', kind: 'field' },
  { number: 38, name: 'Kanturu III', kind: 'field' },
  { number: 41, name: 'Barracks of Balgass', kind: 'field' },
  { number: 42, name: 'Balgass Refuge', kind: 'field' },
  { number: 56, name: 'Swamp of Calmness', kind: 'field' },
  { number: 57, name: 'La Cleon', kind: 'field' },
  { number: 58, name: 'La Cleon Boss', kind: 'field' },
  { number: 63, name: 'Vulcanus', kind: 'field' },
  { number: 80, name: 'Karutan 1', kind: 'field' },
  { number: 81, name: 'Karutan 2', kind: 'field' },

  { number: 6, name: 'Arena', kind: 'event' },
  { number: 64, name: 'Duel Arena', kind: 'event' },
  { number: 9, name: 'Devil Square 1-4', kind: 'event' },
  { number: 32, name: 'Devil Square 5-7', kind: 'event' },
  { number: 11, name: 'Blood Castle 1', kind: 'event' },
  { number: 12, name: 'Blood Castle 2', kind: 'event' },
  { number: 13, name: 'Blood Castle 3', kind: 'event' },
  { number: 14, name: 'Blood Castle 4', kind: 'event' },
  { number: 15, name: 'Blood Castle 5', kind: 'event' },
  { number: 16, name: 'Blood Castle 6', kind: 'event' },
  { number: 17, name: 'Blood Castle 7', kind: 'event' },
  { number: 52, name: 'Blood Castle 8', kind: 'event' },
  { number: 18, name: 'Chaos Castle 1', kind: 'event' },
  { number: 19, name: 'Chaos Castle 2', kind: 'event' },
  { number: 20, name: 'Chaos Castle 3', kind: 'event' },
  { number: 21, name: 'Chaos Castle 4', kind: 'event' },
  { number: 22, name: 'Chaos Castle 5', kind: 'event' },
  { number: 23, name: 'Chaos Castle 6', kind: 'event' },
  { number: 53, name: 'Chaos Castle 7', kind: 'event' },
  { number: 24, name: 'Kalima 1', kind: 'dungeon' },
  { number: 25, name: 'Kalima 2', kind: 'dungeon' },
  { number: 26, name: 'Kalima 3', kind: 'dungeon' },
  { number: 27, name: 'Kalima 4', kind: 'dungeon' },
  { number: 28, name: 'Kalima 5', kind: 'dungeon' },
  { number: 29, name: 'Kalima 6', kind: 'dungeon' },
  { number: 36, name: 'Kalima 7', kind: 'dungeon' },
  { number: 45, name: 'Illusion Temple 1', kind: 'event' },
  { number: 46, name: 'Illusion Temple 2', kind: 'event' },
  { number: 47, name: 'Illusion Temple 3', kind: 'event' },
  { number: 48, name: 'Illusion Temple 4', kind: 'event' },
  { number: 49, name: 'Illusion Temple 5', kind: 'event' },
  { number: 50, name: 'Illusion Temple 6', kind: 'event' },
  { number: 39, name: 'Kanturu Event', kind: 'event' },
  { number: 65, name: 'Doppelgaenger 1', kind: 'event' },
  { number: 66, name: 'Doppelgaenger 2', kind: 'event' },
  { number: 67, name: 'Doppelgaenger 3', kind: 'event' },
  { number: 68, name: 'Doppelgaenger 4', kind: 'event' },
  { number: 69, name: 'Imperial Guardian 1', kind: 'event' },
  { number: 70, name: 'Imperial Guardian 2', kind: 'event' },
  { number: 71, name: 'Imperial Guardian 3', kind: 'event' },
  { number: 72, name: 'Imperial Guardian 4', kind: 'event' },

  { number: 40, name: 'GM Area', kind: 'other' },
];

const BY_NUMBER = new Map(GM_MAPS.map(map => [map.number, map]));

/** The map's name, or its number when the server has one we do not list. */
export function mapName(number: number): string {
  return BY_NUMBER.get(number)?.name ?? `Map ${number}`;
}

export function findMaps(query: string): readonly GmMap[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return GM_MAPS;

  return GM_MAPS.filter(
    map => map.name.toLowerCase().includes(needle) || String(map.number) === needle
  );
}
