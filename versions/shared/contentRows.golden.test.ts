import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { PlayerAction } from './objects/enum';
import type { ENUM_WORLD } from '@/core/types';
import type { World } from '@/ecs/world';
// The fx facade first: its layer list imports monsterVisuals, which reads the facade back.
import '@/controllers/fx';
import { meshAnimationFor } from '@/controllers/render/meshAnimation';
import { footstepSound } from '@/controllers/sound/footsteps';
import { attachListener } from '@/controllers/sound/listener';
import { mapDeathBurst } from '@/controllers/sound';
import { ambientDustFor, ambientLeavesFor } from '@/controllers/weather';
import { boidsFor } from '@/controllers/fx/boids';
import { meteoriteStormRunning, monsterCastQuiet, teleportCastSound } from '@/controllers/sound/packetSounds';
import { hasWarriorGlint } from '@/controllers/skills';
import { characterLightFor } from '@/controllers/lighting/characters';
import { monsterVisualFor } from '@/controllers/fx/monsterVisuals';
import { shatterDeathFor } from '@/controllers/fx/deathVisuals';
import { GameOptions } from '@/controllers/settings/gameOptions';
// The skill files fill the warrior-glint rows (`registerSkills`).
import './skills';

/**
 * The per-map, per-monster and per-skill rows that used to sit in controllers and systems, as
 * behaviour: mesh animations, footsteps, the Chaos Castle death burst, leaves and dust rooms, boids,
 * the packet sounds' monster rows, the warrior glint, character lights, monster body effects and
 * shatter deaths. Pinned before the rows moved into their map, monster and skill files; the hashes
 * must not move with them. Update on purpose only.
 */
const HASHES = {
  meshAnimations: 'fb34c349228a0f03b2eb6125d59ad9fadd30669896b65e63c2fd1697e3366029',
  footsteps: 'bc29165166ef34d17ea6a9608e886848c69712c0208812d9e4e2949a459e312b',
  deathBurst: 'baf4b07991baf76832a9ae71199d6a35ca39b6aaf1644e9f353257ccbe82c432',
  ambient: '41300460968ce59b12238edc77287ba84361b0631534c0cb77a0eee3f3b8a5c3',
  boids: '97656f6281a53a6923d537a8a2eb80fdf3b362f8aa90f3c6de64bbab9beedf28',
  packetSounds: 'b2ba044b23b516f77ad3d7dd87882521c6105384468e8f6e92798dfc45f26d30',
  warriorGlint: '1389fbfce19304f55df3cdc1db7fb6e86d7c4702b4625de504f1f43bd66dacfe',
  characterLights: 'b902ca420087248e66c327a109ca93da5c7ecdee74bde201beb512b28ab8b738',
  monsterVisuals: 'a6c5a8fec858b4dea784db73e931a84d28df0d2a01ed8475a93bc60a909e8ffa',
  shatterDeaths: '9ef072504d008f0ed2dda2bcc09725dac989e61bae8d6ff73b2f20b5ee6e72e1',
};

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

afterEach(() => vi.restoreAllMocks());

const WORLDS = Array.from({ length: 90 }, (_, i) => i as ENUM_WORLD);
const OBJECT_TYPES = Array.from({ length: 400 }, (_, i) => i);
const MONSTERS = Array.from({ length: 1000 }, (_, i) => i);
const MODELS = Array.from({ length: 400 }, (_, i) => i);
const SKILLS = Array.from({ length: 1000 }, (_, i) => i);
const TIMES = [0, 37, 500, 1234, 9999, 49999, 123456];

const hash = (v: unknown) => createHash('sha256').update(JSON.stringify(v ?? null)).digest('hex');

