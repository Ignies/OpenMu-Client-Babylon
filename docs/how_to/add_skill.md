# Add or change a skill

## Change one

1. Find its folder: `versions/shared/skills/<class>/<skill>/` (Nova:
   `dark_wizard/nova/`). Master variants are the other files in that folder.
2. Edit its `defineSkill({...})`: `visual`, `light`, `sound`, `clip`, `delayMs`, `target`, `stepIn`,
   `buffs`. Skill-only logic (Nova's `charge.ts`) sits in the same folder.
3. Run `bunx vitest run versions/shared/skills`. The golden test for that id changes: that is the
   point of the change. Update the snapshot with `-u` and say what changed in the PR.

## Add one

1. Create `versions/shared/skills/<class>/<snake_name>/index.ts`:

   ```ts
   import { defineSkill } from '@/controllers/skills/define';
   import { fireHit, seq } from '@/controllers/skills/visuals';

   export default defineSkill({
     id: 999,
     name: 'New Skill',
     sound: 'Sound/sFlame',
     visual: { impact: seq(fireHit) },
   });
   ```

2. Nothing else to register: `versions/shared/skills/index.ts` finds it by glob.
3. Build visuals from the steps in `src/controllers/skills/visuals.ts` and shared blocks in
   `skills/_shared.ts` and `<class>/_shared.ts`; spawn effects through `effects.spawn`.
4. Run the golden tests with `-u` once to record the new id, then the full checks.

## Rules

- A skill file imports controllers and shared skill blocks, never another skill's folder.
- Something two skills share moves to `<class>/_shared.ts` (one class) or `skills/_shared.ts`.
- Cite the original source line for ported looks.

## Skill-only rules

A skill that behaves differently from the generic rules says so in its own file, never with a
branch in a controller. The fields are listed in [docs/content.md](../content.md) (Skill-only
rules). Examples:

- a clip picked by the map or a coin toss: `clip: ctx => ...`; by the hands: `poseClip`.
- a hit does not interrupt its clip: `noFlinch: [A.PLAYER_SKILL_...]`.
- the sound plays when the effect lands: `soundOnLanding: true` (the visual calls `playLandingSound`).
- a kill knocks the body back: `kill: { knock: true }`.
- a master number with no file draws as this skill: add it to `lookAliases`.

If no field fits, add one to `SkillDef` (`src/controllers/skills/define.ts`) and write it in
`registerSkills` (combat fields: `src/controllers/combat/skillRules.ts`). Pin the behaviour with a
test first (`versions/shared/skills/skillRules.golden.test.ts` covers the cast rules).
