# combat

Combat packets from the game server: other objects' attack and skill animations, hits, kills and
the Rage Fighter's Dark Side blows. This folder has only the handlers; it keeps no store.

## Public API
- none. `installNet()` in `net.ts` registers its handlers (`module.ts`, installed by `src/app/logic.ts`).
- `clips.ts`: the attack and cast clips of objects in view and their sounds (`playCastAnimation`,
  `attackPoseOf`, `attackInputOf`, `setMonsterClip`, `playTrapSounds`), and `resumeHeroCastClip` for the
  echo of the hero's own Dark Side; `skills/net.ts` uses it too.

## How it works
- Handlers read `Ecs.world` and write straight onto the entities (animation components,
  `attributeSystem`, `dying`). The hero's own HP on a kill goes to `Hero.currentHP`.
- The hero is driven locally: `ObjectAnimation` for the hero is ignored, as in the original.
- `lastAttacker` is the original's `AttackPlayer` (`WSclient.cpp:3596-3608`, `:4161`): who last sent an
  attack or skill animation, used for Soul Barrier's hit shell on the hero.
- A hit plays the hit sound (`AttackEffect`, `ZzzCharacter.cpp:5250-5307`), lowers the target's health
  bar, makes it flinch (`SetPlayerShock`, `ZzzCharacter.cpp:1364-1390`; a Fenrir rider uses
  `SetAction_Fenrir_Damage`, `ZzzAI.cpp:283-311`) and emits `objectDamaged`.
- `ObjectHitExtended` carries `HealthStatus`, the server's own reading of the target's health in 1/250
  steps (`WSclient.cpp:3133-3143`); it replaces the client's estimate. Only the open-source client line
  (>= 106.3) gets it from OpenMU; on S6E3 the bar runs on the health table alone.
- A kill adds the `dying` component; `DeathSystem` starts the Die clip 14 ticks later
  (`c->Dead >= 15`, ZzzCharacter.cpp:4074-4080). A hero's plain blow (skill 0) also marks `held`, the
  ticks its request waited for the blow (`combat.blowHeldTicks`): the original sends it on the click,
  so the 14 ticks count from the swing's start. The request goes on the click and `held` is 0 unless
  the world's `server.json` sets `heldHitRequest` (`servers/serverManifest.ts`). A hero kill plays the energy sound once when its orbs
  arrive (`playKillEnergy`, `ZzzEffectJoint.cpp:3369`); the orbs start at the hero's release, where the
  original creates them (`ZzzCharacter.cpp:5242-5247`): a skill kill waits for the cast's release
  (`afterHeroRelease`), a plain blow's has passed already (its request went out on it).

## Packets
- `ObjectAnimation`: attack, emote and action clips of other players and monsters; faces the direction.
- `SkillAnimation`: a targeted skill cast. Teleports go to `playTeleportAnimation` (skills); the DK
  combo only plays its sound (`WSclient.cpp:4167`, `:4829-4832`); a Dark Side one only turns its caster, and another
  caster's counts one of the hero's follow-ups gone (`combat.observeDarkSideMagic`, SetDarksideCnt, `WSclient.cpp:5144-5148`);
  others turn, play the clip and the visual.
- `ObjectGotKilled`: stops the object, zeroes its health, marks it dying.
- `ObjectHit`, `ObjectHitExtended`: damage, sound, health bar, flinch, damage numbers.
- `RageAttackRangeResponse`: the Dark Side targets, handed to `combat.observeDarkSideTargets`; an empty
  slot is DS_TARGET_NONE (10000, OpenMU's UndefinedTargetId in ShowRageAttackRangePlugIn), no target.
  Naming none, the hero sends the skill at himself (0x19, SendRequestMagic(skill, HeroKey),
  MonkSystem.cpp:551-553).
- `RageAttack` (C3 4A): one Dark Side blow, drawn like a targeted skill. The echo of the hero's own
  cast starts his follow-up blows (`combat.observeDarkSideEcho`; `AttackTime = 1`, WSclient.cpp:13422-13429)
  and, as SetRageSkillAni does, puts him back in the Dark Side clip if he has left it (`resumeHeroCastClip`;
  `SetAction` leaves a running clip alone), so a late echo still gets its follow-ups. RageCreateEffect draws a cast once (MonkSystem.cpp:1285-1288): a later 0x4A of a Dark Side cast
  already drawn (another client's follow-up while its caster still plays the clip, or one after the
  hero's echo) only turns its caster.
- Outgoing attacks are sent by `src/ecs/systems/attackSystem.ts` and `skillCastSystem.ts`; only the Dark
  Side request above goes out from here.

## Depends on / used by
- uses: `src/controllers/combat` (`combat`, `clipIgnoresHit`), `controllers/anim`, `controllers/actors`,
  `controllers/sound`, `controllers/fx` (`delay`), `scope/objects.ts` (`isDeadMonster`), `hero/characterStats.ts`,
  `skills/skillCasting.ts`, `skills/net.ts`, `pets/pets.ts` (`mountKind`), `session` (the Dark Side request),
  `@versions/shared/skills/skillVisuals` (`playBuffHits`: Soul Barrier's shell when the hero is hit;
  `afterHeroRelease` for the kill energy).
- A landed combo plays the Combo skill's own `sound` (`playSkill`).
- used by: `src/app/logic.ts`. `objectDamaged` is read by `versions/shared/ui/hud/damage_numbers/` and
  `src/ecs/systems/impactEffectSystem.ts`.

## Change it
- handle a new combat packet: add an `EventBus.on(...)` in `net.ts`.
- change who flinches on a hit: `applyObjectHit` in `net.ts`; the clips that are never cut are each
  skill's `noFlinch` in its `versions/shared/skills/` file.
- change how damage numbers look: `versions/shared/ui/hud/damage_numbers/index.tsx`.

## Tests
- `killEnergy.test.ts`: the energy sound waits for the hero's cast release, and starts at the kill
  after a plain blow; 22 ticks plus 3.5 a tile of flight.
- `darkSideEcho.test.ts`: the hero's Dark Side follow-ups wait for the `RageAttack` echo of his cast,
  which puts him back in the clip; a cast is drawn once, a later 0x4A of it only turns its caster; a 0x4B
  naming no target asks for the skill on the hero, and its empty slots get no follow-up; another caster's 0x19 of Dark Side
  counts one of the hero's follow-ups and draws nothing.