describe('content rows', () => {
  it('mesh animations', () => {
    // The flickers roll `rand()` every frame: one fixed draw keeps the rows comparable.
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const rows = WORLDS.map(w =>
      OBJECT_TYPES.map(t => {
        const a = meshAnimationFor(w, t);
        if (!a) return null;
        return {
          mesh: a.mesh,
          kind: a.kind,
          u: a.u ? TIMES.map(a.u) : null,
          v: a.v ? TIMES.map(a.v) : null,
          light: a.light ? TIMES.map(a.light) : null,
        };
      })
    );
    expect(hash(rows)).toBe(HASHES.meshAnimations);
  });

  it('footsteps', () => {
    const hero = {
      worldIndex: 0 as ENUM_WORLD,
      transform: { pos: { x: 10, y: 0, z: 10 } },
      playerAnimation: { action: PlayerAction.PLAYER_WALK_MALE },
      safe: false,
      attributeSystem: { isAboveZero: () => hero.safe },
    };
    let tile = 0;
    attachListener({ playerEntity: hero, getTerrainTile: () => tile } as unknown as World);
    const rows = WORLDS.map(w => {
      hero.worldIndex = w;
      const out: (string | null)[] = [];
      for (tile = 0; tile < 16; tile++) {
        for (const safe of [false, true]) {
          hero.safe = safe;
          out.push(footstepSound());
        }
      }
      return out;
    });
    expect(hash(rows)).toBe(HASHES.footsteps);
  });

  it('chaos castle death burst', () => {
    const rows = WORLDS.map(w => mapDeathBurst(w) ?? null);
    expect(hash(rows)).toBe(HASHES.deathBurst);
  });

  it('leaves and dust rooms', () => {
    const rows = WORLDS.map(w => ({
      leaves: ambientLeavesFor(w)?.name ?? null,
      rooms: ambientDustFor(w).map(r => ({ room: r.room, recipe: r.recipe.name })),
    }));
    expect(hash(rows)).toBe(HASHES.ambient);
  });

  it('boids', () => {
    const rows = WORLDS.map(w => [0, 1, 3].map(invasion => boidsFor(w, invasion)));
    expect(hash(rows)).toBe(HASHES.boids);
  });

  it('packet sounds: quiet casts, teleport, meteorite storm', () => {
    const casts = [3, 6, 15, 17, 50];
    const quiet = casts.map(s => ({
      monsters: MONSTERS.map(m => monsterCastQuiet(m, -1, s)),
      models: MODELS.map(m => monsterCastQuiet(-1, m, s)),
    }));
    const teleport = [6, 15, 17].map(s => WORLDS.map(w => MONSTERS.filter(m => teleportCastSound(w, m, s)).map(m => [m, teleportCastSound(w, m, s)])));
    const storm = casts.map(skill =>
      MONSTERS.map(m => [500, 1500].map(now => meteoriteStormRunning(m, { skill, skillClearsAt: 1000 } as never, now)))
    );
    expect(hash({ quiet, teleport, storm })).toBe(HASHES.packetSounds);
  });

  it('warrior glint', () => {
    const rows = SKILLS.map(s => [hasWarriorGlint(s, false), hasWarriorGlint(s, true)]);
    expect(hash(rows)).toBe(HASHES.warriorGlint);
  });

  it('character lights', () => {
    const was = GameOptions.lightingQuality;
    const rows = [0, 1, 2].map(q => {
      GameOptions.lightingQuality = q;
      return MONSTERS.map(m => characterLightFor(m) ?? null);
    });
    GameOptions.lightingQuality = was;
    expect(hash(rows)).toBe(HASHES.characterLights);
  });

  it('monster body effects', () => {
    expect(hash(MONSTERS.map(m => monsterVisualFor(m) ?? null))).toBe(HASHES.monsterVisuals);
  });

  it('shatter deaths', () => {
    const rows = MODELS.map(m => {
      const s = shatterDeathFor(m);
      return s ? { spawn: s.spawn.toString(), sound: s.sound ?? null } : null;
    });
    expect(hash(rows)).toBe(HASHES.shatterDeaths);
  });
});
