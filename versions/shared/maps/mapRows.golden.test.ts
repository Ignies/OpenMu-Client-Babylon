import { describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import {
  ambientBedsFor,
  ambientOneShotsFor,
  ambientTimedFor,
  ambientBedsLayer,
} from '@/controllers/sound/ambientBeds';
import { mapMusic, townMusic, worldPlays } from '@/controllers/sound/music';
import { objectLoopsFor, objectLoopsLayer } from '@/controllers/sound/objectLoops';
import { mapMonsterCues } from '@/controllers/sound/mapMonsters';
import { SOUND_KEYS, isMusicKey } from '@/controllers/sound/recipes';
import { areaProfile, profileFor } from '@/controllers/lighting/profiles';
import { lightEmittersFor, type LightEmitter } from '@/controllers/lighting/mapObjectLights';
import { skyLayer } from '@/controllers/lighting/sky';
import { alwaysRains } from '@/controllers/weather/rainState';
import { wetnessLayer } from '@/controllers/weather/wetness';
import { SNOW_MAPS, SNOWFALL_MAPS, UNDERWATER_MAPS } from '@/controllers/weather/ambientWeather';
import { SNOW_GROUND_MAPS, snowCoverLayer } from '@/controllers/weather/snowCover';
import { snowSinkLayer } from '@/controllers/weather/snowSink';
import { snowCoverFor, terrainOverlaysFor } from '@/controllers/terrain/terrainOverlay';
import { terrainWaterFor } from '@/controllers/terrain/terrainWater';
import { leanCursorObjects, findRestObject } from '@/controllers/terrain/restObjects';
import { mapObjectFixupsFor } from '@/controllers/terrain/mapObjectFixups';
import { grassAllowed } from '@/controllers/terrain/terrainGrass';
import {
  BLOOD_CASTLE_WORLDS,
  CHAOS_CASTLE_WORLDS,
  CURSED_TEMPLE_WORLDS,
  DEVIL_SQUARE_WORLDS,
  DOPPELGANGER_WORLDS,
  EMPIRE_GUARDIAN_WORLDS,
  KALIMA_WORLDS,
  assetWorldNum,
} from '@/controllers/assets/worldAssets';
import { GameOptions } from '@/controllers/settings/gameOptions';
import { bloodCastleTimer } from '@/modules/events/bloodCastle';
import { chaosCastleTimer } from '@/modules/events/chaosCastle';
import type { ENUM_WORLD } from '@/core/types';

/**
 * Every per-map row the sound, lighting, weather and terrain controllers answer with, for every
 * world, as behaviour. Pinned before the rows left the controllers for the map folders; the hashes
 * must not move with them. Update on purpose only.
 */
const HASHES = {
  beds: 'ae3d764ba4e50dfe0e228f5f055a3a4d9d18da4f0376c722c5c2ce721376c062',
  music: '54f0021bf17d47f2872ad4103ddaf310d57cb5c1e3923d8854886de4c4eaa39d',
  objectLoops: 'e215aeac385d6ba683d233c6c7d62b1c2d64f32f7f291781a537967fcf40559a',
  monsterCues: '4e7ba9bf7341271206e455f17cc01cfcbe27c0645e04dcf06994d0dfacf30e7f',
  looks: 'd4e3c56bf2f7146ac60959ed4f343128aac020c5bcf799c89dc70526b4866c8d',
  objectLights: '6db79cb55e9bbd9f8cd914874923e4e833065b932bb496aebf051dc04d38ea22',
  weather: '534da46d8902e3308061227333539d88da1f7e9f9fea4779b4776607f9b00310',
  terrain: '34e64214ffaa890a0ebd19d0a99cb1b703b495b2b5c957fdecb4f741e4f6145f',
  worldLists: 'a81613a77d651b5d31baaa926f41a3e2608aaf036775046e9c646e4fa5b3172b',
};

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

const WORLDS = Array.from({ length: 90 }, (_, i) => i as ENUM_WORLD);
const OBJECT_TYPES = Array.from({ length: 400 }, (_, i) => i);
const MONSTER_TYPES = Array.from({ length: 1000 }, (_, i) => i);
const TILES = Array.from({ length: 256 }, (_, i) => i);

/** Key order and absent-vs-undefined do not count: only the values. */
function canon(v: unknown): unknown {
  if (v === undefined) return null;
  if (v === Infinity) return 'Infinity';
  if (Array.isArray(v)) return v.map(canon);
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(o)
        .filter(k => o[k] !== undefined)
        .sort()
        .map(k => [k, canon(o[k])])
    );
  }
  return v;
}

const hash = (v: unknown) => createHash('sha256').update(JSON.stringify(canon(v))).digest('hex');

const bits = (n: number, f: (i: number) => boolean) => Array.from({ length: n }, (_, i) => (f(i) ? 1 : 0)).join('');

/** A `when` gate over every event and option state it can read. */
function gateBits(when: (() => boolean) | undefined): string | null {
  if (!when) return null;
  const was = GameOptions.ambientParticles;
  const bc = bloodCastleTimer() as { running: boolean };
  const cc = chaosCastleTimer() as { running: boolean };
  const out = bits(8, i => {
    bc.running = (i & 1) !== 0;
    cc.running = (i & 2) !== 0;
    GameOptions.ambientParticles = (i & 4) !== 0;
    return when();
  });
  GameOptions.ambientParticles = was;
  bc.running = cc.running = false;
  return out;
}

