# rage_fighter

Rage Fighter skills, one folder per skill (`MonkSystem.cpp RageCreateEffect`). Rules for skill
folders: [../readme.md](../readme.md).

## Public API
- Each folder's default export is a `defineSkill`, found by glob in `../index.ts`.
- `dark_side/rage.ts`: `isDarkSide`, `darkSideActive`, `beginDarkSide`, `observeDarkSideTargets`,
  `nextDarkSideHit`, `darkSidePendingSkill`, `observeRageHit`, `rageStreak`, `rageLayer`.

## How it works

| Folder | Ids | Look |
|---|---|---|
| `killing_blow` | 260, 551 str, 554 mastery | a wolf head aimed at the target, a burst there |
| `beast_uppercut` | 261, 552 str, 555 mastery | a rising gold burst (the original model is not converted) |
| `chain_drive` | 262, 558 str | sword effect at the caster; past GIANTSWING keys 6 and 11 a blow on the target, the first with a shock wave |
| `dark_side` | 263, 559 str | a dark shock wave chasing the target, damage bursts |
| `dragon_roar` | 264, 560 str | a dragon head, a fire shock ring and scattered fire hits |
| `dragon_slasher` | 265 | the dragon kick model and the multi-shot volley fired forward; a burst on the target each tick past DRAGONKICK key 5 |
| `ignore_defense` | 266 | a red flash; the Ourforces bone glow as a buff look |
| `increase_health` | 267, 573 str | a holy flash; the Ourforces bone glow |
| `increase_block` | 268, 569 power up, 572 mastery | a steel flash; the Ourforces bone glow |
| `charge` | 269 | Rush's charge with fire; a sword force on impact |
| `phoenix_shot` | 270 | a phoenix arrow, a fire hit and the phoenix model |

Timing follows the original's effects, not the packet: most of them read the caster's clip key
or their own LifeTime each 25 Hz tick (`MoveHandlers.cpp`), and drop what is left when the caster
leaves the clip (`eachClipTick`, `whenClipKey(..., 'drop')` in `../_shared.ts`). Ticks count from
the packet; an effect it creates first moves on tick 1.

Dark Side is the one skill on its own wire: the cast sends 0x4B and 0x4A, the server answers with
up to five targets, and the client lands one 0x4A per extra target as the clip's blows come round
(`rage.ts`). It also keeps the hit streak for the damage numbers.

`_shared.ts` holds `OURFORCES_GLOW`: the red glow on 17 bones in three breathing groups, used by
the buff looks of 266-268.

## Depends on / used by
- uses: `../_shared.ts`, `@/controllers/{skills,fx,lighting,sound,combat}`
- used by: `../index.ts` (glob); `dark_side/rage.ts` by the skill cast system and the packet handlers

## Change it
- see [docs/how_to/add_skill.md](../../../../docs/how_to/add_skill.md).

## Tests
- `timing.test.ts`: per skill, the tick each part draws or sounds at, against the clip.
- Covered by the golden tests in `../` (`skillVisuals.golden.test.ts`, `skillTables.golden.test.ts`).
