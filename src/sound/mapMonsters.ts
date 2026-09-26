import { MonsterActionType } from '../common/objects/enum';
import { ENUM_WORLD } from '../common/types';
import type { Sounds } from './recipes';

/**
 * Per-map monster voices: the original's `PlayMonsterSound(o)`
 * (ZzzCharacter.cpp:215-236), which runs before the generic
 * `Models[].Sounds[]` table at every moment a clip is (re)set - walk
 * (:760), attack (:1282), flinch (:1404) and death (:1536).
 *
 * Every monster added after Season 3 is voiced here and nowhere else: its
 * `OpenMonsterModel` case calls `LoadWaveFile` but never `SetMonsterSound`,
 * so `Models[type].Sounds[0]` stays -1 and the generic branch is silent for
 * it. Raklion's Ice Walkers and Ice Giants, the Swamp of Quiet's Sapi and
 * Shadow lines, Karutan's Orcus and Condra, Elbeland's beasts, the PK Field
 * and the Empire Guardian floors are all in this bracket - which is why they
 * used to speak with Noria goblin voices: the generated table filled the gap
 * with a placeholder instead of leaving it empty.
 *
 * The Season 2 maps - Crywolf, Kanturu, Aida, the Land of Trials, Kalima's
 * Kundun - voice their monsters from per-map move / render hooks instead
 * (section 3): `PlayBuffer` with no object, re-run every frame the monster
 * is drawn.
 *
 * The dispatch order is the original's: the global list first, then Elbeland,
 * then the Swamp of Quiet, then the active map's own (`TheMapProcess()`),
 * then the hooks that check no world at all. Since no model number appears in
 * two of them, one lookup per map is enough.
 *
 * `fDistance > 500.0f` gates every `PlayMonsterSound` voice: they are played
 * 2D at full volume in the original, with a hard five-tile cutoff instead of
 * a falloff. Here they keep their position (so they pan and attenuate like
 * every other effect) and the cutoff is kept as the range it is.
 *
 * Not here: the voices `PlayMonsterSoundGlobal` gives NPC models rather than
 * monster models - the snowman, Titus' idle, Lugard's breath and the two
 * Doppelganger chests opening (ZzzCharacter.cpp:15167-15221). They are keyed
 * by NPC model, which never reaches the monster path: `npcVoices.ts` plays them.
 */

/** One rule: an action set, the sound, and how often / when it fires. */
export type MonsterCue = {
  /** Actions this cue answers to. */
  readonly on: readonly MonsterActionType[];
  /** The sound; a pair is the original's `rand_fps_check(2) ? a : b`. */
  readonly play: Sounds | readonly [Sounds, Sounds];
  /**
   * `rand_fps_check(n)`, rolled where the original calls `PlayMonsterSound`:
   * every frame while walking (`SetPlayerWalk` runs each frame the monster
   * moves), each time the idle clip loops, and once when any other clip
   * starts. A walk cue without a chance repeats for as long as it walks.
   */
  readonly chance?: number;
  /**
   * `1.f <= AnimationFrame && AnimationFrame < 2.f`: fires once as the clip
   * crosses the window, even when a single frame steps over all of it. A
   * one-shot that has run out counts as past every window.
   */
  readonly frame?: readonly [number, number];
  /**
   * A hook's `if (o->SubType == FALSE) { o->SubType = TRUE; PlayBuffer(..) }`:
   * one latch per monster, shared by all its `once` cues, cleared when it
   * idles. `'life'` is for the hooks that never clear it.
   */
  readonly once?: true | 'life';
  /** Rolled every frame whatever the clip, not only while walking. */
  readonly perFrame?: true;
  /** Plays as the monster is created, from the map's CreateMonster. */
  readonly spawn?: true;
  /** From a hook's bare `PlayBuffer`: 2D in the original, so no five-tile gate. */
  readonly unranged?: true;
  /**
   * From a move / render hook, which only runs while `o->Visible`
   * (ZzzCharacter.cpp:5605, :11471): silent while the monster is not drawn.
   */
  readonly drawn?: true;
  /** A `timeGetTime()` timer: a walk cue plays every `period` ms, started or dropped. */
  readonly period?: number;
  /**
   * The wave's `LoadWaveFile` channel count. Unset is the monster tables' 2;
   * the sets loaded with MAX_CHANNEL's 4 are held to that 2 on purpose.
   */
  readonly channels?: number;
};

const A = MonsterActionType;

/** Model type -> its cues. Keys are `MONSTER_MODEL_x`, as in `MONSTER_SOUNDS`. */
export type VoiceSet = Readonly<Record<number, readonly MonsterCue[]>>;

/** `fDistance > 500.0f` in MU units - five tiles. */
export const MAP_VOICE_RANGE_TILES = 5;

type Play = MonsterCue['play'];

const ATTACK_1_2: readonly MonsterActionType[] = [A.Attack1, A.Attack2];
const WALK: readonly MonsterActionType[] = [A.Walk];
const WALK_RUN: readonly MonsterActionType[] = [A.Walk, A.Run];

/** Hook waves are 2D, and `MapManager` loads each with one channel. */
const HOOK = { unranged: true, drawn: true, channels: 1 } as const;
/** `AttackEffect` runs from MoveCharacter for every live monster, drawn or not (:4133). */
const ATTACK_EFFECT = { unranged: true } as const;

/** A set whose waves `LoadWaveFile` loads with one channel. */
const oneChannel = (set: VoiceSet): VoiceSet =>
  Object.fromEntries(
    Object.entries(set).map(([type, cues]) => [type, cues.map(c => ({ ...c, channels: 1 }))])
  );

/** `if (rand_fps_check(n)) PlayBuffer(MOVE1 + rand() % 2)` in a walk clip. */
const hookWalk = (play: Play, chance = 15, on = WALK_RUN): MonsterCue => ({
  on,
  play,
  chance,
  ...HOOK,
});

/** Behind the `o->SubType` latch. */
const hookOnce = (
  on: readonly MonsterActionType[],
  play: Play,
  once: true | 'life' = true
): MonsterCue => ({ on, play, once, ...HOOK });

/** Re-issued every frame of the clip in the original: once per clip here. */
const hookPlay = (on: readonly MonsterActionType[], play: Play): MonsterCue => ({
  on,
  play,
  ...HOOK,
});

// ---- 1. the global list ----------------------------------------------------

/**
 * `PlayMonsterSoundGlobal` (ZzzCharacter.cpp:15118-15196): voices that follow
 * their monster onto any map. `DarkSanta_Damage02` is not shipped, so the
 * flinch pair collapses to `Damage01`.
 */
export const GLOBAL_VOICES: VoiceSet = {
  // CURSED_SANTA
  155: [
    { on: [A.Stop1], play: ['Sound/xmas/DarkSanta_Idle01', 'Sound/xmas/DarkSanta_Idle02'] },
    { on: [A.Walk], play: ['Sound/xmas/DarkSanta_Walk01', 'Sound/xmas/DarkSanta_Walk02'] },
    { on: ATTACK_1_2, play: 'Sound/xmas/DarkSanta_Attack01' },
    // Damage01 or Damage02 at even odds, and Damage02 is not shipped.
    { on: [A.Shock], play: 'Sound/xmas/DarkSanta_Damage01', chance: 2 },
    { on: [A.Die], play: 'Sound/xmas/DarkSanta_Death01' },
  ],
};

// ---- 2. per-map sets -------------------------------------------------------

