# hero

The hero's own character: stats, life / mana / shield / AG, level, experience, respawn, stat points
and fruits. Also the class and stat math, the emote table and the low-vitals warning math that
other folders share.

## Public API
- `Hero` (`state.ts`, through `index.ts`, the door): the hero's data (see How it works) and
  `heroStats()`, `increaseStatRequest(stat)`, `syncPlayerAppearance()`, `sendWalkPath(x, y, dirs)`,
  `sendWalkStop(x, y, rot)`, `sendAnimationRequest(rot, anim)`, `setTileFlag`.
- `traceHeroInstantMove(hero, to, approach)` (`heroMoveTrace.ts`): the `ObjectMoved` log (scope).
- `characterStats.ts`: `BaseClass`, `getBaseClass(cls)`, `StatType`, `getClassName(cls)`, `getStatName(stat)`,
  `attackSpeedOf` / `magicSpeedOf(cls, agility)`, `deriveCharacterStats(input)` (damage, defense,
  rates and wizardry for the character info window), with the pet's share: the gold Fenrir, Demon,
  Skeleton and Imp on damage, wizardry and curse, Panda and Unicorn +50 defense
  (NewUICharacterInfoWindow.cpp:707-737, :954-959, :1296-1326, :1424-1442), after the best worn
  transformation ring: Christmas 20 (not on curse), Panda 30, Skeleton 40 (:680-704, :1259-1294, :1395-1418).
  Before those, the lit ancient set options (`PlusSpecial` / `PlusSpecialLevel`: min / max damage, damage by
  strength or agility, attack rate, defense, defense by agility or vitality, shield defense %, wizardry by energy)
  and the socket bonuses (`m_StatusBonus`) when the window passes the set and socket tables
  (ZzzInfomation.cpp:2745-2812, :3005-3035, :3127-3129, :3248, :3361-3381). The stats the worn items add
  (`AddStrength` and the rest, `wornStatBonus`) count in `IsRequireEquipItem` and every formula (`totals`, also the
  window's skill damage lines); the attack and magic speeds keep the base agility. The shield's blocking and its +5 per option level
  lose the `CalcDurabilityPercent` share, and the excellent "defense success rate" on the shield, each armour
  piece and each ring adds 10% in turn, when `IsRequireEquipItem` passes (:3223-3246).
  Wizardry is energy plus the items' wizardry options only (`CalculateMagicDamage`, :2848-3001): the wing's,
  the right weapon's (a magic sword's damage option), the left weapon's, the staff and pendant excellent
  level / 20 and 2%, the Wizard's Ring 10%, each counted only when `IsRequireEquipItem` passes. As in the
  original, anything in the left hand adds the right weapon's option a second time (:2950-2979).
  The window's wizardry line reads the selected skill (`magicSkill`, `GetMagicSkillDamage`, CharacterManager.cpp:341-370):
  its Damage on the minimum and 1.5 times it on the maximum, the set's magic power percent and skill attack; the
  summoner's curse skills read the plain values. The set mastery rows (`PlusMastery`, options 29-35) are left out: no
  Season 6 set carries an option above 23. The line then adds `maxMg`, the worn staffs' Jewel of Harmony magic power
  (:1241-1256). The magic rate (`staffRate`) is the skill maximum plus `maxMg` times the staff's or magic sword's
  `MagicPower` percent, worn by the `MagicDur` share (NewUICharacterInfoWindow.cpp:1226-1352). `IsRequireEquipItem`
  takes the harmony strength and agility cut off the needs (ZzzInfomation.cpp:2246-2259).
  The curse line is `CalculateCurseDamage` (ZzzInfomation.cpp:3045-3104): energy, the wing's and the left hand's curse
  options worn by durability, the left hand's excellent level / 20 and 2%; then `GetCurseSkillDamage` adds a curse
  skill's Damage (CharacterManager.cpp:373-390). A book in the left hand prints its worn magic power on the line's
  maximum (`curseRate`, NewUICharacterInfoWindow.cpp:1449-1460).
- `emotes.ts`: `EMOTES`, `EMOTE_RINGS`, `emoteById(id)`, `matchEmoteWord(text)` (the chat words that fire
  an emote, `CheckChatText`), `genderedEmoteAction`, type `EmoteId`.
- `statAllocation.ts`: `StatAllocation.start(stat, amount)` / `cancel()`, `run`, `running`, `isRunning(stat)`.
- `statAmounts.ts`: `clampAmount(amount, points)`, `needsConfirm(amount)`.
- `lowVitals.ts`: `vitalWarning(fraction, percent)`, `heartbeatDue(life, lifeMax)`, `NO_WARNING`,
  `LOW_VITAL_MIN_PERCENT` / `MAX` / `DEFAULT`.
- `watchStateWarnings()` (`stateWarnings.ts`, was `controllers/interface/`): watches the store for low
  durability, a full grid, the last healing potion and a buff running out, and posts one notice per crossing
  (option `stateWarnings`); `boot.tsx` starts it. Its `warn.*` text is in `i18n/` here.

## How it works
- The hero's state is `Hero` (`state.ts`: name, class, level, exp, points,
  str/agi/sta/eng/leadership, fruit points, current and max HP/MP/SD/AG, speeds, `heroState`,
  `isGameMaster`, money, the inventory `items` and the worn-slot getters, `playerId`). `net.ts` writes
  it and the hero entity's `attributeSystem`. `syncPlayerAppearance()` puts the worn items on the hero
  entity; the terrain calls it through `onHeroPlaced` (wired in `boot.tsx`) once the hero stands on a
  new map. Where the hero stands is the hero entity's (`transform.pos`); `Hero` keeps only that
  tile's terrain flag (`tileFlag`, which `moveAlongPathSystem` mirrors).
