# hero

The hero's own character: stats, life / mana / shield / AG, level, experience, respawn, stat points
and fruits. Also the class and stat math, the emote table and the low-vitals warning math that
other folders share.

## Public API
- `characterStats.ts`: `BaseClass`, `getBaseClass(cls)`, `StatType`, `getClassName(cls)`, `getStatName(stat)`,
  `attackSpeedOf` / `magicSpeedOf(cls, agility)`, `deriveCharacterStats(input)` (damage, defense,
  rates and wizardry for the character info window).
- `emotes.ts`: `EMOTES`, `EMOTE_RINGS`, `emoteById(id)`, `matchEmoteWord(text)` (the chat words that fire
  an emote, `CheckChatText`), `genderedEmoteAction`, type `EmoteId`.
- `statAllocation.ts`: `StatAllocation.start(stat, amount)` / `cancel()`, `run`, `running`, `isRunning(stat)`.
- `statAmounts.ts`: `clampAmount(amount, points)`, `needsConfirm(amount)`.
- `lowVitals.ts`: `vitalWarning(fraction, percent)`, `heartbeatDue(life, lifeMax)`, `NO_WARNING`,
  `LOW_VITAL_MIN_PERCENT` / `MAX` / `DEFAULT`.
- `watchStateWarnings()` (`stateWarnings.ts`, was `controllers/interface/`): watches the store for low
  durability, a full grid, the last potion and a buff running out, and posts one notice per crossing
  (option `stateWarnings`); `boot.tsx` starts it. Its `warn.*` text is in `i18n/` here.

## How it works
- The hero's state lives in the Store: `Store.playerData` (`PlayerData` in `src/app/store.ts`: level,
  exp, points, str/agi/sta/eng/leadership, fruit points, current and max HP/MP/SD/AG, speeds,
  `heroState`, `isGameMaster`, `masterLevel`). `net.ts` writes it and the hero entity's `attributeSystem`.
- Adding a point is `Store.increaseStatRequest(stat)` (`IncreaseCharacterStatPoint`, one point per
  packet; offline the Store answers itself). The answer emits `statPointAnswered`.
- `StatAllocation` runs "add N points": one request in flight, the next sent when the server answers
  (`statPointAnswered`), stopped on a refusal, a 5 s timeout, `warpCompleted` or `wsClosed`.
  `statAmounts.ts` is its pure arithmetic (cap 9999, confirm from 100).
- `experience.ts` is OpenMU's default experience table; the server sends no next-level value after a
  level-up, so `net.ts` derives the bar's bracket from it.
- Emotes are sent by `src/ecs/systems/emoteSystem.ts` (`Store.sendAnimationRequest`).

## Packets
- `CharacterInformation(Extended)`: on select; resets `Social`, `Messenger`, `Economy`, `GmPanel`, fills
  `playerData`, enters the world and emits `requestWarp`.
- `CurrentHealthAndShield`, `CurrentManaAndAbility`, `CurrentStatsExtended`: current pools.
- `MaximumHealthAndShield`, `MaximumManaAndAbility`, `MaximumStatsExtended`: maximum pools.
- `HeroStateChanged`: a player's PK state, with a log line (`ReceivePK`, `WSclient.cpp:6609`).
- `RespawnAfterDeath` (also `Extended`, `075`, `095`): layout by length; pools, money, exp (a zero is
  ignored), stops following, warps or moves the hero and clears its targets.
- `PoisonDamage`: lowers HP, sets SD.
- `CharacterStatIncreaseResponse(Extended)`: applies the point(s), emits `statPointAnswered`.
- `CharacterLevelUpdate(Extended)`: level, points, maxima, fruit points; moves the exp bracket.
- `MasterCharacterLevelUpdate(Extended)`: `playerData.masterLevel` (and maxima); see also `skills/masterLevel.ts`.
- `ExperienceGained(Extended)`: adds exp, emits `experienceGained`.
- `FruitConsumptionResponse`: the fruit result (`ReceiveUseStateItem`). `BaseStatsExtended`: base stats.

## Depends on / used by
- uses: `src/app/store.ts`, `social/social.ts`, `friends/messenger.ts`, `economy/economy.ts`, `gm/gmPanel.ts`,
  `session/sessionResume.ts`, `chat/commands.ts`, `_shared/net_helpers.ts`, `items`, `inventory`, `src/i18n`.
- used by: `src/app/logic.ts`, `src/app/store.ts`, many controllers and ECS systems (`getBaseClass`),
  `social/social.ts` (`matchEmoteWord`), `session/sessionStats.ts` (`experienceGained`),
  `controllers/settings`, `skills`, `combat`, `events`, `quests`. Windows: `versions/shared/ui/windows/character_info/`,
  `emote_menu/`, `move_command_window/`, `mu_helper/`, `options/`; HUD `low_health_overlay/`; page `character_select/`.

## Change it
- handle a new hero packet: `net.ts`, state in `Store.playerData`.
- the stat sheet numbers: `deriveCharacterStats` in `characterStats.ts`.
- add or reorder an emote: `EMOTES` and `EMOTE_WORD_CHAIN` in `emotes.ts`.
- the bulk stat run: `statAllocation.ts`; its limits: `statAmounts.ts`.
- the low HP / MP edge: `lowVitals.ts`; the overlay is `versions/shared/ui/hud/low_health_overlay/`.

## Tests
- `lowVitals.test.ts`: heartbeat rule, threshold clamping, edge strength and beat speed.
- `statAmounts.test.ts`: amount clamping, the confirm threshold and the run's next step.