/**
 * `GMNewTown::PlayMonsterSound` (GMNewTown.cpp:1110-1252); one channel each
 * (ZzzOpenData.cpp:3915-3953).
 */
const ELBELAND: VoiceSet = oneChannel({
  // RABBIT
  128: [
    { on: ATTACK_1_2, play: 'Sound/w52/SE_Mon_rabbitstrange_attack01' },
    { on: [A.Die], play: 'Sound/w52/SE_Mon_rabbitstrange_death01' },
  ],
  // BUTTERFLY
  129: [
    { on: [A.Walk], play: 'Sound/w52/SE_Mon_rabbitugly_breath01', chance: 100 },
    { on: ATTACK_1_2, play: 'Sound/w52/SE_Mon_rabbitugly_attack01' },
    { on: [A.Die], play: 'Sound/w52/SE_Mon_rabbitugly_death01' },
  ],
  // HIDEOUS_RABBIT
  130: [
    { on: [A.Stop1, A.Stop2, A.Walk], play: 'Sound/w52/SE_Mon_wolfhuman_move02', chance: 30 },
    { on: ATTACK_1_2, play: 'Sound/w52/SE_Mon_wolfhuman_attack01' },
    { on: [A.Die], play: 'Sound/w52/SE_Mon_wolfhuman_death01' },
  ],
  // WEREWOLF2
  131: [
    { on: [A.Walk], play: 'Sound/w52/SE_Mon_butterflypollution_move01', chance: 100 },
    { on: [A.Die], play: 'Sound/w52/SE_Mon_butterflypollution_death01' },
  ],
  // CURSED_LICH
  132: [
    { on: [A.Walk], play: 'Sound/w52/SE_Mon_curserich_move01', chance: 100 },
    { on: ATTACK_1_2, play: 'Sound/w52/SE_Mon_curserich_attack01' },
    { on: [A.Die], play: 'Sound/w52/SE_Mon_curserich_death01' },
  ],
  // TOTEM_GOLEM
  133: [
    { on: [A.Walk], play: ['Sound/w52/SE_Mon_totemgolem_move01', 'Sound/w52/SE_Mon_totemgolem_move02'] },
    { on: [A.Attack1], play: 'Sound/w52/SE_Mon_totemgolem_attack01' },
    { on: [A.Attack2], play: 'Sound/w52/SE_Mon_totemgolem_attack02' },
    { on: [A.Die], play: 'Sound/w52/SE_Mon_totemgolem_death01' },
  ],
  // GRIZZLY
  134: [
    { on: [A.Walk], play: 'Sound/w52/SE_Mon_beastwoo_move01', chance: 100 },
    { on: ATTACK_1_2, play: 'Sound/w52/SE_Mon_beastwoo_attack01' },
    { on: [A.Die], play: 'Sound/w52/SE_Mon_beastwoo_death01' },
  ],
  // CAPTAIN_GRIZZLY - dies with the plain Grizzly's line, as the original does
  135: [
    { on: [A.Walk], play: 'Sound/w52/SE_Mon_beastwooleader_move01', chance: 100 },
    { on: ATTACK_1_2, play: 'Sound/w52/SE_Mon_beastwooleader_attack01' },
    { on: [A.Die], play: 'Sound/w52/SE_Mon_beastwoo_death01' },
  ],
});

/** `GMSwampOfQuiet::PlayMonsterSound` (GMSwampOfQuiet.cpp). */
const SAPI: readonly MonsterCue[] = [
  { on: ATTACK_1_2, play: 'Sound/w57/Sapi-Attack', chance: 3 },
  { on: [A.Die], play: 'Sound/w57/Sapi-Death', chance: 3 },
];
const NAPIN_ATTACK_DIE: readonly MonsterCue[] = [
  { on: ATTACK_1_2, play: 'Sound/w57/Naipin-Attack' },
  { on: [A.Die], play: 'Sound/w57/Naipin-Death' },
];
const SHADOW_DIE: MonsterCue = { on: [A.Die], play: 'Sound/w57/Shadow-Death' };

// One channel each (ZzzOpenData.cpp:3955-3992).
const SWAMP_OF_QUIET: VoiceSet = oneChannel({
  // SAPIUNUS / SAPIDUO
  136: SAPI,
  137: SAPI,
  // SAPITRES
  138: [
    { on: ATTACK_1_2, play: 'Sound/w57/Sapi-Attack1', chance: 3 },
    { on: [A.Die], play: 'Sound/w57/Sapi-Death', chance: 3 },
  ],
  // SHADOW_PAWN
  139: [{ on: ATTACK_1_2, play: 'Sound/w57/ShadowPawn-Attack' }, SHADOW_DIE],
  // SHADOW_KNIGHT
  140: [{ on: ATTACK_1_2, play: 'Sound/w57/ShadowKnight-Attack' }, SHADOW_DIE],
  // SHADOW_LOOK
  141: [{ on: ATTACK_1_2, play: 'Sound/w57/ShadowRook-Attack' }, SHADOW_DIE],
  // NAPIN
  142: [
    { on: [A.Walk], play: 'Sound/w57/Naipin-Thunder', chance: 100 },
    ...NAPIN_ATTACK_DIE,
  ],
  // GHOST_NAPIN
  143: [
    { on: [A.Walk], play: 'Sound/w57/Naipin-Ghost', chance: 100 },
    ...NAPIN_ATTACK_DIE,
  ],
  // BLAZE_NAPIN
  144: [
    { on: [A.Walk], play: 'Sound/w57/Naipin-Blaze', chance: 100 },
    ...NAPIN_ATTACK_DIE,
  ],
  // SAPI_QUEEN / WOLF_STATUS
  201: SAPI,
  204: SAPI,
  // ICE_NAPIN - shares the Blaze line, as the original does
  202: [
    { on: [A.Walk], play: 'Sound/w57/Naipin-Blaze', chance: 100 },
    ...NAPIN_ATTACK_DIE,
  ],
  // SHADOW_MASTER
  203: [{ on: ATTACK_1_2, play: 'Sound/w57/ShadowRook-Attack' }, SHADOW_DIE],
});

