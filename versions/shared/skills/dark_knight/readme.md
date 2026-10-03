# dark_knight

Dark Knight skills, one folder per skill. Rules for skill folders: [../readme.md](../readme.md).

## Public API
- Each folder's default export is a `defineSkill`, found by glob in `../index.ts`.
- `combo/state.ts`: `observeSkillAnimation`, `comboFlash`, `comboKnockUp`, `combosLanded`,
  `SKILL_COMBO`, `comboLayer`. The combo itself is judged by the server; the client only hears
  a `SkillAnimation` with id 59 and plays its `sound` (eCombo). A combo kill knocks the body
  back (`kill: { knock: true }`).
- `slash/` exports `slashOddSwing` (the odd-SwordCount clip, also used by its strengthener).

## How it works

| Folder | Ids | Look |
|---|---|---|
| `defense` | 18 | the guard clip and sound only; the original draws nothing |
| `falling_slash` | 19, 328 str | sword clip, weapon trail, spark at the blow |
| `lunge` | 20, 329 str | sword clip, weapon trail, spark at the blow |
| `uppercut` | 21 | sword clip, weapon trail, spark at the blow |
| `cyclone` | 22, 326 str, 479 str (MG) | as 19-21 on the SWORD4 clip |
| `slash` | 23, 327 str | as 19-21 on the even SWORD5 swing |
| `twisting_slash` | 41, 330 str, 332 mastery, 481 str (MG) | five copies of the weapon whirl round the knight |
| `rageful_blow` | 42, 331 str, 333 mastery | the weapon is thrown up and the ground breaks in front |
| `death_stab` | 43, 336 str, 339 prof, 342 mastery | red streaks, a blue drill, the victim's electrified skeleton |
| `crescent_moon_slash` | 44 | a charge of sparks at the feet, then a sword force running ahead |
| `impale` | 47 | threads on the spear point, a white spiral cone, six spears |
| `swell_life` | 48, 356 str, 360 prof, 363 mastery | spirit ring, orange glows, a rising column and ground rings |
| `fire_breath` | 49 | rider skill: a shotgun of fire and sparks |
| `combo` | 59 | the combo model and its 60 rays at the caster, target knocked up |
| `strike_of_destruction` | 232, 337 str, 340 prof, 343 mastery | blow of destruction at the target's feet |
| `blood_storm` | 344, 346 str | no original; a renewed look from original art |

"Enhanced" in a skill's comment is the graded look drawn on higher lighting tiers.

`_shared.ts` holds:
- sword blow steps: `atSwordBlow`, `swordSpark`, `litBlow`, `strikeOn`;
- the wielded weapon and its scale and light: `wieldedWeapon`, `itemScale`, `ITEM_LIGHT`;
- joint sparks: `JOINT_SPARKS`, `JOINT_SPARKS_HD`, `SPARK_CHIPS_HD`, `jointSpark`, `sparkHeading`;
- helpers: `rand`, `muAngles`, `terrainLevel`, `sayAt`, `tailOfSlot`, `DRILL_EMITTER_TICKS`.

## Depends on / used by
- uses: `../_shared.ts`, `@/controllers/{skills,fx,lighting,sound,combat}`
- used by: `../index.ts` (glob); `combo/state.ts` by the `SkillAnimation` handler, effects, HUD
  and the death system

## Change it
- see [docs/how_to/add_skill.md](../../../../docs/how_to/add_skill.md).

## Tests
- Covered by the golden tests in `../` (`skillVisuals.golden.test.ts`, `skillTables.golden.test.ts`).