- Adding a point is `Hero.increaseStatRequest(stat)` (`IncreaseCharacterStatPoint`, one point per
  packet; offline it answers itself after 30 ms). The answer emits `statPointAnswered`.
- `StatAllocation` runs "add N points": one request in flight, the next sent when the server answers
  (`statPointAnswered`), stopped on a refusal, a 5 s timeout, `warpCompleted` or `wsClosed`.
  `statAmounts.ts` is its pure arithmetic (cap 9999, confirm from 100).
- `experience.ts` is OpenMU's default experience table; the server sends no next-level value after a
  level-up, so `net.ts` derives the bar's bracket from it.
- Emotes are sent by `src/ecs/systems/emoteSystem.ts` (`Hero.sendAnimationRequest`). Walking goes out
  as `Hero.sendWalkPath` / `sendWalkStop` (WalkRequest 0xD4); `lastWalkRequest` is what
  `heroMoveTrace.ts` logs when the server moves the hero by itself (`ObjectMoved`).

### Notes: heroMoveTrace.ts
`ObjectMoved` (C1 15) is the only packet that moves the hero without a walk: a gate, a teleport, an
`InstantMoveRequest`, or a resync when the server thinks the client drifted. These look the same
from outside, so each jump of 1.5 tiles or more logs what the client believed: its position, the
last walk sent (`sentWalk`) and the approach in progress. A `sentWalk` ending where the server put
the hero is a walk the client failed to stop; no walk at all means the server moved him itself.
(Was `controllers/actors/heroMoveTrace.ts`; it reads the hero and the selected skill.)

## Packets
- `CharacterInformation(Extended)`: on select; resets `Social`, `Messenger`, `Economy`, `GmPanel`, fills
  `playerData`, enters the world and emits `requestWarp`.
- `CurrentHealthAndShield`, `CurrentManaAndAbility`, `CurrentStatsExtended`: current pools.
- `MaximumHealthAndShield`, `MaximumManaAndAbility`, `MaximumStatsExtended`: maximum pools.
  Once `CurrentStatsExtended` / `MaximumStatsExtended` arrived for the character, the 16-bit pool
  fields of the other packets (these, level-up, stat point, respawn) are ignored: they wrap past 65535.
- `HeroStateChanged`: a player's PK state, with a log line (`ReceivePK`, `WSclient.cpp:6609`).
- `RespawnAfterDeath` (also `Extended`, `075`, `095`): layout by length; pools, money, exp (a zero is
  ignored), stops following, warps or moves the hero and clears its targets.
- `PoisonDamage`: lowers HP, sets SD.
- `CharacterStatIncreaseResponse(Extended)`: applies the point(s), emits `statPointAnswered`.
- `CharacterLevelUpdate(Extended)`: level, points, maxima, fruit points; moves the exp bracket.
- `MasterCharacterLevelUpdate(Extended)`: the level-up notice (and the maxima from `Extended`); the
  master level and points are `skills/masterLevel.ts`'s, whose listener runs first.
- `ExperienceGained(Extended)`: adds exp, prints "Obtained N Exp" (or the master line, GlobalText 486 / 1750,
  WSclient.cpp:5745) and emits `experienceGained`. A master's exp goes to
  `skills/masterLevel.ts` instead, whose listener runs first (skills installs before hero).
- `FruitConsumptionResponse`: the fruit result (`ReceiveUseStateItem`). `BaseStatsExtended`: base stats.

## Depends on / used by
- uses: `session` (sending), `skills` (the selected skill), `inventory` (the item hot keys),
  `social/social.ts`, `friends/messenger.ts`, `economy/economy.ts`, `gm/gmPanel.ts`,
  `session/sessionResume.ts`, `chat/commands.ts`, `items`, `inventory`, `src/i18n`.
- used by: `src/app/logic.ts`, `src/app/offline.ts`, nearly every module and window (`Hero`), many controllers and ECS systems (`getBaseClass`),
  `social/social.ts` (`matchEmoteWord`), `session/sessionStats.ts` (`experienceGained`),
  `controllers/settings`, `skills`, `combat`, `events`, `quests`. Windows: `versions/shared/ui/windows/character_info/`,
  `emote_menu/`, `move_command_window/`, `mu_helper/`, `options/`; HUD `low_health_overlay/`; page `character_select/`.

## Change it
- handle a new hero packet: `net.ts`, state in `Hero` (`state.ts`).
- the stat sheet numbers: `deriveCharacterStats` in `characterStats.ts`.
- add or reorder an emote: `EMOTES` and `EMOTE_WORD_CHAIN` in `emotes.ts`.
- the bulk stat run: `statAllocation.ts`; its limits: `statAmounts.ts`.
- the low HP / MP edge: `lowVitals.ts`; the overlay is `versions/shared/ui/hud/low_health_overlay/`.

## Tests
- `lowVitals.test.ts`: heartbeat rule, threshold clamping, edge strength and beat speed.
- `statAmounts.test.ts`: amount clamping, the confirm threshold and the run's next step.
- `stateWarnings.test.ts`: the no healing potions warning counts healing potions only.
- `state.test.ts`: `Hero` keeps no tile of its own.
- `wideStats.test.ts`: the 16-bit pool fields count until the 32-bit pools arrive, then not.
- `characterStats.test.ts`: the pet and transformation ring bonuses on damage, wizardry, curse and defense.
- `experience_gained.test.ts`: a kill share feeds normal or master experience and says so in the system log;
  a master level-up swirls the twenty flare joints.