/** `CGMKarutan1::PlayMonsterSound` (GMKarutan1.cpp:737-869). Range is 600. */
const KARUTAN: VoiceSet = {
  // VENOMOUS_CHAIN_SCORPION
  209: [
    { on: ATTACK_1_2, play: 'Sound/Karutan/ToxyChainScorpion_attack' },
    { on: [A.Die], play: 'Sound/Karutan/ToxyChainScorpion_death' },
    { on: [A.Shock], play: 'Sound/Karutan/ToxyChainScorpion_hit' },
  ],
  // BONE_SCORPION
  210: [
    { on: ATTACK_1_2, play: 'Sound/Karutan/BoneScorpion_attack' },
    { on: [A.Die], play: 'Sound/Karutan/BoneScorpion_death' },
    { on: [A.Shock], play: 'Sound/Karutan/BoneScorpion_hit' },
  ],
  // ORCUS
  211: [
    { on: [A.Walk], play: 'Sound/Karutan/Orcus_move1', frame: [1, 2] },
    { on: [A.Walk], play: 'Sound/Karutan/Orcus_move2', frame: [7, 8] },
    { on: [A.Attack1], play: 'Sound/Karutan/Orcus_attack_1' },
    { on: [A.Attack2], play: 'Sound/Karutan/Orcus_attack_2' },
    { on: [A.Die], play: 'Sound/Karutan/Orcus_death' },
  ],
  // GOLLOCK
  212: [
    { on: [A.Walk], play: 'Sound/Karutan/Goloch_move1', frame: [1, 2] },
    { on: [A.Walk], play: 'Sound/Karutan/Goloch_move2', frame: [7, 8] },
    { on: ATTACK_1_2, play: 'Sound/Karutan/Goloch_attack' },
    { on: [A.Die], play: 'Sound/Karutan/Goloch_death' },
  ],
  // CRYPTA
  213: [
    { on: [A.Walk], play: 'Sound/Karutan/Crypta_move1', frame: [1, 2] },
    { on: [A.Walk], play: 'Sound/Karutan/Crypta_move2', frame: [7, 8] },
    { on: ATTACK_1_2, play: 'Sound/Karutan/Crypta_attack' },
    { on: [A.Die], play: 'Sound/Karutan/Crypta_death' },
  ],
  // CRYPOS - dies with Crypta's line
  214: [
    { on: [A.Walk], play: 'Sound/Karutan/Crypos_move1', frame: [1, 2] },
    { on: [A.Walk], play: 'Sound/Karutan/Crypos_move2', frame: [7, 8] },
    { on: [A.Attack1], play: 'Sound/Karutan/Crypos_attack_1' },
    { on: [A.Attack2], play: 'Sound/Karutan/Crypos_attack_2' },
    { on: [A.Die], play: 'Sound/Karutan/Crypta_death' },
  ],
  // CONDRA
  215: [
    { on: [A.Walk], play: 'Sound/Karutan/Condra_move1', frame: [1, 2] },
    { on: [A.Walk], play: 'Sound/Karutan/Condra_move2', frame: [7, 8] },
    { on: ATTACK_1_2, play: 'Sound/Karutan/Condra_attack' },
    { on: [A.Die], play: 'Sound/Karutan/Condra_death' },
  ],
  // NACONDRA - Condra's steps and death, its own attack
  216: [
    { on: [A.Walk], play: 'Sound/Karutan/Condra_move1', frame: [1, 2] },
    { on: [A.Walk], play: 'Sound/Karutan/Condra_move2', frame: [7, 8] },
    { on: ATTACK_1_2, play: 'Sound/Karutan/NarCondra_attack' },
    { on: [A.Die], play: 'Sound/Karutan/Condra_death' },
  ],
};

/** `CGM_PK_Field::PlayMonsterSound` (GM_PK_Field.cpp). */
const PK_FIELD_LINE = (
  attack: Sounds,
  damage: Sounds,
  move: Sounds,
  death: Sounds
): readonly MonsterCue[] => [
  { on: ATTACK_1_2, play: attack },
  { on: [A.Shock], play: damage },
  { on: [A.Walk], play: move, chance: 20 },
  { on: [A.Die], play: death },
];

const LAVA_GIANT: readonly MonsterCue[] = [
  { on: [A.Attack1], play: 'Sound/w64/BurningLavaGolem_attack01' },
  { on: [A.Attack2], play: 'Sound/w64/BurningLavaGolem_attack02' },
  { on: [A.Shock], play: 'Sound/w64/BurningLavaGolem_damage01' },
  { on: [A.Walk], play: 'Sound/w64/BurningLavaGolem_move01', chance: 20 },
  { on: [A.Die], play: 'Sound/w64/BurningLavaGolem_death' },
];

const BLOOD_ASSASSIN = PK_FIELD_LINE(
  'Sound/w64/BloodAssassin_attack',
  'Sound/w64/BloodAssassin_damage01',
  'Sound/w64/BloodAssassin_move01',
  'Sound/w64/BloodAssassin_death'
);

const PK_FIELD: VoiceSet = {
  // ZOMBIE_FIGHTER
  157: PK_FIELD_LINE(
    'Sound/w64/ZombieWarrior_attack',
    'Sound/w64/ZombieWarrior_damage01',
    'Sound/w64/ZombieWarrior_move01',
    'Sound/w64/ZombieWarrior_death'
  ),
  // GLADIATOR
  158: PK_FIELD_LINE(
    'Sound/w64/RaisedGladiator_attack',
    'Sound/w64/RaisedGladiator_damage01',
    'Sound/w64/RaisedGladiator_move01',
    'Sound/w64/RaisedGladiator_death'
  ),
  // SLAUGHTERER
  159: PK_FIELD_LINE(
    'Sound/w64/AshesButcher_attack',
    'Sound/w64/AshesButcher_damage01',
    'Sound/w64/AshesButcher_move01',
    'Sound/w64/AshesButcher_death'
  ),
  // BLOOD_ASSASSIN / CRUEL_BLOOD_ASSASSIN
  160: BLOOD_ASSASSIN,
  161: BLOOD_ASSASSIN,
  // LAVA_GIANT / BURNING_LAVA_GIANT
  162: LAVA_GIANT,
  163: LAVA_GIANT,
};

/**
 * `CGMDoppelGanger1::PlayMonsterSound` (GMDoppelGanger1.cpp:618-682); floors
 * 2-4 delegate to it unchanged.
 */
const ICE_WALKER: readonly MonsterCue[] = [
  { on: ATTACK_1_2, play: 'Sound/w58w59/IceWalker_attack' },
  { on: [A.Walk], play: 'Sound/w58w59/IceWalker_move', chance: 20 },
  // The original borrows Elbeland's werewolf for the Ice Walker's death.
  { on: [A.Die], play: 'Sound/w52/SE_Mon_wolfhuman_death01' },
];

const DOPPELGANGER: VoiceSet = {
  // The Ice Walker's waves are loaded with one channel (ZzzOpenData.cpp:3994-3997)
  ...oneChannel({ 145: ICE_WALKER }),
  // MAD_BUTCHER
  189: [
    { on: ATTACK_1_2, play: 'Sound/Doppelganger/Butcher_attack' },
    { on: [A.Die], play: 'Sound/Doppelganger/Butcher_death' },
  ],
  // TERRIBLE_BUTCHER
  190: [
    { on: ATTACK_1_2, play: 'Sound/Doppelganger/Angerbutcher_attack' },
    { on: [A.Die], play: 'Sound/Doppelganger/Angerbutcher_death' },
  ],
  // DOPPELGANGER - the slime speaks when it rises, not when it swings
  191: [
    { on: [A.Appear], play: 'Sound/Doppelganger/Doppelganger_attack' },
    { on: [A.Die], play: 'Sound/Doppelganger/Doppelganger_death' },
  ],
};

/** `CGM_Raklion::PlayMonsterSound` (GM_Raklion.cpp:2543-2717). */
const MAMMOTH: readonly MonsterCue[] = [
  { on: ATTACK_1_2, play: 'Sound/w58w59/GiantMammoth_attack' },
  { on: [A.Walk], play: 'Sound/w58w59/GiantMammoth_move', chance: 100 },
  { on: [A.Die], play: 'Sound/w58w59/GiantMammoth_death' },
];
const ICE_GIANT: readonly MonsterCue[] = [
  { on: [A.Walk], play: 'Sound/w58w59/IceGiant_move', chance: 100 },
  { on: [A.Die], play: 'Sound/w58w59/IceGiant_death' },
];
const COOLUTIN: readonly MonsterCue[] = [
  { on: ATTACK_1_2, play: 'Sound/w58w59/Coolertin_attack' },
  { on: [A.Walk], play: 'Sound/w58w59/Coolertin_move', chance: 20 },
  // Its death plays SOUND_MONSTER_HELLSPIDERDIE (GM_Raklion.cpp:2622), which
  // only the Hell Spider loads and every map change releases: silent.
];
const IRON_KNIGHT: readonly MonsterCue[] = [
  { on: ATTACK_1_2, play: 'Sound/w58w59/IronKnight_attack' },
  { on: [A.Stop1, A.Stop2, A.Walk], play: 'Sound/w58w59/IronKnight_move' },
  { on: [A.Die], play: 'Sound/death1' },
];

