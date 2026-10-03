import { afterAll, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';

// Characterization net for moving the skill-only rules out of the controllers: the cast clip
// per pose and context, SwordCount, clip-paired and landing sounds, the clips that hold facing
// or ignore a hit, master aliases and the skill -> effect table.

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
  // Data/ is not there under Node: a fetch never answers, so no texture or name loader rejects later.
  g.fetch = () => new Promise(() => {});
});

const played: unknown[] = [];
vi.mock('@/controllers/sound/listener', async importOriginal => ({
  ...(await importOriginal<object>()),
  playSfx: (key: unknown) => {
    played.push(key);
  },
}));

import { PlayerAction } from '@versions/shared/objects/enum';
import { ENUM_WORLD } from '@/core/types';
import type { Item } from '@/ecs/world';
import type { AttackPose } from '@/controllers/actors/weaponClass';
import type { CastContext } from '@/controllers/combat/skillClips';
import { BaseClass } from '@/features/hero/characterStats';
import { advancesSwordCount, chooseSkillAction } from '@/features/skills/skillCasting';
import { masterBase } from '@/features/skills/skillAliases';
import { SKILL_EFFECTS } from '@/features/skills/recipes';
import { clipCastSound } from '@/controllers/sound/combat';
import { clipHoldsFacing } from '@/controllers/combat/skillMovement';
import { SHOCK_IMMUNE_CLIPS } from '@/controllers/combat/recipes';
import { playLandingSound } from '@/controllers/sound/combat';
import { baseSkill, skillVisualCount } from './skillVisuals';
import { skillDefinition } from './skillsDatabase';

const IDS = Array.from({ length: 701 }, (_, i) => i);
const ACTIONS = Object.values(PlayerAction).filter((v): v is PlayerAction => typeof v === 'number');
const name = (a: PlayerAction) => PlayerAction[a];
const hash = (v: unknown) => createHash('sha1').update(JSON.stringify(v)).digest('hex').slice(0, 16);

const item = (group: number, num: number): Item => ({ group, num }) as Item;
const HANDS = [
  undefined,
  { leftHand: item(0, 0), rightHand: null },
  { leftHand: item(0, 0), rightHand: item(0, 1) },
  { leftHand: null, rightHand: item(6, 0) },
  { leftHand: item(4, 15), rightHand: item(4, 0) },
  { leftHand: item(5, 0), rightHand: null },
];
const CLASSES = [BaseClass.Knight, BaseClass.Elf, BaseClass.RageFighter, BaseClass.Wizard];
const CONTEXTS: CastContext[] = [];
for (const mount of [null, 'uniria', 'horse', 'fenrir'] as const)
  for (const isFemale of [false, true])
    for (const world of [ENUM_WORLD.WD_0LORENCIA, ENUM_WORLD.WD_8TARKAN])
      for (const alternate of [false, true]) CONTEXTS.push({ mount, isFemale, world, alternate });

describe('skill rules golden', () => {
  const realRandom = Math.random;
  afterAll(() => {
    Math.random = realRandom;
  });

  it('cast clip and SwordCount per pose and context', () => {
    const out: Record<number, unknown> = {};
    for (const id of IDS) {
      const def = skillDefinition(id);
      if (!def) continue;
      const clips: PlayerAction[] = [];
      const sword: boolean[] = [];
      for (const roll of [0.25, 0.75]) {
        Math.random = () => roll;
        for (const ctx of CONTEXTS) {
          sword.push(advancesSwordCount(def, ctx));
          for (const hands of HANDS)
            for (const baseClass of CLASSES)
              for (const swordCount of [0, 1]) {
                const pose: AttackPose = { hands, baseClass, swordCount, wings: false, mount: ctx.mount };
                clips.push(chooseSkillAction(def, pose, ctx));
              }
        }
      }
      out[id] = { clips: [...new Set(clips)].map(name).sort().join(' '), hash: hash(clips), sword: hash(sword) };
    }
    expect(out).toMatchSnapshot();
  });

  it('cast sound paired with the clip', () => {
    const out: Record<number, unknown> = {};
    const clips = [PlayerAction.PLAYER_SKILL_ATT_UP_OURFORCES, PlayerAction.PLAYER_SKILL_HP_UP_OURFORCES, PlayerAction.PLAYER_SKILL_HAND1];
    for (const id of IDS) {
      const sounds = clips.map(c => clipCastSound(id, c));
      if (sounds.some(s => s !== null)) out[id] = sounds;
    }
    expect(out).toMatchSnapshot();
  });

  it('sound played when the effect lands', () => {
    const out: Record<number, unknown> = {};
    for (const id of IDS) {
      played.length = 0;
      playLandingSound(id, null);
      if (played.length) out[id] = [...played];
    }
    expect(out).toMatchSnapshot();
  });

  it('clips that hold facing or ignore a hit', () => {
    expect({
      holdsFacing: ACTIONS.filter(a => clipHoldsFacing(a)).map(name),
      noFlinch: ACTIONS.filter(a => SHOCK_IMMUNE_CLIPS.has(a)).map(name),
    }).toMatchSnapshot();
  });

  it('master aliases', () => {
    const base: Record<number, number> = {};
    const look: Record<number, number> = {};
    for (const id of IDS) {
      if (masterBase(id) !== id) base[id] = masterBase(id);
      if (baseSkill(id) !== id) look[id] = baseSkill(id);
    }
    expect({ base, look, count: skillVisualCount() }).toMatchSnapshot();
  });

  it('skill -> magic effect', () => {
    const out: Record<number, number> = {};
    for (const id of IDS) if (SKILL_EFFECTS[id] !== undefined) out[id] = SKILL_EFFECTS[id];
    expect(out).toMatchSnapshot();
  });
});
