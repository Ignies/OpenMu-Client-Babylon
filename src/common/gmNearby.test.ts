import { describe, expect, it } from 'vitest';
import { nearbyOf, type Nearby } from './gmNearby';
import type { Entity } from '../ecs/world';

/**
 * `nearbyOf` is what the panel's Nearby list and its radar both read, so the
 * kind it decides and the distance it measures are what a game master acts on:
 * the wrong kind offers the wrong buttons, and the wrong distance sorts the
 * person in front of them below a scorpion.
 */

const at = (x: number, y: number, extra: Partial<Entity> = {}): Entity => ({
  netId: Math.round(x * 1000 + y),
  transform: { pos: { x, y: 0, z: y }, rot: { x: 0, y: 0, z: 0 }, scale: 1 },
  ...extra,
});

const player = (x: number, y: number, name: string, extra: Partial<Entity> = {}): Entity =>
  at(x, y, {
    playerAnimation: { action: 0, run: 0 } as Entity['playerAnimation'],
    objectNameInWorld: name,
    ...extra,
  });

const monster = (x: number, y: number, npcType: number): Entity =>
  at(x, y, {
    monsterAnimation: { action: 0 } as Entity['monsterAnimation'],
    npcType,
  });

describe('nearbyOf', () => {
  it('measures distance the way MU does, by the longer axis', () => {
    // Chebyshev, not Pythagoras: three east and four north is four tiles away,
    // which is the range every command and every scope check uses.
    const [entry] = nearbyOf([player(103, 104, 'Ann')], 100, 100);
    expect(entry.distance).toBe(4);
  });

  it('reads the tile a body stands on, not its smooth position', () => {
    const [entry] = nearbyOf([player(120.94, 60.02, 'Ann')], 100, 100);
    expect([entry.x, entry.y]).toEqual([120, 60]);
  });

  it('tells a player from a monster from an npc', () => {
    const found = nearbyOf(
      [player(101, 100, 'Ann'), monster(102, 100, 3), at(103, 100, { npcType: 230 })],
      100,
      100
    );

    expect(found.map(e => e.kind)).toEqual(['player', 'monster', 'npc']);
  });

  it('puts players first, then everything by how close it is', () => {
    const found = nearbyOf(
      [
        monster(101, 100, 3),
        player(140, 100, 'Far'),
        monster(105, 100, 4),
        player(102, 100, 'Near'),
      ],
      100,
      100
    );

    expect(found.map(e => e.name)).toEqual(['Near', 'Far', 'Spider', 'Bull Fighter']);
  });

  it('leaves out the hero, anything out of scope, and anything with no position', () => {
    const found = nearbyOf(
      [
        player(101, 100, 'Me', { localPlayer: true }),
        player(102, 100, 'Gone', { objOutOfScope: true }),
        { netId: 9 } as Entity,
        player(103, 100, 'Ann'),
      ],
      100,
      100
    );

    expect(found.map(e => e.name)).toEqual(['Ann']);
  });

  it('leaves out anything that is neither a body nor an npc', () => {
    // A dropped item carries a netId and a position and nothing else; it is
    // not something a game master aims a command at.
    const found = nearbyOf([at(101, 100)], 100, 100);
    expect(found).toEqual([]);
  });

  it('keeps a dying body, marked, because it is still there to act on', () => {
    const found = nearbyOf(
      [player(101, 100, 'Ann', { dying: { time: 0 } as Entity['dying'] })],
      100,
      100
    );

    expect(found[0]).toMatchObject({ name: 'Ann', dying: true });
  });

  it('names a monster from its type when the server sent no name', () => {
    const [entry] = nearbyOf([monster(101, 100, 3)], 100, 100);
    expect(entry.name).toBe('Spider');
  });

  it('falls back to the net id for a nameless player', () => {
    const [entry] = nearbyOf([player(101, 100, '')], 100, 100);
    expect(entry.name).toBe(`#${entry.netId}`);
  });

  it('carries the GM flag through, so the list can mark them', () => {
    const [entry] = nearbyOf([player(101, 100, 'Ann', { isGm: true })], 100, 100);
    expect(entry.isGm).toBe(true);
  });
});