// One channel each (ZzzOpenData.cpp:3994-4026); the dark variants share the waves.
const RAKLION: VoiceSet = oneChannel({
  145: ICE_WALKER,
  146: MAMMOTH,
  147: ICE_GIANT,
  148: COOLUTIN,
  149: IRON_KNIGHT,
  // SELUPAN - the Appear crack is `CGM_Raklion::MoveMonsterVisual` (:647).
  // Appear is only his skill 37 (:2482), and his word / rage / cure lines are
  // event staged or skills too: all wait on the monster skill packet (0x69).
  150: [
    { on: ATTACK_1_2, play: 'Sound/w58w59/Selupan_attack1' },
    { on: [A.Attack3], play: 'Sound/w58w59/Selupan_attack2' },
    { on: [A.Die], play: 'Sound/w58w59/Selupan_word2' },
    { on: [A.Appear], play: 'Sound/w39/maya_hand_attack-02', frame: [5.6, 6.1], ...HOOK },
  ],
  // The four dark variants reuse the plain line
  205: MAMMOTH,
  206: ICE_GIANT,
  207: COOLUTIN,
  208: IRON_KNIGHT,
});

/**
 * `GMEmpireGuardian1..4::PlayMonsterSound`. Floor 1's handler covers all four
 * floors; 2, 3 and 4 add their own monsters on top and no number is claimed
 * twice, so the four lists are one set here.
 */
const JERINT_STEPS: readonly MonsterCue[] = [
  { on: [A.Walk], play: 'Sound/w69w70w71w72/Jelint_move01', frame: [7, 8] },
  { on: [A.Walk], play: 'Sound/w69w70w71w72/Jelint_move02', frame: [1, 2] },
];
const JERINT_STEP_PAIR: MonsterCue = {
  on: [A.Walk],
  play: ['Sound/w69w70w71w72/Jelint_move01', 'Sound/w69w70w71w72/Jelint_move02'],
};
const JERINT_DEATH: MonsterCue = { on: [A.Die], play: 'Sound/w69w70w71w72/Jelint_death' };

const EMPIRE_GUARDIAN: VoiceSet = {
  // GAYION (floor 4 boss)
  164: [
    { on: [A.Walk], play: 'Sound/w69w70w71w72/GaionKalein_move' },
    { on: [A.Appear], play: 'Sound/w69w70w71w72/GaionKalein_rage' },
    { on: [A.Die], play: 'Sound/w69w70w71w72/GrandWizard_death' },
  ],
  // JERRY
  165: [
    JERINT_STEP_PAIR,
    { on: [A.Attack1], play: 'Sound/w69w70w71w72/Jelint_attack1' },
    { on: [A.Attack2], play: 'Sound/eBloodAttack' },
    { on: [A.Attack3], play: 'Sound/w69w70w71w72/Jelint_attack3' },
    { on: [A.Attack3], play: 'Sound/BLOW_OF_DESTRUCTION' },
    { on: [A.Appear], play: 'Sound/w69w70w71w72/Jelint_rage' },
    JERINT_DEATH,
  ],
  // RAYMOND
  166: [
    ...JERINT_STEPS,
    { on: [A.Attack1], play: 'Sound/w69w70w71w72/Jelint_attack1' },
    { on: [A.Attack2, A.Attack3], play: 'Sound/w69w70w71w72/Raymond_attack2' },
    { on: [A.Appear], play: 'Sound/w69w70w71w72/Raymond_rage' },
    JERINT_DEATH,
  ],
  // LUCAS
  167: [
    JERINT_STEP_PAIR,
    { on: [A.Attack1], play: 'Sound/w69w70w71w72/Jelint_attack1' },
    { on: [A.Attack2], play: 'Sound/w69w70w71w72/Jelint_attack3' },
    { on: [A.Attack3], play: 'Sound/w69w70w71w72/Ercanne_attack3' },
    { on: [A.Appear], play: 'Sound/w69w70w71w72/Raymond_rage' },
    JERINT_DEATH,
  ],
  // FRED
  168: [
    ...JERINT_STEPS,
    { on: [A.Attack1], play: 'Sound/w69w70w71w72/CombatMaster_attack1' },
    { on: [A.Attack2], play: 'Sound/w69w70w71w72/1Deasuler_attack2' },
    { on: [A.Attack3], play: 'Sound/w69w70w71w72/1Deasuler_attack3' },
    { on: [A.Appear], play: 'Sound/w69w70w71w72/Jelint_rage' },
    JERINT_DEATH,
  ],
  // HAMMERIZE
  169: [
    JERINT_STEP_PAIR,
    { on: [A.Attack1, A.Attack3], play: 'Sound/w69w70w71w72/2Vermont_attack1' },
    { on: [A.Attack2], play: 'Sound/w69w70w71w72/2Vermont_attack2' },
    { on: [A.Appear], play: 'Sound/w69w70w71w72/Jelint_rage' },
    { on: [A.Die], play: 'Sound/w69w70w71w72/2Vermont_death' },
  ],
  // DUAL_BERSERKER
  170: [
    { on: [A.Walk], play: 'Sound/w69w70w71w72/3Cato_move' },
    { on: [A.Attack1], play: 'Sound/w69w70w71w72/CombatMaster_attack1' },
    { on: [A.Attack2, A.Attack3], play: 'Sound/w69w70w71w72/3Cato_attack2' },
    { on: [A.Appear], play: 'Sound/w69w70w71w72/Raymond_rage' },
    { on: [A.Die], play: 'Sound/w69w70w71w72/2Vermont_death' },
  ],
  // DEVIL_LORD
  171: [
    { on: [A.Walk], play: 'Sound/w69w70w71w72/3Cato_move' },
    { on: [A.Attack1], play: 'Sound/w69w70w71w72/Jelint_attack1' },
    { on: [A.Attack2, A.Attack3], play: 'Sound/w69w70w71w72/4Gallia_attack2' },
    { on: [A.Appear], play: 'Sound/w69w70w71w72/Jelint_rage' },
    { on: [A.Die], play: 'Sound/w69w70w71w72/2Vermont_death' },
  ],
  // QUARTER_MASTER
  172: [
    ...JERINT_STEPS,
    { on: [A.Attack1], play: 'Sound/w69w70w71w72/Jelint_attack1' },
    { on: [A.Attack2, A.Attack3], play: 'Sound/w69w70w71w72/QuaterMaster_attack2' },
    JERINT_DEATH,
  ],
  // COMBAT_INSTRUCTOR - the Appear thrust is `GMEmpireGuardian1::MoveMonsterVisual`
  // (:882); Appear is its skill 49 (:2546), so it waits on the skill packet
  173: [
    ...JERINT_STEPS,
    { on: [A.Attack1], play: 'Sound/w69w70w71w72/CombatMaster_attack1' },
    { on: [A.Attack2], play: 'Sound/w69w70w71w72/CombatMaster_attack2' },
    { on: [A.Attack3], play: 'Sound/w69w70w71w72/CombatMaster_attack3' },
    JERINT_DEATH,
    { on: [A.Appear], play: 'Sound/sDarkSpear', frame: [5, 5.8], ...HOOK },
  ],
  // ATICLES_HEAD
  174: [
    JERINT_STEP_PAIR,
    { on: [A.Attack1, A.Attack2, A.Attack3], play: 'Sound/w69w70w71w72/CombatMaster_attack3' },
    JERINT_DEATH,
  ],
  // DARK_GHOST
  175: [
    { on: [A.Walk], play: 'Sound/w69w70w71w72/GaionKalein_move' },
    { on: [A.Attack1], play: 'Sound/eMeteorite' },
    // SOUND_EXPLOTION01 is the global 1-channel wave (ZzzOpenData.cpp:4813).
    { on: [A.Attack1, A.Attack3], play: 'Sound/eExplosion', channels: 1 },
    { on: [A.Attack2], play: 'Sound/w42/firepillar' },
    { on: [A.Die], play: 'Sound/w69w70w71w72/GrandWizard_death' },
  ],
  // BANSHEE
  176: [
    { on: [A.Walk], play: 'Sound/w69w70w71w72/GaionKalein_move' },
    { on: [A.Attack1], play: 'Sound/w69w70w71w72/CombatMaster_attack1' },
    { on: [A.Attack2, A.Attack3], play: 'Sound/w69w70w71w72/CombatMaster_attack2' },
    { on: [A.Die], play: 'Sound/w69w70w71w72/AssassinMaster_Death' },
  ],
  // HEAD_MOUNTER
  177: [
    { on: [A.Walk], play: 'Sound/w69w70w71w72/CavalryLeader_move01', frame: [7, 8] },
    { on: [A.Walk], play: 'Sound/w69w70w71w72/CavalryLeader_move02', frame: [1, 2] },
    { on: [A.Attack1, A.Attack3], play: 'Sound/w69w70w71w72/CavalryLeader_attack1' },
    { on: [A.Attack2, A.Attack4], play: 'Sound/w69w70w71w72/CavalryLeader_attack2' },
    { on: [A.Die], play: 'Sound/w58w59/GiantMammoth_death' },
  ],
  // DEFENDER
  178: [
    ...JERINT_STEPS,
    { on: [A.Attack1], play: 'Sound/w69w70w71w72/CombatMaster_attack1' },
    { on: [A.Attack2], play: 'Sound/w69w70w71w72/CombatMaster_attack2' },
    { on: [A.Die], play: 'Sound/w69w70w71w72/GrandWizard_death' },
  ],
  // FORSAKER
  179: [
    { on: [A.Stop1, A.Stop2], play: 'Sound/w69w70w71w72/Priest_stay' },
    { on: [A.Attack1], play: 'Sound/aThunder01' },
    { on: [A.Attack2], play: 'Sound/w58w59/Selupan_cure' },
    { on: [A.Die], play: 'Sound/pDarkDeath' },
  ],
};

