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
 * The dispatch order is the original's: the global list first, then Elbeland,
 * then the Swamp of Quiet, then the active map's own (`TheMapProcess()`).
 * Since no model number appears in two of them, one lookup per map is enough.
 *
 * `fDistance > 500.0f` gates every one of these: they are played 2D at full
 * volume in the original, with a hard five-tile cutoff instead of a falloff.
 * Here they keep their position (so they pan and attenuate like every other
 * effect) and the cutoff is kept as the range it is.
 *
 * Not ported: the four voices `PlayMonsterSoundGlobal` gives NPC models
 * rather than monster models - Titus' idle, Lugard's breath and the two
 * Doppelganger chests opening (ZzzCharacter.cpp:15198-15221). They are keyed
 * by NPC model, which never reaches the monster path.
 */

/** One rule: an action set, the sound, and how often / when it fires. */
export type MonsterCue = {
  /** Actions this cue answers to. */
  readonly on: readonly MonsterActionType[];
  /** The sound; a pair is the original's `rand_fps_check(2) ? a : b`. */
  readonly play: Sounds | readonly [Sounds, Sounds];
  /** `rand_fps_check(n)`: one chance in n at the moment the clip starts. */
  readonly chance?: number;
  /**
   * `1.f <= AnimationFrame && AnimationFrame < 2.f` - a footstep, played as
   * the clip passes the window rather than when it starts.
   */
  readonly frame?: readonly [number, number];
};

const A = MonsterActionType;

/** Model type -> its cues. Keys are `MONSTER_MODEL_x`, as in `MONSTER_SOUNDS`. */
export type VoiceSet = Readonly<Record<number, readonly MonsterCue[]>>;

/** `fDistance > 500.0f` in MU units - five tiles. */
export const MAP_VOICE_RANGE_TILES = 5;

const ATTACK_1_2: readonly MonsterActionType[] = [A.Attack1, A.Attack2];

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
    { on: [A.Shock], play: 'Sound/xmas/DarkSanta_Damage01' },
    { on: [A.Die], play: 'Sound/xmas/DarkSanta_Death01' },
  ],
};

// ---- 2. per-map sets -------------------------------------------------------

/** `GMNewTown::PlayMonsterSound` (GMNewTown.cpp:1110-1252). */
const ELBELAND: VoiceSet = {
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
};

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

const SWAMP_OF_QUIET: VoiceSet = {
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
};

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
  145: ICE_WALKER,
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
  { on: [A.Die], play: 'Sound/mHellSpiderDie' },
];
const IRON_KNIGHT: readonly MonsterCue[] = [
  { on: ATTACK_1_2, play: 'Sound/w58w59/IronKnight_attack' },
  { on: [A.Stop1, A.Stop2, A.Walk], play: 'Sound/w58w59/IronKnight_move' },
  { on: [A.Die], play: 'Sound/death1' },
];

const RAKLION: VoiceSet = {
  145: ICE_WALKER,
  146: MAMMOTH,
  147: ICE_GIANT,
  148: COOLUTIN,
  149: IRON_KNIGHT,
  // SELUPAN
  150: [
    { on: ATTACK_1_2, play: 'Sound/w58w59/Selupan_attack1' },
    { on: [A.Attack3], play: 'Sound/w58w59/Selupan_attack2' },
    { on: [A.Die], play: 'Sound/w58w59/Selupan_word2' },
  ],
  // The four dark variants reuse the plain line
  205: MAMMOTH,
  206: ICE_GIANT,
  207: COOLUTIN,
  208: IRON_KNIGHT,
};

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
    { on: [A.Attack3], play: 'Sound/w69w70w71w72/4Gallia_attack2' },
    { on: [A.Appear], play: 'Sound/w69w70w71w72/Jelint_rage' },
    { on: [A.Die], play: 'Sound/w69w70w71w72/2Vermont_death' },
  ],
  // QUARTER_MASTER
  172: [
    ...JERINT_STEPS,
    { on: [A.Attack1], play: 'Sound/w69w70w71w72/Jelint_attack1' },
    { on: [A.Attack3], play: 'Sound/w69w70w71w72/QuaterMaster_attack2' },
    JERINT_DEATH,
  ],
  // COMBAT_INSTRUCTOR
  173: [
    ...JERINT_STEPS,
    { on: [A.Attack1], play: 'Sound/w69w70w71w72/CombatMaster_attack1' },
    { on: [A.Attack2], play: 'Sound/w69w70w71w72/CombatMaster_attack2' },
    { on: [A.Attack3], play: 'Sound/w69w70w71w72/CombatMaster_attack3' },
    JERINT_DEATH,
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
    { on: [A.Attack1, A.Attack3], play: 'Sound/eExplosion' },
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
    { on: [A.Stop2], play: 'Sound/w69w70w71w72/Priest_stay' },
    { on: [A.Attack1], play: 'Sound/aThunder01' },
    { on: [A.Attack2], play: 'Sound/w58w59/Selupan_cure' },
    { on: [A.Die], play: 'Sound/pDarkDeath' },
  ],
};

// ---- 3. the world index ----------------------------------------------------

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
  [W.WD_70EMPIREGUARDIAN2, EMPIRE_GUARDIAN],
  [W.WD_71EMPIREGUARDIAN3, EMPIRE_GUARDIAN],
  [W.WD_72EMPIREGUARDIAN4, EMPIRE_GUARDIAN],
]);

/**
 * The cues a monster model has here, global list first - or null when this
 * map has nothing to say about it and the generic table is the only voice.
 */
export function mapMonsterCues(
  world: ENUM_WORLD,
  modelType: number
): readonly MonsterCue[] | null {
  return GLOBAL_VOICES[modelType] ?? BY_WORLD.get(world)?.[modelType] ?? null;
}

/** Whether any map or the global list voices this model. */
export function hasMapMonsterVoice(modelType: number): boolean {
  if (GLOBAL_VOICES[modelType]) return true;
  for (const set of BY_WORLD.values()) if (set[modelType]) return true;
  return false;
}
