import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ClothSpec } from '@/controllers/cloth';
import { CharacterClassNumber as C } from '@/core/types';

// The duel, the guild war and the guild marks, as their modules keep them.
const state = vi.hoisted(() => ({
  enemy: null as number | null,
  social: {
    myGuild: null as { id: number } | null,
    guildWar: null as { enemyGuild: string; soccer: boolean; team: number } | null,
    battleSoccer: null as { redTeam: string; blueTeam: string } | null,
  },
  marks: new Map<number, { name: string }>(),
}));
vi.mock('@/modules/events/duel', () => ({ duelEnemyId: () => state.enemy }));
vi.mock('@/modules/social/social', () => ({ Social: state.social }));
vi.mock('@/modules/guild', () => ({ GuildMarks: state.marks }));

const { cloaksFor } = await import('@/controllers/actors/cloaks');
await import('./index');
type Wearer = Parameters<typeof cloaksFor>[0];
type CloakSet = Parameters<typeof cloaksFor>[1];

const RED = [1, 0.2, 0];
const BLUE = [0, 0.2, 1];

/** A wearer's set as the rule sees it: what is built in each slot, the count, the frame's draws. */
class FakeSet implements CloakSet {
  built = false;
  count = 0;
  readonly specs: (ClothSpec | null)[] = [];
  readonly drawn = new Set<number>();
  build(slot: number, spec: ClothSpec) {
    this.specs[slot] = spec;
    this.built = true;
  }
  destroy(slot: number) {
    this.specs[slot] = null;
  }
  has(slot: number) {
    return !!this.specs[slot];
  }
  draw(slot: number) {
    if (this.specs[slot]) this.drawn.add(slot);
  }
  drop() {
    this.specs.length = 0;
    this.built = false;
    this.count = 0;
  }
}

/** `frames` frames of the rule on one set (two: the skirt settles); `out` is what the last one draws, by slot. */
function run(w: Wearer, frames: number, set = new FakeSet()) {
  let light: readonly number[] = [];
  for (let f = 0; f < frames; f++) {
    set.drawn.clear();
    light = cloaksFor(w, set);
  }
  const out = Array.from({ length: set.specs.length }, (_, i) => (set.drawn.has(i) ? (set.specs[i] ?? null) : null));
  return { out, light, set };
}

function wear(over: Partial<Wearer>) {
  const { out, light } = run({ charClass: C.DarkKnight, wing: null, wingBefore: null, armor: null, skin: null, chaosCastle: false, netId: 7, hero: false, guild: null, monster: null, rig: true, pants: null, shadowPass: false, fading: false, ...over }, 2);
  return { out, light, fronts: out.filter(Boolean).map(s => s?.front ?? null) };
}

beforeEach(() => {
  state.enemy = null;
  state.social.myGuild = null;
  state.social.guildWar = null;
  state.social.battleSoccer = null;
  state.marks.clear();
});

describe('the duel colours (ZzzCharacter.cpp:9234-9246)', () => {
  it('robes the hero\'s enemy in red and the hero in blue, whatever their class', () => {
    state.enemy = 7;
    expect(wear({})).toMatchObject({ light: RED, fronts: ['Player/Robe01.OZJ'] });
    expect(wear({ netId: 1, hero: true })).toMatchObject({ light: BLUE, fronts: ['Player/Robe01.OZJ'] });
    // Anyone else stays as they were.
    expect(wear({ netId: 9 })).toMatchObject({ light: [1, 1, 1], fronts: [] });
  });

  it('colours nobody while the hero only watches (the original never enables the duel for a spectator)', () => {
    expect(wear({ hero: true }).fronts).toEqual([]);
  });

  it('hangs the Dark Lord\'s cape and the Rage Fighter\'s without their item, and wins over Chaos Castle (:9930, :9945, :9183-9246)', () => {
    state.enemy = 7;
    expect(wear({ charClass: C.DarkLord }).fronts[2]).toBe('Player/DarklordRobe.OZT');
    expect(wear({ charClass: C.RageFighter }).fronts[0]).toBe('Item/NCcape.OZT');
    expect(wear({ chaosCastle: true })).toMatchObject({ light: RED, fronts: ['Player/Robe01.OZJ'] });
  });

  it('keeps a duelist\'s robe under a ring\'s body unless it is a Magic Gladiator\'s (CheckDarkCloak, :9953)', () => {
    state.enemy = 7;
    expect(wear({ skin: 'panda.glb' }).fronts).toEqual(['Player/Robe01.OZJ']);
    expect(wear({ charClass: C.MagicGladiator, skin: 'panda.glb' }).fronts).toEqual([]);
  });

  it('cloaks no duelist in a monster\'s body (the original hangs its class\'s cloths on the monster\'s bones)', () => {
    state.enemy = 7;
    expect(wear({ monster: 7, rig: false })).toMatchObject({ light: [1, 1, 1], fronts: [] });
  });
});

describe('the Battle Soccer colours (ZzzCharacter.cpp:9190-9232)', () => {
  beforeEach(() => {
    state.marks.set(1, { name: 'Ours' }).set(2, { name: 'Theirs' }).set(3, { name: 'Others' });
    state.social.myGuild = { id: 1 };
  });

  it('colours the hero\'s guild and the guild it plays by the hero\'s team', () => {
    state.social.guildWar = { enemyGuild: 'Theirs', soccer: true, team: 0 };
    expect([wear({ guild: 1 }).light, wear({ guild: 2 }).light, wear({ guild: 3 }).light]).toEqual([RED, BLUE, [1, 1, 1]]);
    state.social.guildWar.team = 1;
    expect([wear({ guild: 1 }).light, wear({ guild: 2 }).light]).toEqual([BLUE, RED]);
    // A plain guild war colours nobody.
    state.social.guildWar.soccer = false;
    expect(wear({ guild: 2 }).fronts).toEqual([]);
  });

  it('colours the two teams the score names, red and blue, for players and watchers alike (SoccerObserver, WSclient.cpp:8154-8170)', () => {
    state.social.battleSoccer = { redTeam: 'Others', blueTeam: 'Ours' };
    expect([wear({ guild: 3 }).light, wear({ guild: 1 }).light, wear({ guild: 2 }).light]).toEqual([RED, BLUE, [1, 1, 1]]);
    expect(wear({ guild: 3 }).fronts).toEqual(['Player/Robe01.OZJ']);
  });
});