/**
 * Floor 2's own hooks on top (GMEmpireGuardian2.cpp:376-497, :1148-1190),
 * behind `IsEmpireGuardian2()`. The Dark Ghost's skill 51 flame and skill 52
 * meteor shower both play Attack2, and the client never learns which skill
 * it was, so only the plain attack's meteor is here.
 */
const EMPIRE_GUARDIAN_2: VoiceSet = {
  ...EMPIRE_GUARDIAN,
  // ATICLES_HEAD - the spear thrust; Attack2 and Appear are its skills 47 and 50
  // (:1074-1095), so it waits on the skill packet
  174: [
    ...EMPIRE_GUARDIAN[174],
    { on: [A.Attack2, A.Appear], play: 'Sound/sDarkSpear', frame: [6.6, 7.4], ...HOOK },
  ],
  // DARK_GHOST - the meteor lands on its target at any range
  175: [...EMPIRE_GUARDIAN[175], { on: [A.Attack1], play: 'Sound/eMeteorite', ...ATTACK_EFFECT }],
};

// ---- 3. hook sets ----------------------------------------------------------

/*
 * The move / render hooks run every frame the monster is drawn and are silent
 * while it is not (`drawn`); only the `AttackEffect` ones run for every live
 * monster. Walk chatter is a per-frame roll, the rest goes through the
 * `o->SubType` latch. A sound a hook re-issues every frame of a clip (the
 * deaths below, the frame windows) plays once here.
 *
 * Their waves are loaded by `MapManager` for the home map only and stay
 * loaded after it, so a hook with no world guard voices its monsters wherever
 * they appear - Devil Square 7's Kanturu monsters, Devil Square 5-6's Land of
 * Trials ones. The sets below assume the home map was visited, which the
 * original does not guarantee.
 */

/** The standard Crywolf line: walk chatter, then attack / death once per idle. */
const crywolfLine = (walk: Play, at1: Sounds, at2: Sounds, die: Sounds): MonsterCue[] => [
  hookWalk(walk),
  hookOnce([A.Attack1], at1),
  hookOnce([A.Attack2], at2),
  hookOnce([A.Die], die),
];

const BALRAM = crywolfLine(
  ['Sound/w35/balram_idle1', 'Sound/w35/balram_idle2'],
  'Sound/w35/balram_attack1',
  'Sound/w35/balram_attack2',
  'Sound/w35/balram_death'
);
const DEATH_SPIRIT = crywolfLine(
  ['Sound/w35/dths_idle1', 'Sound/w35/dths_idle2'],
  'Sound/w35/dths_at1',
  'Sound/w35/dths_at2',
  'Sound/w35/dths_deat'
);
const SORAM = crywolfLine(
  ['Sound/w35/soram_idle1', 'Sound/w35/soram_idle2'],
  'Sound/w35/soram_attack1',
  'Sound/w35/soram_attack2',
  'Sound/w35/soram_death'
);
const DARK_ELF: readonly MonsterCue[] = [
  ...crywolfLine(
    ['Sound/w35/darkelf_idle1', 'Sound/w35/darkelf_idle2'],
    'Sound/w35/darkelf_at1',
    'Sound/w35/darkelf_at2',
    'Sound/w35/darkelf_death'
  ),
  hookOnce([A.Attack3], 'Sound/w35/darkelf_skill1'),
  hookOnce([A.Attack4], 'Sound/w35/darkelf_skill2'),
];

/**
 * `M34CryWolf1st::RenderCryWolf1stMonsterVisual` (GMCrywolf1st.cpp:1566-2030)
 * and `AttackEffectCryWolf1stMonster` (:984-1093), both behind
 * `IsCyrWolf1st() || InDevilSquare()`.
 */
