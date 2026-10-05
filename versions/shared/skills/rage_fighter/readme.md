# rage_fighter

Rage Fighter skills, one folder per skill (`MonkSystem.cpp RageCreateEffect`). Rules for skill
folders: [../readme.md](../readme.md).

## Public API
- Each folder's default export is a `defineSkill`, found by glob in `../index.ts`.
- `dark_side/rage.ts`: `isDarkSide`, `beginDarkSide`, `observeDarkSideTargets`, `observeDarkSideEcho`,
  `nextDarkSideHit`, `darkSidePendingSkill`, `observeRageHit`, `rageStreak`, `rageLayer`, `darkSideCast` (the targets
  named and the follow-ups gone, for DarksideRendering).
- `dark_side/rendering.ts`: `DarksideRendering`, one DarksideRendering call at a time, and its `DarksideState` and `DarksideSink`.

## How it works

| Folder | Ids | Look |
|---|---|---|
| `killing_blow` | 260, 551 str, 554 mastery | a wolf head on the caster's bone 27, as bright as the ground under it, throwing two smaller heads and three pin lights a tick along the shaken facing; the BITMAP_SBUMB bursts on the target on ticks 5-20 |
| `beast_uppercut` | 261, 552 str, 555 mastery | two blows on the dummies' keys, a rising gold burst each (the model is not converted); the hero's waits for STAMP key 2 |
| `chain_drive` | 262, 558 str | a BITMAP_SWORDEFF joint each tick of GIANTSWING, riding bone 5 for 10 moves; past keys 6 and 11 a blow on the target, the first with MODEL_SHOCKWAVE01 (drawn twice) leaving bone 0 and backing off at 220 + Scale x 80 cm above sea level and BITMAP_DAMAGE1's four sparks, the second with MODEL_SHOCKWAVE02 (drawn twice) backing off, two MODEL_SHOCKWAVE_SPIN01 in Damage1 rolling, from bone 4, and BITMAP_SHINY+4's rings for 16 ticks; with each a dim MODEL_WOLF_HEAD_EFFECT2, the first riding bone 4 and throwing two smaller heads a tick, the second riding bone 27 |
| `dark_side` | 263, 559 str | at the caster a red cloud growing to 5 tiles, a magic circle drawn twice and the wind pillar with the two it raises on ticks 11 and 21; for the hero, DarksideRendering: his body running out to the next target and up to five afterimages running through the targets, with their dark waves and BITMAP_DAMAGE2 bursts (below) |
| `dragon_roar` | 264, 560 str | the blow's shake on ticks 16-36 and on tick 21, 55 cm toward the target, MODEL_DRAGON_LOWER_DUMMY (gold and red, scrolling, fading x0.96 a tick, throwing red sparks while its key is 1-6) over BITMAP_LIGHT_RED sub4's two red ground flares and terrain light; between DRAGONLORE keys 2 and 8 the lava joints off bones 36 and 28; past key 5 the lava's MODEL_SHOCKWAVE01 sub1 (Damage2) on the caster and MODEL_SHOCKWAVE_GROUND01 sub1 (Kwave2) where it lies, and each tick a fire column, one flame climbing 7 cm a tick with four flames and four falling sparks round it |
| `dragon_slasher` | 265 | the multi-shot volley turned to the target and Rage_Dragonkick (neither without one; the hero's sound at his click); between DRAGONKICK keys 4 and 5 the ground wind, joints that leave bone 1 and ride the meshless dummy's bone 2 as it swings round; each tick past key 5, twice over the target, four energy, lightning and spark cards and two bouncing sparks |
| `ignore_defense` | 266 | at the caster, all blue: the sword flash, three ground shock rings and spinning clouds, the wind pillar and a widening magic circle; on the buffed body (129) a red smoke off the hands each tick |
| `increase_health` | 267, 573 str | the same in violet; on the buffed body (130, 155) the Ourforces bone glow and two red decals under it |
| `increase_block` | 268, 569 power up, 572 mastery | the same in red, then a pale wind pillar on the caster (the hero's target on his own cast) that stands while that body holds an Ourforces buff; on the buffed body (131, 153, 154) now and then a mirror wind pillar |
| `charge` | 269 | Rush's charge: each tick until RUSH key 5 or tick 14, 20 cm over the feet, four JOINT_SPARKs thrown back and four BITMAP_FIRE sub18 ground smokes; then MODEL_SWORD_FORCE sub2 in knightSt_blue, 100 cm up, running ahead faster each tick, growing for three ticks and leaving a copy each, then fading and spraying the same on the ground under it, lighting it |
| `phoenix_shot` | 270 | a phoenix arrow, a fire hit and the phoenix model |

Timing follows the original's effects, not the packet: most of them read the caster's clip key
or their own LifeTime each 25 Hz tick (`MoveHandlers.cpp`), and drop what is left when the caster
leaves the clip (`eachClipTick`, `whenClipKey(..., 'drop')` in `../_shared.ts`). Ticks count from
the packet; an effect it creates first moves on tick 1.

Dark Side (263 and its Strengthener 559, SkillCast.cpp:881-896) is the one skill on its own wire: the
cast sends 0x4B and 0x4A (target key 0 with nothing selected: it is cast anyway where the hero stands,
with no turn, SkillCast.cpp:1047-1049, and OpenMU's RageSkillAttackAction picks the five nearest monsters
in range), the server answers with up to five targets and echoes the 0x4A, and the client lands a blow
on each target as the clip's follow-ups come round (`rage.ts`): Rage_Darkside_Att when the targets arrive, the first blow `(int)(2.5 / PlaySpeed)` ticks after the echo (8 at base
speed; the echo sets `AttackTime = 1`, WSclient.cpp:13422-13429), the next ones a tick sooner. They
come only while the hero plays the Dark Side clip (SkillCast.cpp:1117), and none once AttackTime has
reached 15 and stopped (ZzzCharacter.cpp:4139-4141): targets that come 15 ticks after the echo get no
blow. `rage.ts` keeps AttackTime as the original does, read by the blow before it runs on (MoveHero
then MoveCharacter, MainScene.cpp:283-284). A follow-up sends nothing (`SendDarksideAtt`'s send is commented out, MonkSystem.cpp:610; OpenMU deals
every hit from the 0x4B) and draws nothing of its own: what shows of the blows is DarksideRendering's, below.
Only the cast's echo starts the count, and the
cast is drawn once (RageCreateEffect's `m_bUseEffectOnce`, MonkSystem.cpp:1285-1288): a later echo,
the hero's or another caster's while he still plays the clip (another client's follow-up), only turns
its caster (`observeDarkSideEcho`). It also keeps the hit streak for the damage numbers. Past the fifth
follow-up the next one due drops the targets (SendDarksideAtt's InitDarksideTarget, MonkSystem.cpp:591-595).

DarksideRendering (MonkSystem.cpp:697-857) is the hero's alone: it reads the CMonkSystem only his cast fills, so another
caster's Dark Side shows RageCreateEffect only. RenderCharacter calls it for each body part it draws while he plays
DARKSIDE_READY (ZzzCharacter.cpp:9572-9654) and each call moves everything on, so a tick makes five or six calls and the
parts of one tick stand apart; `rendering.ts` ports it a call at a time and the cast's driver (`index.ts`) places the
`afterimage` copies (fx), each in DARKSIDE_ATTACK's one key. While a target is left to visit, his body (full alpha) runs
`f x f x 0.05` cm out toward it, `f` the calls since the last follow-up, with a MODEL_SHOCKWAVE01 sub3 once past 30 cm and
a burst on the target on the call before it passes it. Once a follow-up has gone, an afterimage (CDummyUnit) a call while
the READY key passes 0, 2, 4, 6 and 8: from 150, 150 cm turned 60 degrees a dummy off the target the body runs at (the
echo's target once none is left; with none known it is never seen), through it 0.49 cm more a call, alpha 0.2 up 0.02 a
call to 0.6 (0.6 and 0.62 by turns, float steps), down 0.07 a call past 300 cm, gone past 500, 30 times as far a call in
Chaos Castle; on its calls 20-21 a burst on the target while one is left, on 31-32 a MODEL_SHOCKWAVE01 sub4 at it, turned
its own way - 180. The waves start 150 cm on and back off toward their maker (ZzzEffect.cpp:5895-5930,
MoveHandlers.cpp:9397-9425); the bursts are BITMAP_DAMAGE2 particles. A changed body (bChange's x 30) is not told apart.

`_shared.ts` holds the Ourforces buff looks, BITMAP_LIGHT_RED by sub: `OURFORCES_GLOW` and `OURFORCES_GROUND`, the red glow
on 17 bones in three breathing groups and the decals under the body (Increase Health); `ourforcesSmoke`, a red
SMOKELINE1 off bone 26 or 35 each tick (Ignore Defense, none while cloaked); `ourforcesMirror`, one tick in 70 a
MODEL_WINDFOCE_MIRROR while none is up (Increase Block). The body carries one BITMAP_LIGHT_RED per Ourforces buff and each
makes the smoke and rolls for the mirror, so they add up (`lightReds`). `blockPillar` is Increase Block's MODEL_WINDFOCE sub1, one
a body, standing while it holds an Ourforces buff: the original registers the buff as it casts, ours comes in its own
packet, so the pillar waits 25 ticks for one. And `windForce`, MODEL_WINDFOCE (Dark Side and 266-268): a wind pillar that stays where it rose,
turns, grows to 3 and fades through its Light (drawn x 6, clamped, additive), raising a fast sub 3
pillar on its 11th and 21st tick. `swordFlash`, BITMAP_SWORD_EFFECT_MONO (266-268): Swordeff_mono cards rising where
the caster stood, two in three ticks, each growing x1.2 a tick to 6 and shrinking back; on its second tick a
MODEL_SHOCKWAVE01 that grows x1.24 a tick and climbs x1.19 of its height above sea level, so it rises off high ground.
`eventCloud` (BITMAP_EVENT_CLOUD) and `magicGround13` (BITMAP_MAGIC sub13) are ground decals that grow by a factor a
tick (the `ring` entry's `scaleAt`), the shock rings (MODEL_SHOCKWAVE_GROUND01, `shockGround`: sub0 for the buffs, sub1 for
Dragon Roar) models that do the same. `ourforcesCast` is the whole RageCreateEffect of a party buff, given its Lights.
`fallSpark` moves a BITMAP_SPARK a tick (Dragon Slasher's and Dragon Roar's): it climbs, falls and bounces. The wolf heads
(`wolfHead`, `throwHead`, `shake`) ride a bone of the caster and throw copies along its angle, shaken; their scripts
count moves on the effects clock (`eachMove`, `movesSince`), so a script made inside the clock's step does not run a tick early.

## Depends on / used by
- uses: `../_shared.ts`, `@/controllers/{skills,fx,lighting,sound,combat}`; Dark Side's driver also `actors` (the body
  parts it copies, Chaos Castle) and `@/ecs/current` (where its targets stand)
- used by: `../index.ts` (glob); `dark_side/rage.ts` by the skill cast system and the packet handlers

## Change it
- see [docs/how_to/add_skill.md](../../../../docs/how_to/add_skill.md).

## Tests
- `timing.test.ts`: per skill, the tick each part draws or sounds at, against the clip; Dark Side's
  follow-ups against the echo, the hero's clip and AttackTime's stop at 15, the targets dropped past the fifth, and the
  hero's DarksideRendering a tick at a time (five parts a tick: the body, the afterimages, their waves and bursts, none
  for another caster); Dragon Roar's dragon dummy, its red flares, the shake and the lava joints; the master skills (551, 554, 558-560)
  sound as their base, as RageCreateEffect plays one sound for each case; the Ourforces buff looks by sub, the smoke
  and the mirror rolls adding up with the buffs, the smoke stopping under a cloak; Increase Block's lasting pillar, its
  body and how long it stands; Charge's sword force, its copies, spray and light.
- `party_buffs.test.ts`: the party buffs and their master ones (569, 572, 573) toss one coin for the clip and its sound.
- `dark_side/rendering.test.ts`: DarksideRendering call by call: when and where each afterimage is made, how it runs, fades
  and goes, its bursts and waves; the body running out, its wave, its burst and its turn to the next target.
- Covered by the golden tests in `../` (`skillVisuals.golden.test.ts`, `skillTables.golden.test.ts`).
