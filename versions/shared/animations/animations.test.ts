import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { animations, playerActionEnumSource, type AnimationDef, type MonsterCastDef, type MonsterSwingDef } from '@/controllers/anim';
import { PlayerAction } from '../objects/enum';

const clips = import.meta.glob<AnimationDef>(['./*.ts', '!./all.ts', '!./write_enum.ts', '!./*.test.ts'], { eager: true, import: 'default' });
const swings = import.meta.glob<MonsterSwingDef>('./monster_swings/*.ts', { eager: true, import: 'default' });
const casts = import.meta.glob<MonsterCastDef>('./monster_casts/*.ts', { eager: true, import: 'default' });

describe('animation files', () => {
  it('are named after their clip', () => {
    for (const [path, def] of Object.entries(clips)) {
      expect(path).toBe(`./${def.name.toLowerCase().replace(/^player_/, '')}.ts`);
    }
  });

  it('number the clips 0..n-1 once each, as the GLB clip list does', () => {
    const ids = Object.values(clips).map(d => d.action).sort((a, b) => a - b);
    expect(ids).toEqual(ids.map((_, i) => i));
  });

  it('are all registered', () => {
    expect(animations.all()).toHaveLength(Object.keys(clips).length);
  });

  it('match PlayerAction (run `bun versions/shared/animations/write_enum.ts` after adding one)', () => {
    const text = readFileSync(`${__dirname}/../objects/enum.ts`, 'utf8').replace(/\r\n/g, '\n');
    expect(text).toContain(playerActionEnumSource(animations.all()));
  });

  it('name existing clips as their female variant', () => {
    for (const d of animations.all()) if (d.female) expect(animations.get(PlayerAction[d.female])).toBeDefined();
  });

  it('give each server action one clip', () => {
    const all = animations.all().flatMap(d => d.serverActions ?? []);
    expect(new Set(all).size).toBe(all.length);
  });
});

describe('monster swing and cast files', () => {
  it('match a monster or a body, under unique names', () => {
    const defs = Object.values(swings);
    for (const d of defs) expect((d.monsters?.length ?? 0) + (d.models?.length ?? 0)).toBeGreaterThan(0);
    expect(new Set(defs.map(d => d.name)).size).toBe(defs.length);
  });

  it('claim each monster once among the rules of one kind', () => {
    for (const mapped of [false, true]) {
      const keys = Object.values(swings)
        .filter(d => (d.worlds !== undefined) === mapped)
        .flatMap(d => [...(d.monsters ?? []).map(m => `n${m}`), ...(d.models ?? []).map(m => `m${m}`)]);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it('name each skill once', () => {
    const skills = Object.values(casts).map(c => c.skill);
    expect(new Set(skills).size).toBe(skills.length);
  });
});
