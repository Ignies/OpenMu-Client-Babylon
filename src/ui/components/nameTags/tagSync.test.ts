import { describe, expect, it } from 'vitest';
import {
  PARKED_TRANSFORM,
  TAG_INPUT_KEYS,
  type TagInputs,
  type TagSlot,
  layoutTags,
  lifeBucket,
  newTagInputs,
  newTagSlot,
  syncTagInputs,
} from './tagSync';
import { CHAT_FADE_TICKS } from '../../../common/nameTags';

type FakeEl = {
  offsetWidth: number;
  offsetHeight: number;
  writes: number;
  style: { transform: string };
};

function fakeEl(width: number, height: number): FakeEl {
  let transform = '';
  const el: FakeEl = {
    offsetWidth: width,
    offsetHeight: height,
    writes: 0,
    style: {
      get transform() {
        return transform;
      },
      set transform(value: string) {
        transform = value;
        el.writes++;
      },
    },
  };
  return el;
}

type Anchor = { screenPosition: { x: number; y: number } };

function slot(
  x: number,
  y: number,
  width: number,
  height: number,
  visible = true
): TagSlot<Anchor, FakeEl> {
  const s = newTagSlot({ screenPosition: { x, y } }, fakeEl(width, height));
  s.visible = visible;
  return s;
}

/** As the ResizeObserver leaves it: the element's own offset size. */
function measured(s: TagSlot<Anchor, FakeEl>): TagSlot<Anchor, FakeEl> {
  s.width = s.el.offsetWidth;
  s.height = s.el.offsetHeight;
  return s;
}

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('layoutTags', () => {
  it('matches the measuring pass, frame after frame', () => {
    const random = rng(19);
    for (let round = 0; round < 100; round++) {
      const count = 1 + Math.floor(random() * 40);
      const legacy: TagSlot<Anchor, FakeEl>[] = [];
      const cached: TagSlot<Anchor, FakeEl>[] = [];
      for (let i = 0; i < count; i++) {
        const x = random() * 900 - 50;
        const y = random() * 700 - 50;
        const w = 20 + Math.floor(random() * 120);
        const h = 13 * (1 + Math.floor(random() * 4));
        legacy.push(slot(x, y, w, h));
        cached.push(measured(slot(x, y, w, h)));
      }
      for (let frame = 0; frame < 6; frame++) {
        for (let i = 0; i < count; i++) {
          const visible = random() > 0.2;
          const dx = random() < 0.5 ? 0 : random() * 6 - 3;
          const dy = random() < 0.5 ? 0 : random() * 6 - 3;
          for (const s of [legacy[i], cached[i]]) {
            s.visible = visible;
            s.entity.screenPosition.x += dx;
            s.entity.screenPosition.y += dy;
          }
        }
        layoutTags(legacy, 800, 600, true);
        layoutTags(cached, 800, 600);
        for (let i = 0; i < count; i++) {
          expect(cached[i].el.style.transform).toBe(
            legacy[i].el.style.transform
          );
        }
      }
    }
  });

  it('pushes the earlier slot away from the later one', () => {
    const a = measured(slot(100, 100, 50, 13));
    const b = measured(slot(100, 105, 50, 13));
    layoutTags([a, b], 800, 600);
    expect(a.el.style.transform).toBe('translate(75px, 79px)');
    expect(b.el.style.transform).toBe('translate(75px, 92px)');

    const c = measured(slot(100, 100, 50, 13));
    const d = measured(slot(100, 105, 50, 13));
    layoutTags([d, c], 800, 600);
    expect(c.el.style.transform).toBe('translate(75px, 87px)');
    expect(d.el.style.transform).toBe('translate(75px, 74px)');
  });

  it('writes a transform only when the floored position moves', () => {
    const s = measured(slot(100.2, 100, 50, 13));
    layoutTags([s], 800, 600);
    expect(s.el.writes).toBe(1);

    layoutTags([s], 800, 600);
    s.entity.screenPosition.x = 100.6;
    layoutTags([s], 800, 600);
    expect(s.el.writes).toBe(1);

    s.entity.screenPosition.x = 102;
    layoutTags([s], 800, 600);
    expect(s.el.writes).toBe(2);
    expect(s.el.style.transform).toBe('translate(77px, 87px)');
  });

  it('parks a hidden slot once and rewrites it when it comes back', () => {
    const s = measured(slot(100, 100, 50, 13));
    layoutTags([s], 800, 600);
    const shown = s.el.style.transform;

    s.visible = false;
    layoutTags([s], 800, 600);
    layoutTags([s], 800, 600);
    expect(s.el.style.transform).toBe(PARKED_TRANSFORM);
    expect(s.el.writes).toBe(2);

    s.visible = true;
    layoutTags([s], 800, 600);
    expect(s.el.style.transform).toBe(shown);
    expect(s.el.writes).toBe(3);
  });

  it('writes a new hidden slot once, as the measuring pass did', () => {
    const s = measured(slot(0, 0, 50, 13, false));
    layoutTags([s], 800, 600);
    expect(s.el.style.transform).toBe(PARKED_TRANSFORM);
    expect(s.el.writes).toBe(1);
  });

  it('writes every pass on the legacy path', () => {
    const s = slot(100, 100, 50, 13);
    layoutTags([s], 800, 600, true);
    layoutTags([s], 800, 600, true);
    expect(s.el.writes).toBe(2);
  });
});

describe('lifeBucket', () => {
  it('follows the balloon: gone, faded, full', () => {
    expect(lifeBucket(0)).toBe(0);
    expect(lifeBucket(-0.5)).toBe(0);
    expect(lifeBucket(NaN)).toBe(0);
    expect(lifeBucket(0.01)).toBe(1);
    expect(lifeBucket(CHAT_FADE_TICKS - 0.01)).toBe(1);
    expect(lifeBucket(CHAT_FADE_TICKS)).toBe(2);
    expect(lifeBucket(1000)).toBe(2);
  });
});

describe('syncTagInputs', () => {
  const read = (): TagInputs => ({
    ...newTagInputs(),
    name: 'Ann',
    life0: 0,
  });

  it('always rebuilds on the first check', () => {
    const fresh = newTagInputs();
    const zeroed = { ...newTagInputs(), life0: lifeBucket(0) };
    expect(syncTagInputs(fresh, zeroed)).toBe(true);
  });

  it('reports no change for the same values', () => {
    const prev = read();
    expect(syncTagInputs(prev, read())).toBe(false);
  });

  it('reports a change in any single field and keeps it', () => {
    const changed: TagInputs = {
      name: 'Bob',
      color: 6,
      isGm: true,
      isHero: true,
      guildId: 3,
      guildRole: 128,
      guild: {},
      guildName: 'Guild',
      alliance: 'Union',
      logo: [1, 2, 3],
      relation: 2,
      team: 1,
      selfDefense: true,
      shopTitle: 'Cheap',
      text0: 'hi',
      text1: 'there',
      life0: 2,
      life1: 1,
      blink: true,
      language: 1,
    };
    expect(Object.keys(changed).sort()).toEqual([...TAG_INPUT_KEYS].sort());

    for (const key of TAG_INPUT_KEYS) {
      const prev = read();
      const next = { ...read(), [key]: changed[key] };
      expect(syncTagInputs(prev, next)).toBe(true);
      expect(prev[key]).toBe(changed[key]);
      expect(syncTagInputs(prev, next)).toBe(false);
    }
  });
});
