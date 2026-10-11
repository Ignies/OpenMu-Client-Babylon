import { afterEach, describe, expect, it, vi } from 'vitest';
import './skillVisuals';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { FIDELITY_CLASSIC, FIDELITY_DEFAULT, setFidelityChoice } from '@/controllers/fidelity';
import { tiered, type SkillContext } from '@/controllers/skills/visuals';
import '../improvements/all';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

afterEach(() => setFidelityChoice(FIDELITY_DEFAULT, {}));

// Ours: a skill's two looks, picked at each cast by the Skill effects selector (`enhancedSkillEffects`).
describe('tiered', () => {
  it('runs the original on Classic and ours on Enhanced', () => {
    const ran: string[] = [];
    const step = tiered(() => void ran.push('original'), () => void ran.push('enhanced'));
    const c = {} as SkillContext;
    step(new Vector3(), c);
    setFidelityChoice(FIDELITY_CLASSIC, {});
    step(new Vector3(), c);
    setFidelityChoice(FIDELITY_DEFAULT, { enhancedSkillEffects: false });
    step(new Vector3(), c);
    expect(ran).toEqual(['enhanced', 'original', 'original']);
  });
});