const CRYWOLF: VoiceSet = {
  // BEAM_KNIGHT - `CheckAttackTime(1)` (:1064), on top of its own voice
  44: [{ on: ATTACK_1_2, play: 'Sound/sEvil', ...ATTACK_EFFECT }],
  // BALGASS
  89: [
    ...crywolfLine(
      ['Sound/w35/balga_idle1', 'Sound/w35/balga_idle2'],
      'Sound/w35/balga_at1',
      'Sound/w35/balga_at2',
      'Sound/w35/balga_death'
    ),
    hookOnce([A.Attack3], 'Sound/w35/balga_skill1'),
    hookOnce([A.Attack4], 'Sound/w35/balga_skill2'),
  ],
  91: BALRAM,
  92: DARK_ELF,
  93: DEATH_SPIRIT,
  94: SORAM,
  // WEREWOLF_HERO
  95: crywolfLine(
    ['Sound/w35/ww_idle1', 'Sound/w35/ww_idle2'],
    'Sound/w35/ww_attack1',
    'Sound/w35/ww_attack2',
    'Sound/w35/ww_death'
  ),
  // VALAM
  96: crywolfLine(
    ['Sound/w35/ww_s3_idle1', 'Sound/w35/ww_s3_idle2'],
    'Sound/w35/ww_s3_attack1',
    'Sound/w35/ww_s3_attack2',
    'Sound/w35/ww_s3_death'
  ),
  // SOLAM
  97: crywolfLine(
    ['Sound/w35/ww_s2_idle1', 'Sound/w35/ww_s2_idle2'],
    'Sound/w35/ww_s2_attack1',
    'Sound/w35/ww_s2_attack2',
    'Sound/w35/ww_s2_death'
  ),
  // SCOUT
  98: crywolfLine(
    ['Sound/w35/ww_s1_idle1', 'Sound/w35/ww_s1_idle2'],
    'Sound/w35/ww_s1_attack1',
    'Sound/w35/ww_s1_attack2',
    'Sound/w35/ww_s1_death'
  ),
  // BALLISTA - its latch clears on any clip but Attack1 / Die: every shot speaks
  99: [hookPlay(ATTACK_1_2, 'Sound/w35/tanker_attack'), hookPlay([A.Die], 'Sound/w35/tanker_death')],
};

/**
 * `CGM3rdChangeUp::RenderBalgasBarrackMonsterVisual` (GM3rdChangeUp.cpp:808-1010),
 * the barrack and the refuge: Crywolf's lines again, the quest's Dark Elf too.
 */
const BALGAS_BARRACK: VoiceSet = {
  91: BALRAM,
  93: DEATH_SPIRIT,
  94: SORAM,
  // DARK_ELF
  126: DARK_ELF,
};

/** Walk chatter, then both attacks and the death behind the latch. */
const kanturuLine = (
  walk: Play,
  attack: Play,
  die: Sounds,
  once: true | 'life' = true,
  walkChance = 15
): MonsterCue[] => [
  hookWalk(walk, walkChance, WALK),
  hookOnce(ATTACK_1_2, attack, once),
  hookOnce([A.Die], die, once),
];

const BERSERK = kanturuLine(
  ['Sound/w37/ber_idle-01', 'Sound/w37/ber_idle-02'],
  ['Sound/w37/ber_attack-01', 'Sound/w37/ber_attack-02'],
  'Sound/w37/ber_death'
);
const GIGANTIS = kanturuLine(
  'Sound/w37/gigan_idle-01',
  ['Sound/w37/gigan_attack-01', 'Sound/w37/gigan_attack-02'],
  'Sound/w37/gigan_death'
);
const GENOCIDER = kanturuLine(
  ['Sound/w37/geno_idle-01', 'Sound/w37/geno_idle-02'],
  ['Sound/w37/geno_attack-01', 'Sound/w37/geno_attack-02'],
  'Sound/w37/geno_death'
);
const KENTAUROS = kanturuLine(
  ['Sound/w37/kenta_idle-01', 'Sound/w37/kenta_idle-02'],
  ['Sound/w37/kenta_attack-01', 'Sound/w37/kenta_skill-01'],
  'Sound/w37/kenta_death',
  'life'
);

/**
 * `M37Kanturu1st::RenderKanturu1stMonsterVisual` (GM_Kanturu_1st.cpp:1087-1602),
 * no world guard. The Splinter Wolf, Iron Rider, Satyros, Blade Hunter and
 * both Kentauros never clear `o->SubType` (`'life'`): one attack or death
 * line per spawn.
 */
const KANTURU_1ST: VoiceSet = {
  106: BERSERK,
  // SPLINTER_WOLF
  107: kanturuLine(
    ['Sound/w37/swolf_idle-01', 'Sound/w37/swolf_idle-02'],
    ['Sound/w37/swolf_attack-01', 'Sound/w37/swolf_attack-02'],
    'Sound/w37/swolf_death',
    'life'
  ),
  // IRON_RIDER
  108: kanturuLine(
    ['Sound/w37/ir_idle-01', 'Sound/w37/ir_idle-02'],
    ['Sound/w37/ir_attack-01', 'Sound/w37/ir_attack-02'],
    'Sound/w37/ir_death',
    'life'
  ),
  // SATYROS
  109: kanturuLine(
    ['Sound/w37/sati_idle-01', 'Sound/w37/sati_idle-02'],
    ['Sound/w37/sati_attack-01', 'Sound/w37/sati_attack-02'],
    'Sound/w37/sati_death',
    'life'
  ),
  // BLADE_HUNTER
  110: kanturuLine(
    ['Sound/w37/blade_idle-01', 'Sound/w37/blade_idle-02'],
    ['Sound/w37/blade_attack-01', 'Sound/w37/blade_attack-02'],
    'Sound/w37/blade_death',
    'life',
    10
  ),
  111: KENTAUROS,
  112: GIGANTIS,
  113: GENOCIDER,
  // BERSERKER_WARRIOR / KENTAUROS_WARRIOR / GIGANTIS_WARRIOR / SOCCERBALL
  197: BERSERK,
  198: KENTAUROS,
  199: GIGANTIS,
  200: GENOCIDER,
};

/**
 * `M38Kanturu2nd::Render_Kanturu2nd_MonsterVisual` (GM_Kanturu_2nd.cpp:793-1071),
 * no world guard. Stop and Walk both clear its latch, so a per-clip play
 * stands in for it; the deaths are re-issued every frame.
 */
const KANTURU_2ND: VoiceSet = {
  // PERSONA
  114: [
    hookWalk(['Sound/w38/perso_idle-01', 'Sound/w38/perso_idle-02'], 15, WALK),
    hookPlay([A.Attack1], 'Sound/w38/perso_attack-01'),
    hookPlay([A.Attack2], 'Sound/w38/perso_attack-02'),
    hookPlay([A.Die], 'Sound/w38/perso_death'),
  ],
  // TWIN_TAIL - one of the pair every 500 ms of walking (:963-990)
  115: [
    {
      ...hookPlay(WALK, ['Sound/w38/twin_idle-01', 'Sound/w38/twin_idle-02']),
      period: 500,
    },
    hookPlay([A.Attack1], 'Sound/w38/twin_attack-01'),
    hookPlay([A.Attack2], 'Sound/w38/twin_attack-02'),
    hookPlay([A.Die], 'Sound/w38/twin_death'),
  ],
  // DREADFEAR
  116: [
    hookWalk(['Sound/w38/dred_idle-01', 'Sound/w38/dred_idle-02'], 15, WALK),
    hookPlay([A.Attack1], 'Sound/w38/dred_attack-01'),
    hookPlay([A.Attack2], 'Sound/w38/dred_attack-02'),
    hookPlay([A.Die], 'Sound/w38/dred_death'),
  ],
};

const MAYA_HAND_SWING = { frame: [4.3, Infinity], ...ATTACK_EFFECT, channels: 1 } as const;
const MAYA_HAND: readonly MonsterCue[] = [
  // `CheckAttackTime(14)`: 13 ticks into the 0.33-speed swing
  { on: [A.Attack1], play: 'Sound/w39/maya_hand_attack-01', ...MAYA_HAND_SWING },
  { on: [A.Attack2], play: 'Sound/w39/maya_hand_attack-02', ...MAYA_HAND_SWING },
];

/**
 * `M39Kanturu3rd::MoveKanturu3rdMonsterVisual` (GM_Kanturu_3rd.cpp:788-952)
 * and `AttackEffectKanturu3rdMonster` (:1358-1476), behind `IsInKanturu3rd()`.
 */
