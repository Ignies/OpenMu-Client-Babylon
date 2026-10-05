# rage_fighter

Rage Fighter skills, one folder per skill (`MonkSystem.cpp RageCreateEffect`). Rules for skill
folders: [../readme.md](../readme.md).

## Public API
- Each folder's default export is a `defineSkill`, found by glob in `../index.ts`.
- `dark_side/rage.ts`: `isDarkSide`, `beginDarkSide`, `observeDarkSideTargets`, `observeDarkSideEcho`,
  `nextDarkSideHit`, `darkSidePendingSkill`, `observeRageHit`, `rageStreak`, `rageLayer`.

## How it works

| Folder | Ids | Look |
|---|---|---|
| `killing_blow` | 260, 551 str, 554 mastery | a wolf head aimed at the target; the BITMAP_SBUMB bursts there on ticks 5-20 |
| `beast_uppercut` | 261, 552 str, 555 mastery | two blows on the dummies' keys, a rising gold burst each (the model is not converted); the hero's waits for STAMP key 2 |
| `chain_drive` | 262, 558 str | sword effect at the caster; past GIANTSWING keys 6 and 11 a blow on the target, the first with a shock wave, the second with MODEL_SHOCKWAVE02 (drawn twice) backing off and two MODEL_SHOCKWAVE_SPIN01 rolling, from bone 4; with each a dim MODEL_WOLF_HEAD_EFFECT2, the first riding bone 4 and throwing two smaller heads a tick, the second riding bone 27 |
| `dark_side` | 263, 559 str | the wind pillar at the caster and the two it raises on ticks 11 and 21; per blow, damage bursts on ticks 20-21 and a dark shock wave on 30-31 (the afterimage's frame, a tick per rendered frame) |
| `dragon_roar` | 264, 560 str | a dragon head on tick 21; a fire shock ring and scattered fire hits past DRAGONLORE key 5 |
| `dragon_slasher` | 265 | the dragon kick model and the multi-shot volley fired forward; a burst on the target each tick past DRAGONKICK key 5 |
| `ignore_defense` | 266 | at the caster, all blue: the sword flash, three ground shock rings and spinning clouds, the wind pillar and a widening magic circle; the Ourforces bone glow as a buff look |
| `increase_health` | 267, 573 str | the same in violet; the Ourforces bone glow |
| `increase_block` | 268, 569 power up, 572 mastery | the same in red; the Ourforces bone glow |
| `charge` | 269 | Rush's charge: sparks and fire each tick until RUSH key 5 or tick 14, then the sword force at the caster |
| `phoenix_shot` | 270 | a phoenix arrow, a fire hit and the phoenix model |

Timing follows the original's effects, not the packet: most of them read the caster's clip key
or their own LifeTime each 25 Hz tick (`MoveHandlers.cpp`), and drop what is left when the caster
leaves the clip (`eachClipTick`, `whenClipKey(..., 'drop')` in `../_shared.ts`). Ticks count from
the packet; an effect it creates first moves on tick 1.

Dark Side is the one skill on its own wire: the cast sends 0x4B and 0x4A, the server answers with
up to five targets and echoes the 0x4A, and the client lands one 0x4A per extra target as the clip's
blows come round (`rage.ts`): Rage_Darkside_Att when the targets arrive, the first blow
`(int)(2.5 / PlaySpeed)` ticks after the echo (8 at base speed; the echo sets `AttackTime = 1`,
WSclient.cpp:13422-13429), the next ones a tick sooner. Only the cast's echo starts the count: ours
also sends a 0x4A per follow-up, which the original does not. It also keeps the hit streak for the
damage numbers.

`_shared.ts` holds `OURFORCES_GLOW`: the red glow on 17 bones in three breathing groups, used by
the buff looks of 266-268; and `windForce`, MODEL_WINDFOCE (Dark Side and 266-268): a wind pillar that stays where it rose,
turns, grows to 3 and fades through its Light (drawn x 6, clamped, additive), raising a fast sub 3
pillar on its 11th and 21st tick. `swordFlash`, BITMAP_SWORD_EFFECT_MONO (266-268): Swordeff_mono cards rising where
the caster stood, two in three ticks, each growing x1.2 a tick to 6 and shrinking back; on its second tick a
MODEL_SHOCKWAVE01 that grows x1.24 a tick and climbs x1.19 of its height above sea level, so it rises off high ground.
`eventCloud` (BITMAP_EVENT_CLOUD) and `magicGround13` (BITMAP_MAGIC sub13) are ground decals that grow by a factor a
tick (the `ring` entry's `scaleAt`), the shock rings (MODEL_SHOCKWAVE_GROUND01) models that do the same. `ourforcesCast` is the whole RageCreateEffect of a party buff, given its Lights. The wolf heads
(`wolfHead`, `throwHead`, `shake`) ride a bone of the caster and throw copies along its angle, shaken; their scripts
count moves on the effects clock (`eachMove`, `movesSince`), so a script made inside the clock's step does not run a tick early.

## Depends on / used by
- uses: `../_shared.ts`, `@/controllers/{skills,fx,lighting,sound,combat}`
- used by: `../index.ts` (glob); `dark_side/rage.ts` by the skill cast system and the packet handlers

## Change it
- see [docs/how_to/add_skill.md](../../../../docs/how_to/add_skill.md).

## Tests
- `timing.test.ts`: per skill, the tick each part draws or sounds at, against the clip.
- Covered by the golden tests in `../` (`skillVisuals.golden.test.ts`, `skillTables.golden.test.ts`).