const emitter = (e: LightEmitter) => ({
  ...e,
  emissions: typeof e.emissions === 'function' ? [0.5, 0.7, 0.75, 0.9, 1, 1.2].map(e.emissions) : e.emissions,
});

describe('per-map rows', () => {
  it('sound: beds, one-shots, timed', () => {
    const rows = WORLDS.map(w => ({
      on: ambientBedsLayer.maps?.has(w),
      beds: ambientBedsFor(w).map(b => ({
        sound: b.sound,
        volume: b.volume,
        mutedOn: b.mutedOn ? bits(256, t => b.mutedOn!(TILES[t])) : null,
        when: gateBits(b.when),
      })),
      shots: ambientOneShotsFor(w).map(s => ({ ...s, when: gateBits(s.when) })),
      timed: ambientTimedFor(w),
    }));
    expect(hash(rows)).toBe(HASHES.beds);
  });

  it('sound: music', () => {
    const keys = SOUND_KEYS.filter(isMusicKey);
    const rows = WORLDS.map(w => {
      const town: (string | undefined)[] = [];
      for (let x = 0; x < 256; x++) {
        for (let y = 0; y < 256; y++) town.push(townMusic(w, x, y, (x * 7 + y) % 16, true));
      }
      return {
        music: mapMusic(w),
        town: town.every(t => t === undefined) ? null : hash(town),
        unsafe: townMusic(w, 10, 10, 4, false),
        plays: bits(keys.length, i => worldPlays(w, keys[i])),
      };
    });
    expect(hash(rows)).toBe(HASHES.music);
  });

  it('sound: object loops', () => {
    const rows = WORLDS.map(w => ({
      on: objectLoopsLayer.maps?.has(w),
      loops: objectLoopsFor(w).map(r => ({
        ...r,
        when: r.when
          ? bits(400, i => r.when!({ inSafeZone: i >= 200, time: (i % 200) * 100 }))
          : null,
      })),
    }));
    expect(hash(rows)).toBe(HASHES.objectLoops);
  });

  it('sound: map monster cues', () => {
    const rows = WORLDS.map(w => MONSTER_TYPES.map(t => mapMonsterCues(w, t)));
    expect(hash(rows)).toBe(HASHES.monsterCues);
  });

  it('lighting: looks and rooms', () => {
    const areas = [
      'lorenciaTavern',
      'lorenciaCabin',
      'deviasTavern',
      'deviasReadingRoom',
      'deviasHearthHouse',
      'deviasGuardRoom',
      'deviasCastleHall',
    ] as const;
    const rows = {
      looks: WORLDS.map(w => profileFor(w)),
      areas: areas.map(a => areaProfile(a)),
      sky: WORLDS.map(w => skyLayer.maps?.has(w) ?? null),
    };
    expect(hash(rows)).toBe(HASHES.looks);
  });

  it('lighting: map object lights', () => {
    const rows = WORLDS.map(w => OBJECT_TYPES.map(t => lightEmittersFor(w, t)?.map(emitter) ?? null));
    expect(hash(rows)).toBe(HASHES.objectLights);
  });

  it('weather', () => {
    const rows = WORLDS.map(w => ({
      always: alwaysRains(w),
      wet: wetnessLayer.maps?.has(w) ?? null,
      snow: SNOW_MAPS.has(w),
      snowfall: SNOWFALL_MAPS.has(w),
      underwater: UNDERWATER_MAPS.has(w),
      ground: SNOW_GROUND_MAPS.has(w),
      cover: snowCoverLayer.maps?.has(w) ?? null,
      sink: snowSinkLayer.maps?.has(w) ?? null,
    }));
    expect(hash(rows)).toBe(HASHES.weather);
  });

  it('terrain', () => {
    GameOptions.advancedEffects = true;
    GameOptions.animatedWater = true;
    const rows = WORLDS.map(w => ({
      overlays: terrainOverlaysFor(w).map(o => ({ name: o.name, bed: o.bed ?? null })),
      snowBed: snowCoverFor(w).bed ?? null,
      water: terrainWaterFor(w),
      rest: OBJECT_TYPES.map(t => findRestObject(w, t) ?? null),
      lean: [...(leanCursorObjects(w) ?? [])],
      fixups: mapObjectFixupsFor(w),
      grass: grassAllowed(w),
    }));
    expect(hash(rows)).toBe(HASHES.terrain);
  });

  it('event world lists', () => {
    const rows = {
      lists: [
        DEVIL_SQUARE_WORLDS,
        BLOOD_CASTLE_WORLDS,
        CHAOS_CASTLE_WORLDS,
        KALIMA_WORLDS,
        CURSED_TEMPLE_WORLDS,
        EMPIRE_GUARDIAN_WORLDS,
        DOPPELGANGER_WORLDS,
      ].map(l => [...l]),
      assets: WORLDS.map(w => assetWorldNum(w)),
    };
    expect(hash(rows)).toBe(HASHES.worldLists);
  });
});
