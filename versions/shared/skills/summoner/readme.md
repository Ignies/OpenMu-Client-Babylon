# summoner

Summoner skills, one folder per skill. Rules for skill folders: [../readme.md](../readme.md).

## Public API
- Each folder's default export is a `defineSkill`, found by glob in `../index.ts`.
- `chain_lightning/` exports `playChainLightningHop` (re-exported by `../skillVisuals.ts`): the
  arcs drawn per hop packet.

## How it works

| Folder | Ids | Look |
|---|---|---|
| `drain_life` | 214, 458 str, 462 mastery | red glows, ghost streaks, a siphon from the target's bones home |
| `chain_lightning` | 215, 455 str | a hand crackle; the arcs come with each hop packet |
| `lightning_orb` | 216 | a forearm crackle, then the lightning orb |
| `damage_reflection` | 217 | the hand glow, then a circle at the caster and rings on the target |
| `berserker` | 218, 469 str, 470 prof, 472 mastery | the hand glow, then a circle and rings on the caster in violet |
| `sleep` | 219, 454 str | violet hand FX, then a circle at the caster and rings, flares, streaks on the target |
| `blind` | 220, 461 (`blind.ts`), 463 str | Sleep's construction drawn subtractive: black smoke, disc and vortex |
| `weakness` | 221, 459 str | the hand FX, then circles, ripples and a glitter rain at the caster's feet |
| `innovation` | 222, 460 str | as Weakness in the Enervation colours, with a bone-spark buff look |
| `explosion` | 223 | casting circle; the Sahamutt runs to the point and blasts it |
| `requiem` | 224 | casting circle; Neil swings his blade, knives and ground rings on the point |
| `pollution` | 225 | casting circle; violet smoke, clouds and drops with the Laguls at the point |
| `lightning_shock` | 230, 456 str | the lightning shock model falls red over the caster and opens the ground |

"Enhanced" in a skill's comment is the graded look drawn on higher lighting tiers.

`_shared.ts` holds:
- curse hands: `CurseHand`, `summonerHand`, `curseHandLight`, `handCrackle`;
- Alice curses (Sleep, Blind, Thorns, Berserker): `AliceCurse`, `ALICE_SLEEP`, `aliceCurse`, `aliceGrace`;
- Zin curses (Weakness, Innovation): `ZinCurse`, `zinCurse`, `zinGrace`;
- book summons (Explosion, Requiem, Pollution): `SummonCast`, `summonCast`, `summonCastGrace`,
  `bookTier`, `SUMMON_CLIPS`, `SLEEP_CLIPS`;
- carriers and lights: `Carrier`, `carrierSprites`, `carrierLight`, `sum1Light`, `levelLight`,
  `curseLight`, `groundGlow`, `bodyLight`, `fenrirThunder`;
- helpers: `tickLoop`, `TickPoint`, `muTurn`, `humming`, `boneCount`, `atAttackTime`,
  `yawToward`, `swell`, `kickSparks`, `throwSmoke`, `magicParticle`, `risingEmbersFor`,
  `jitterCm`, `spawnCard`, the `PX_*` texture sizes and `SPRITE_TURN`.

## Depends on / used by
- uses: `../_shared.ts`, `@/controllers/{skills,fx,lighting,sound,combat}`
- used by: `../index.ts` (glob); `playChainLightningHop` by `src/modules/skills/net.ts`

## Change it
- see [docs/how_to/add_skill.md](../../../../docs/how_to/add_skill.md).

## Tests
- Covered by the golden tests in `../` (`skillVisuals.golden.test.ts`, `skillTables.golden.test.ts`).