const KANTURU_3RD: VoiceSet = {
  // MAYA_HAND_LEFT / MAYA_HAND_RIGHT
  118: MAYA_HAND,
  119: MAYA_HAND,
  // NIGHTMARE - Attack2-4 load `nightmare_skill-0N` with no `.wav`
  // (MapManager.cpp:498-500), which never opens: silent
  121: [
    hookWalk(['Sound/w39/nightmare_idle-01', 'Sound/w39/nightmare_idle-02']),
    hookOnce([A.Attack1], 'Sound/w39/nightmare_attack-01'),
    hookOnce([A.Die], 'Sound/w39/nightmare_death'),
  ],
};

/** Walk chatter, then Attack1 / Attack2 / death behind the latch. */
const aidaLine = (walk: Play, at1: Sounds, at2: Sounds, die: Sounds, walkChance = 15): MonsterCue[] => [
  hookWalk(walk, walkChance),
  hookOnce([A.Attack1], at1),
  hookOnce([A.Attack2], at2),
  hookOnce([A.Die], die),
];

const WITCH_QUEEN: readonly MonsterCue[] = [
  hookWalk(['Sound/w34/wq_idle1', 'Sound/w34/wq_idle2']),
  hookOnce([A.Attack1], 'Sound/w34/wq_attack2'),
  // SOUND_CHAOS_THUNDER01 + rand() % 2 and her own line, behind one latch
  hookOnce([A.Attack2], ['Sound/eElec1', 'Sound/eElec2']),
  hookOnce([A.Attack2], 'Sound/w34/wq_attack1'),
  hookOnce([A.Die], 'Sound/w34/wq_death'),
];
const STONE_GOLEM = aidaLine(
  ['Sound/w34/bg_idle1', 'Sound/w34/bg_idle2'],
  'Sound/w34/bg_attack1',
  'Sound/w34/bg_attack2',
  'Sound/w34/bg_death'
);
// The data ships `dr_idle01`, so `dr_idle1.wav` (MapManager.cpp:344) never
// loads and half the walk rolls are silent.
const DEATH_RIDER = aidaLine(
  'Sound/w34/dr_idle2',
  'Sound/w34/dr_attack1',
  'Sound/w34/dr_attack2',
  'Sound/w34/dr_death',
  30
);
const FOREST_ORC = aidaLine(
  ['Sound/w34/fo_idle1', 'Sound/w34/fo_idle2'],
  'Sound/w34/fo_attack1',
  'Sound/w34/fo_attack2',
  'Sound/w34/fo_death'
);

/** `M33Aida::RenderAidaMonsterVisual` (GMAida.cpp:723-1390), no world guard. */
const AIDA: VoiceSet = {
  100: WITCH_QUEEN,
  // GOLDEN_STONE_GOLEM
  101: STONE_GOLEM,
  102: DEATH_RIDER,
  103: FOREST_ORC,
  // DEATH_TREE
  104: aidaLine(
    ['Sound/w34/dt_idle1', 'Sound/w34/dt_idle2'],
    'Sound/w34/dt_attack1',
    'Sound/w34/dt_attack2',
    'Sound/w34/dt_death'
  ),
  // HELL_MAINE - Attack1 plays the ATTACK3 wave and Attack3 the ATTACK1 one
  105: [
    hookWalk(['Sound/w34/hm_idle1', 'Sound/w34/hm_idle2']),
    hookOnce([A.Attack1], 'Sound/w34/hm_bloodywind'),
    hookOnce([A.Attack2], 'Sound/w34/hm_firelay'),
    hookOnce([A.Attack3], 'Sound/w34/hm_attack1'),
    hookOnce([A.Die], 'Sound/w34/hm_death'),
  ],
  // BLOODY_ORC / BLOODY_DEATH_RIDER / BLOODY_GOLEM / BLOODY_WITCH_QUEEN
  193: FOREST_ORC,
  194: DEATH_RIDER,
  195: STONE_GOLEM,
  196: WITCH_QUEEN,
};

const NOT_DYING: readonly MonsterActionType[] = [
  A.Stop1, A.Stop2, A.Walk, A.Run, A.Attack1, A.Attack2, A.Attack3, A.Attack4, A.Shock, A.Appear,
];

/**
 * `M31HuntingGround::RenderHuntingGroundMonsterVisual` (GMHuntingGround.cpp:371-719),
 * no world guard, and the Erohim's entrance in `CreateHuntingGroundMonster` (:285).
 */
const LAND_OF_TRIALS: VoiceSet = {
  // LIZARD_WARRIOR
  81: [
    hookWalk(['Sound/w31/mLWidle1', 'Sound/w31/mLWidle2']),
    hookOnce(ATTACK_1_2, ['Sound/w31/mLWattack1', 'Sound/w31/mLWattack2']),
    hookOnce([A.Die], 'Sound/w31/mLWdeath'),
  ],
  // FIRE_GOLEM - rumbles in every clip but its death
  82: [
    { on: NOT_DYING, play: ['Sound/w31/mFGidle1', 'Sound/w31/mFGidle2'], chance: 20, perFrame: true, ...HOOK },
    { on: [A.Attack1], play: 'Sound/w31/mFGattack1', frame: [8.4, 10.2], once: true, ...HOOK },
    { on: [A.Attack2], play: 'Sound/w31/mFGattack2', frame: [5, 5.7], once: true, ...HOOK },
    hookPlay([A.Die], 'Sound/w31/mFGdeath'),
  ],
  // QUEEN_BEE - its walk line takes the latch too; dies with the Axe Warrior's line
  83: [
    hookOnce(WALK_RUN, ['Sound/w31/mQBidle1', 'Sound/w31/mQBidle2']),
    hookOnce(ATTACK_1_2, ['Sound/w31/mQBattack1', 'Sound/w31/mQBattack2']),
    hookOnce([A.Die], 'Sound/w31/mAWdeath'),
  ],
  // POISON_GOLEM
  84: [
    hookOnce(WALK_RUN, ['Sound/w31/mPGidle1', 'Sound/w31/mPGidle2']),
    hookOnce([A.Attack1], 'Sound/w31/mPGeff1'),
    {
      on: [A.Attack2],
      play: ['Sound/w31/mPGattack1', 'Sound/w31/mPGattack2'],
      frame: [3.5, 4.2],
      once: true,
      ...HOOK,
    },
    hookPlay([A.Die], 'Sound/w31/mPGdeath'),
  ],
  // AXE_HERO
  85: [
    hookWalk(['Sound/w31/mAWidle1', 'Sound/w31/mAWidle2'], 10),
    hookOnce(ATTACK_1_2, ['Sound/w31/mAWattack1', 'Sound/w31/mAWattack2']),
    hookOnce([A.Die], 'Sound/w31/mAWdeath'),
  ],
  // EROHIM
  87: [
    { on: [], play: 'Sound/w31/mELOidle1', spawn: true, unranged: true, channels: 1 },
    hookOnce([A.Attack1], ['Sound/w31/mELOattack1', 'Sound/w31/mELOattack2']),
    hookOnce([A.Attack2], 'Sound/w31/mELOeff1'),
    hookOnce([A.Die], 'Sound/w31/mELOdeath'),
  ],
};

