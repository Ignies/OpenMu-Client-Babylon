# combat

Combat packets from the game server: other objects' attack and skill animations, hits, kills and
the Rage Fighter's Dark Side blows. This folder has only the handlers; it keeps no store.

## Public API
- none. `installNet()` in `net.ts` registers its handlers (`module.ts`, installed by `src/app/logic.ts`).

## How it works
- Handlers read `Store.world` and write straight onto the entities (animation components,
  `attributeSystem`, `dying`). The hero's own HP on a kill goes to `Store.playerData.currentHP`.
- The hero is driven locally: `ObjectAnimation` for the hero is ignored, as in the original.
- `lastAttacker` is the original's `AttackPlayer` (`WSclient.cpp:3596-3608`, `:4161`): who last sent an
  attack or skill animation, used for Soul Barrier's hit shell on the hero.
- A hit plays the hit sound (`AttackEffect`, `ZzzCharacter.cpp:5250-5307`), lowers the target's health
  bar, makes it flinch (`SetPlayerShock`, `ZzzCharacter.cpp:1364-1390`; a Fenrir rider uses
  `SetAction_Fenrir_Damage`, `ZzzAI.cpp:283-311`) and emits `objectDamaged`.
- `ObjectHitExtended` carries `HealthStatus`, the server's own reading of the target's health in 1/250
  steps (`WSclient.cpp:3133-3143`); it replaces the client's estimate. Only the open-source client line
  (>= 106.3) gets it from OpenMU; on S6E3 the bar runs on the health table alone.
- A kill adds the `dying` component; `DeathSystem` starts the Die clip, at once or when the hero's
  swing connects (`WSclient.cpp:5362-5384`). A hero kill plays the energy sound once
  (`ZzzCharacter.cpp:5242-5247`, `ZzzEffectJoint.cpp:3369`).

## Packets
- `ObjectAnimation`: attack, emote and action clips of other players and monsters; faces the direction.
- `SkillAnimation`: a targeted skill cast. Teleports go to `playTeleportAnimation` (skills); the DK
  combo only plays its sound (`WSclient.cpp:4167`, `:4829-4832`); others turn, play the clip and the visual.
- `ObjectGotKilled`: stops the object, zeroes its health, marks it dying.
- `ObjectHit`, `ObjectHitExtended`: damage, sound, health bar, flinch, damage numbers.
- `RageAttackRangeResponse`: the Dark Side targets, handed to `combat.observeDarkSideTargets`.
- `RageAttack` (C3 4A): one Dark Side blow, drawn like a targeted skill.
- Outgoing attacks are sent by `src/ecs/systems/attackSystem.ts` and `skillCastSystem.ts`, not here.

## Depends on / used by
- uses: `src/controllers/combat` (`combat`, `clipIgnoresHit`), `controllers/anim`, `controllers/actors`,
  `controllers/sound`, `controllers/fx` (`delay`), `_shared/net_helpers.ts`, `hero/characterStats.ts`,
  `skills/skillCasting.ts`, `skills/net.ts`, `pets/pets.ts` (`mountKind`),
  `@versions/shared/skills/skillVisuals` (`playBuffHits`: Soul Barrier's shell when the hero is hit).
- A landed combo plays the Combo skill's own `sound` (`playSkill`).
- used by: `src/app/logic.ts`. `objectDamaged` is read by `versions/shared/ui/hud/damage_numbers/` and
  `src/ecs/systems/impactEffectSystem.ts`.

## Change it
- handle a new combat packet: add an `EventBus.on(...)` in `net.ts`.
- change who flinches on a hit: `applyObjectHit` in `net.ts`; the clips that are never cut are each
  skill's `noFlinch` in its `versions/shared/skills/` file.
- change how damage numbers look: `versions/shared/ui/hud/damage_numbers/index.tsx`.

## Tests
- none yet.