/** Hooks that check no world: they voice their monsters on any map. */
const ANY_MAP_HOOKS: VoiceSet = {
  ...LAND_OF_TRIALS,
  ...AIDA,
  ...KANTURU_1ST,
  ...KANTURU_2ND,
  // ILLUSION_OF_KUNDUN - the real Kundun's collapse, `RenderHellasMonsterObjectMesh`
  // (GMHellas.cpp:2016, :2059). His roar (:1644) answers MONSTER01_SHOCK, which
  // Kundun 7 never plays (WSclient.cpp:3300).
  64: [
    { on: [A.Die], play: 'Sound/mKundunDestory', frame: [8, Infinity], ...HOOK },
    // `> 14.8f` is the clip's last sliver, one key past where ours holds
    { on: [A.Die], play: 'Sound/mKundunShudder', frame: [14.8, Infinity], ...HOOK },
  ],
};

// ---- 4. the world index ----------------------------------------------------

const W = ENUM_WORLD;

/** Which worlds each set answers on, from the guard each handler opens with. */
const BY_WORLD = new Map<ENUM_WORLD, VoiceSet>([
  [W.WD_51ELBELAND, ELBELAND],
  [W.WD_56MAP_SWAMP_OF_QUIET, SWAMP_OF_QUIET],
  // `IsKarutanMap()` (GMKarutan1.cpp:876-879)
  [W.WD_80KARUTAN1, KARUTAN],
  [W.WD_81KARUTAN2, KARUTAN],
  [W.WD_63PK_FIELD, PK_FIELD],
  [W.WD_65DOPPLEGANGER1, DOPPELGANGER],
  [W.WD_66DOPPLEGANGER2, DOPPELGANGER],
  [W.WD_67DOPPLEGANGER3, DOPPELGANGER],
  [W.WD_68DOPPLEGANGER4, DOPPELGANGER],
  // `IsIceCity()` - Raklion and its boss room (GM_Raklion.cpp:2294-2299)
  [W.WD_57ICECITY, RAKLION],
  [W.WD_58ICECITY_BOSS, RAKLION],
  [W.WD_69EMPIREGUARDIAN1, EMPIRE_GUARDIAN],
  [W.WD_70EMPIREGUARDIAN2, EMPIRE_GUARDIAN_2],
  [W.WD_71EMPIREGUARDIAN3, EMPIRE_GUARDIAN],
  [W.WD_72EMPIREGUARDIAN4, EMPIRE_GUARDIAN],
  // `IsCyrWolf1st() || InDevilSquare()` (GMCrywolf1st.cpp:1568)
  [W.WD_34CRYWOLF_1ST, CRYWOLF],
  [W.WD_9DEVILSQUARE, CRYWOLF],
  [W.WD_32DEVILSQUARE_5_7, CRYWOLF],
  [W.WD_39KANTURU_3RD, KANTURU_3RD],
  // `IsBalgasBarrackMap() || IsBalgasRefugeMap()` (GM3rdChangeUp.cpp:810)
  [W.WD_41CHANGEUP3RD_1ST, BALGAS_BARRACK],
  [W.WD_42CHANGEUP3RD_2ND, BALGAS_BARRACK],
]);

/**
 * The cues a monster model has here, global list first - or null when this
 * map has nothing to say about it and the generic table is the only voice.
 */
export function mapMonsterCues(
  world: ENUM_WORLD,
  modelType: number
): readonly MonsterCue[] | null {
  return (
    GLOBAL_VOICES[modelType] ??
    BY_WORLD.get(world)?.[modelType] ??
    ANY_MAP_HOOKS[modelType] ??
    null
  );
}

// ---- 5. the stepper --------------------------------------------------------

/** `rand_fps_check(n)` (Random.cpp:75): one in n per frame at the 25 fps reference. */
export function fpsCheck(n: number, dt: number): boolean {
  return Math.random() * n <= Math.min(1, dt * 25);
}
const oneIn = (n: number) => Math.random() * n < 1;

/** `rand_fps_check(2) ? a : b`, or the single sound a cue carries. */
function cueSound(cue: MonsterCue): Sounds {
  return Array.isArray(cue.play)
    ? cue.play[Math.random() < 0.5 ? 0 : 1]
    : (cue.play as Sounds);
}

/** Per monster with cues: what they have done in the clip it is in. */
export type CueState = {
  /** Frame-window cues already fired this pass through the clip. */
  fired: boolean[];
  /** When a repeating cue may play again: its last play's end, or its period. */
  until: number[];
  /** `o->SubType`: 0 clear, 1 set until the next idle, 2 set for good. */
  latch: 0 | 1 | 2;
  lastFrame: number;
};

/** A repeating cue whose play was dropped waits this long before it tries again. */
export const CUE_RETRY_MS = 100;

export function newCueState(count: number, frame: number): CueState {
  return {
    fired: new Array<boolean>(count).fill(false),
    until: new Array<number>(count).fill(0),
    latch: 0,
    lastFrame: frame,
  };
}

/** Starts `key` at `at`; returns how long it lasts in ms, 0 if nothing started. */
export type CuePlayer<P> = (key: Sounds, channels: number | undefined, at: P) => number;

/**
 * One frame of one monster's cues. `frame` is `o->AnimationFrame`, or
 * Infinity once a one-shot has run out; `started` is a clip (re)start since
 * the last step; `drawn` is `o->Visible`. Allocation-free.
 */
export function stepCues<P>(
  s: CueState,
  cues: readonly MonsterCue[],
  action: MonsterActionType,
  started: boolean,
  frame: number,
  dt: number,
  now: number,
  inRange: boolean,
  drawn: boolean,
  at: P,
  play: CuePlayer<P>
): void {
  // A fresh clip or a wrapped loop is a new pass through every window.
  const looped = !started && frame < s.lastFrame;
  const prev = started || looped ? -Infinity : s.lastFrame;
  s.lastFrame = frame;
  if (started || looped) s.fired.fill(false);

  const walking = action === A.Walk || action === A.Run;
  const idle = action === A.Stop1 || action === A.Stop2;
  // The hooks clear it, so only on a frame they run.
  if (idle && drawn && s.latch === 1) s.latch = 0;
  // Every `once` cue answering this clip sits behind the one latch test.
  const latched = s.latch !== 0;

  for (let i = 0; i < cues.length; i++) {
    const cue = cues[i];
    if (!cue.on.includes(action)) continue;
    if (!inRange && !cue.unranged) continue;
    if (!drawn && cue.drawn) continue;

    if (cue.frame) {
      if (s.fired[i] || frame < cue.frame[0] || prev >= cue.frame[1]) continue;
      s.fired[i] = true;
    } else if (cue.once) {
      // The latch below is the whole trigger: tested every frame.
    } else if (walking || cue.perFrame) {
      if (cue.chance ? !fpsCheck(cue.chance, dt) : now < s.until[i]) continue;
    } else if (idle) {
      if (!looped) continue;
      if (cue.chance && !oneIn(cue.chance)) continue;
    } else {
      if (!started) continue;
      if (cue.chance && !oneIn(cue.chance)) continue;
    }

    if (cue.once) {
      if (latched) continue;
      s.latch = cue.once === 'life' ? 2 : 1;
    }
    const ms = play(cueSound(cue), cue.channels, at);
    s.until[i] = now + (cue.period ?? (ms > 0 ? ms : CUE_RETRY_MS));
  }
}

/** The cues a map's CreateMonster plays as the monster is created. */
export function playSpawnCues<P>(
  cues: readonly MonsterCue[],
  at: P,
  play: CuePlayer<P>
): void {
  for (const cue of cues) if (cue.spawn) play(cueSound(cue), cue.channels, at);
}
