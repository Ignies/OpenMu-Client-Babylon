import type { ParticleRecipe, RGB, SheetCells } from './core';

/**
 * Pure data shared by the effect entries and the skill table in
 * `common/skillVisuals.ts`: the effect sheets under Data/Effect, the skill
 * models under Data/Skill, the palette and the particle recipes.
 *
 * Every texture is a file the original loads in `ZzzOpenData.cpp`; `.OZJ`
 * is a JPG (black where transparent, drawn additive `(ONE, ONE)`), `.OZT`
 * a TGA with alpha (drawn alpha-tested). `loadEffectTexture` decodes both.
 */

// ---- textures ----------------------------------------------------------------

export const TEX = {
  /** BITMAP_LIGHT (flare01.jpg): the soft round glow every spark is. */
  flare: 'Effect/flare01.OZJ',
  flareRed: 'Effect/flare01_red.OZJ',
  /** BITMAP_FLARE_BLUE / BITMAP_FLARE_RED. */
  flareBlue: 'Effect/flareBlue.OZJ',
  /** BITMAP_FLARE (Flare.jpg): the joint-flare sheet SpiralSlash / Recover ribbons draw. */
  flareBig: 'Effect/Flare.OZJ',
  /** BITMAP_FLARE+1 (Flare02.jpg, REPEAT): RemovalBuff's ribbons. */
  flare2: 'Effect/flare02.OZJ',
  /** BITMAP_FLARE_FORCE (NSkill.jpg): ElectricSpark / DeathStab / PlasmaStorm ribbons. */
  flareForce: 'Effect/NSkill.OZJ',
  /** BITMAP_FLASH (Flashing.jpg): the Stun / RemovalStun ribbon. */
  flash: 'Effect/Flashing.OZJ',
  /** BITMAP_FIRE / +1 / +2 / +3: 4-cell 64×64 strips (Fire01/02/03/05.jpg). */
  fire: 'Effect/Fire01.OZJ',
  fire2: 'Effect/Fire02.OZJ',
  fire3: 'Effect/Fire03.OZJ',
  fire5: 'Effect/Fire05.OZJ',
  /** BITMAP_FLAME: the tall tongue the Flame column is stacked from. */
  flame: 'Effect/Flame01.OZJ',
  inferno: 'Effect/inferno.OZJ',
  /** BITMAP_JOINT_SPARK (Spark01.jpg): Rush's / the rider strike's spark ribbons. */
  spark: 'Effect/Spark01.OZJ',
  /** BITMAP_SPARK (Spark02.jpg) / BITMAP_SPARK+1 (Spark03.jpg): small hot chips. */
  spark2: 'Effect/Spark02.OZJ',
  spark3: 'Effect/Spark03.OZJ',
  /** BITMAP_SPARK+2 (Spark.jpg). */
  sparkSoft: 'Effect/spark.OZJ',
  /** BITMAP_LIGHTNING: the bolt strip. */
  lightning: 'Effect/lightning.OZJ',
  /**
   * BITMAP_FENRIR_FOOT_THUNDER1..5 (eff_lightinga01..05.jpg): the five frames
   * of the ground splash a Fenrir's paws leave (ZzzOpenData.cpp:5413-5417).
   */
  footThunder1: 'Effect/eff_lightinga01.OZJ',
  footThunder2: 'Effect/eff_lightinga02.OZJ',
  footThunder3: 'Effect/eff_lightinga03.OZJ',
  footThunder4: 'Effect/eff_lightinga04.OZJ',
  footThunder5: 'Effect/eff_lightinga05.OZJ',
  lightning2: 'Effect/lightning2.OZJ',
  thunder: 'Effect/Thunder01.OZJ',
  /** energy01/02: soft energy sheets (not the original's BITMAP_ENERGY, which is `thunder`). */
  energy: 'Effect/energy01.OZJ',
  energy2: 'Effect/energy02.OZJ',
  /** BITMAP_JOINT_*: the ribbon textures CreateJoint draws with. */
  jointThunder: 'Effect/JointThunder01.OZJ',
  jointEnergy: 'Effect/JointEnergy01.OZJ',
  jointSpirit: 'Effect/JointSpirit01.OZJ',
  jointSpirit2: 'Effect/JointSpirit02.OZJ',
  jointLaser: 'Effect/JointLaser01.OZJ',
  jointFire: 'Effect/joint_sword_red.OZJ',
  /** BITMAP_JOINT_FORCE (motion_blur_r2.jpg, REPEAT): FireSlash / DeathCannon ribbon. */
  jointForce: 'Effect/motion_blur_r2.OZJ',
  /** BITMAP_MAGIC (Magic_Ground1) / BITMAP_MAGIC+1 (Magic_Ground2) / BITMAP_MAGIC+2 (Magic_Circle1). */
  magicCircle: 'Effect/Magic_Circle1.OZJ',
  magicGround: 'Effect/Magic_Ground1.OZJ',
  magicGround2: 'Effect/Magic_Ground2.OZJ',
  magicGround3: 'Effect/magic_ground3.OZJ',
  /** BITMAP_MAGIC_ZIN (mzine_typer2.jpg): the Weakness / Enervation circle. */
  magicZin: 'Effect/mzine_typer2.OZJ',
  /** BITMAP_MAGIC_EMBLEM (Magic_b.jpg). */
  magicEmblem: 'Effect/magic_b.OZJ',
  /**
   * BITMAP_GM_AURORA (Skill/gmmzine.jpg, ZzzOpenData.cpp:5259): the mark a
   * game master stands on. The only effect texture outside `Effect/`, which
   * is why `tools/copyData.ts` names it.
   */
  gmAurora: 'Skill/gmmzine.OZJ',
  /** BITMAP_SHOCK_WAVE and the impact rings. */
  shockwave: 'Effect/Shockwave.OZJ',
  impact: 'Effect/impack01.OZJ',
  impact3: 'Effect/Impack03.OZJ',
  empact: 'Effect/empact01.OZJ',
  ring: 'Effect/ring.OZJ',
  circleFire: 'Effect/CircleFire03.OZJ',
  /**
   * blood01.ozt: one ragged 64×64 splat, a TGA with real alpha (mean 96) and
   * the red already in the texels. The client's only usable blood art, and
   * what everything blood is drawn with rather than a red-tinted `flare` -
   * see BLOOD_CHIPS. (blood.OZT, the 128×128 two-patch spatter, averages
   * alpha 13 and all but vanishes on a card; the ground decal's splat is this
   * same blood01.)
   */
  blood: 'Effect/blood01.ozt',
  /** BITMAP_SMOKE (smoke01.jpg) / +1 (smoke02.tga) / +4 (smoke05.tga). */
  smoke: 'Effect/smoke01.OZJ',
  smokeAlpha: 'Effect/smoke02.ozt',
  smoke5: 'Effect/smoke05.OZT',
  cloud: 'Effect/clouds.OZJ',
  clud: 'Effect/clud64.OZJ',
  mist: 'Effect/mist01.OZJ',
  /** BITMAP_SHINY..+6: Shiny01/02/03, eye01 (`eye`), ring (`ring`), shiny04, shiny05. */
  shiny: 'Effect/Shiny01.OZJ',
  shiny2: 'Effect/Shiny02.OZJ',
  shiny3: 'Effect/Shiny03.OZJ',
  shiny4: 'Effect/shiny04.OZJ',
  shiny5: 'Effect/shiny05.OZJ',
  /** BITMAP_DAMAGE_01_MONO: LightningShock's ground scar. */
  damageMono: 'Effect/damage01mono.OZJ',
  /** BITMAP_DAMAGE2: Dark Side's hit burst. */
  damage2: 'Effect/Damage2.OZJ',
  /** BITMAP_TWLIGHT (Skill/twlighthik01.jpg): Recover's halo. */
  twilight: 'Skill/twlighthik01.OZJ',
  /** BITMAP_ORORA (hikorora.jpg). */
  orora: 'Effect/hikorora.OZJ',
  /** BITMAP_BLUR+10 / sword trails. */
  swordBlur: 'Effect/sword_blur.OZJ',
  swordEff: 'Effect/SwordEff.OZJ',
  swordEff2: 'Effect/SwordEffor2.OZJ',
  /** BITMAP_SWORD_EFFECT_MONO (Swordeff_mono.jpg): Strike of Destruction's flash at the caster. */
  swordEffMono: 'Effect/Swordeff_mono.OZJ',
  /**
   * The `CreateWeaponBlur` sheets by BlurMapping (ZzzOpenData.cpp:5047-5052):
   * BITMAP_BLUR (blur01, mapping 0), +1 (motion_blur, 1), +2 (motion_blur_r, 2),
   * +3 (motion_mono, 5), +6 (motion_blur_r3, 6); BITMAP_BLUR2 (blur02, 3).
   */
  blur: 'Effect/blur01.OZJ',
  blur2: 'Effect/blur02.OZJ',
  motionBlur: 'Effect/motion_blur.OZJ',
  motionBlurR: 'Effect/motion_blur_r.OZJ',
  motionBlurR3: 'Effect/motion_blur_r3.OZJ',
  motionMono: 'Effect/motion_mono.OZJ',
  /** Misc. */
  explosion: 'Effect/Explotion01.OZJ',
  /** BITMAP_EXPLOTION+1 (DinoE.jpg, four 64 px cells): CreateBomb2's fireball, Fire Breath's end. */
  dinoE: 'Effect/DinoE.OZJ',
  pierce: 'Effect/Piercing.OZJ',
  waves: 'Effect/waves.OZJ',
  water: 'Effect/water.OZJ',
  /** BITMAP_WATERFALL_3 / _5 (waterFall3/5.jpg): Strike of Destruction's spray. */
  waterFall3: 'Effect/waterFall3.OZJ',
  waterFall5: 'Effect/waterFall5.OZJ',
  wind: 'Effect/wind01.OZJ',
  groundWind: 'Effect/ground_wind.OZJ',
  forcePillar: 'Effect/force_Pillar.OZJ',
  ghost: 'Effect/ghosteffect01.OZJ',
  ghost2: 'Effect/Ghosteffect02.OZJ',
  /** BITMAP_FIRECRACKER (Fire04.jpg): Add Critical's weapon helices (FLARE_FORCE sub5-7). */
  fire4: 'Effect/Fire04.OZJ',
  /** BITMAP_2LINE_GHOST (Skill\2line_gost.jpg, the same image as this copy): Chaotic Diseier's and Expansion of Wizardry's ribbons. */
  twoLineGhost: 'Effect/2line_gost.OZJ',
  /** BITMAP_EXPLOTION_MONO (explotion01mono.jpg): the grey 4x4 explosion sheet. */
  explosionMono: 'Effect/explotion01mono.OZJ',
  eye: 'Effect/eye01.OZJ',
  hole: 'Effect/hole.OZJ',
  lines: 'Effect/lines.OZJ',
  lava: 'Effect/lava.OZJ',
  skull: 'Skill/Skull.OZJ',
  ice: 'Skill/ice.OZJ',
  snow: 'Effect/snowseff01.OZJ',
  bluering: 'Effect/bluering0001_R.OZJ',
  bluewave: 'Effect/bluewave0001_R.OZJ',
  redFlare: 'Effect/flareRed.OZJ',
  torch: 'Effect/Torchfire.OZJ',
  guildRing: 'Effect/guild_ring01.OZJ',
  pinLights: 'Effect/pin_lights.OZJ',
  /** BITMAP_DRAIN_LIFE_GHOST (gostmark01.jpg, 256x64): Drain Life's ghost streaks. */
  drainGhost: 'Effect/gostmark01.OZJ',
  /** BITMAP_LIGHTNING_MEGA1-3 (lighting_mega01-03.jpg, 128 px): Lightning Shock's crackle. */
  lightningMega1: 'Effect/lighting_mega01.OZJ',
  lightningMega2: 'Effect/lighting_mega02.OZJ',
  lightningMega3: 'Effect/lighting_mega03.OZJ',
  /** BITMAP_LIGHT_MARKS (lightmarks.jpg): the Berserker's body marks. */
  lightMarks: 'Effect/lightmarks.ozj',
  /** BITMAP_LUCKY_SEAL_EFFECT (partCharge1/bujuckline.jpg): the seal ribbons' sheet. */
  luckySeal: 'Effect/partCharge1/bujuckline.ozj',
  kwave: 'Effect/Kwave.OZJ',
  powerWave: 'Effect/PoundingBall.OZJ',
  /** BITMAP_LIGHT+2 (cra_04.jpg, 64 px): the Summoner curse hand flashes and the Blind body smoke. */
  cra04: 'Effect/cra_04.OZJ',
  /** BITMAP_FIRE_CURSEDLICH (firehik02.jpg, 64 px): the flames off the Sahamutt and its burn. */
  fireCursedLich: 'Effect/firehik02.OZJ',
  /** BITMAP_SUMMON_SAHAMUTT_EXPLOSION (loungexflow.jpg, 256 px, 4x4 cells of 64): the Sahamutt's blasts. */
  sahamuttBlast: 'Effect/loungexflow.OZJ',
  /** BITMAP_ADV_SMOKE (fi01.jpg, 128 px): the Neil burn's sparks. */
  advSmoke: 'Effect/fi01.OZJ',
} as const;

export type EffectTexture = (typeof TEX)[keyof typeof TEX];

/**
 * The fire family: a card drawn with one of these is a flame, and a flame is
 * light - it takes the map's `keyGain` like the torches do. Every other sheet
 * (a flare, a smoke roll, a spark) is authored art at its authored value.
 */
export const FIRE_TEXTURES: ReadonlySet<string> = new Set<string>([
  TEX.fire,
  TEX.fire2,
  TEX.fire3,
  TEX.fire5,
  TEX.flame,
  TEX.torch,
]);

// ---- models (Data/Skill/*.bmd → *.glb) -----------------------------------------

export const MODEL = {
  /** MODEL_FEATHER (darkwing_hetachi.bmd): the one feather the original sheds, a white one on an additive sheet. */
  feather: 'Skill/darkwing_hetachi.glb',
  fire: 'Skill/Fire01.glb',
  poison: 'Skill/Poison01.glb',
  ice: 'Skill/Ice01.glb',
  /** MODEL_ICE_SMALL (Ice02.bmd): the Ice hit's shards, the Ice Monster's death (×10). */
  ice2: 'Skill/Ice02.glb',
  magic: 'Skill/Magic01.glb',
  magic2: 'Skill/Magic02.glb',
  magicCircle: 'Skill/MagicCircle01.glb',
  circle: 'Skill/Circle01.glb',
  circle2: 'Skill/Circle02.glb',
  storm: 'Skill/Storm01.glb',
  inferno: 'Skill/Inferno01.glb',
  blast: 'Skill/Blast01.glb',
  ball: 'Skill/Ball01.glb',
  /** MODEL_BIG_STONE1/2 (BigStone01/02.bmd): the Stone Golem's death boulders, 8 of each. */
  bigStone: 'Skill/BigStone01.glb',
  bigStone2: 'Skill/BigStone02.glb',
  /** MODEL_STONE1/2 (Stone01/02.bmd): the small chips a stone skill / a breaking prop throws. */
  stone: 'Skill/Stone01.glb',
  stone2: 'Skill/Stone02.glb',
  /** MODEL_GATE / +1 (Object12): the masonry the Blood Castle gate bursts into. */
  gateChunk: 'Object12/Gate01.glb',
  gateChunk2: 'Object12/Gate02.glb',
  /** MODEL_STONE_COFFIN / +1 (Object12): the Statue of Saint's crystal. */
  crystal: 'Object12/StoneCoffin01.glb',
  crystal2: 'Object12/StoneCoffin02.glb',
  groundStone: 'Skill/GroundStone.glb',
  groundStone2: 'Skill/GroundStone2.glb',
  /** MODEL_MAYASTONE1..3 and MODEL_MAYASTONEFIRE: Maya's stone rain and its trail. */
  mayaStone: 'Skill/mayastone01.glb',
  mayaStone2: 'Skill/mayastone02.glb',
  mayaStone3: 'Skill/mayastone03.glb',
  mayaStoneFire: 'Skill/mayastonebluefire.glb',
  groundCrystal: 'Skill/GroundCrystal.glb',
  arrow: 'Skill/Arrow01.glb',
  arrowDouble: 'Skill/ArrowDouble01.glb',
  arrowBomb: 'Skill/ArrowBomb01.glb',
  arrowLaser: 'Skill/ArrowLaser01.glb',
  arrowNature: 'Skill/ArrowNature01.glb',
  arrowSaw: 'Skill/ArrowSaw01.glb',
  arrowThunder: 'Skill/ArrowThunder01.glb',
  arrowV: 'Skill/ArrowV01.glb',
  arrowWing: 'Skill/ArrowWing01.glb',
  arrowImpact: 'Skill/ArrowImpact.glb',
  arrowSteel: 'Skill/ArrowSteel01.glb',
  arrowSpark: 'Skill/Arrow_Spark.glb',
  laceArrow: 'Skill/LaceArrow.glb',
  /** MODEL_ARROW_RING (CW_Bow_Skill): the Albatross Bow's shot. */
  arrowRing: 'Skill/CW_Bow_Skill.glb',
  /** MODEL_ARROW_DARKSTINGER (sketbows_arrows): the Dark Stinger Bow's shot. */
  arrowDarkStinger: 'Skill/sketbows_arrows.glb',
  /** MODEL_ARROW_GAMBLE (gamble_arrows01): the Air Lyn Bow's shot. */
  arrowGamble: 'Skill/gamble_arrows01.glb',
  /** MODEL_ARROW_BEST_CROSSBOW (KCross): the Divine Crossbow of Archangel's bolt. */
  arrowBestCrossbow: 'Skill/kcross.glb',
  /** MODEL_ARROW_DRILL (Carow): the Great Reign Crossbow's bolt. */
  arrowDrill: 'Skill/Carow.glb',
  /** MODEL_BONE1 (the skull, 1) / MODEL_BONE2 (a bone, ×10): a skeleton's or Death Cow's shatter death. */
  bone: 'Skill/Bone01.glb',
  bone2: 'Skill/Bone02.glb',
  skull: 'Skill/skull.glb',
  /** MODEL_SKILL_FURY_STRIKE+1..8: the Rageful Blow / Earthshake ground companions. */
  earthQuake: 'Skill/EarthQuake01.glb',
  earthQuake2: 'Skill/EarthQuake02.glb',
  earthQuake3: 'Skill/EarthQuake03.glb',
  earthQuake4: 'Skill/EarthQuake04.glb',
  earthQuake5: 'Skill/EarthQuake05.glb',
  earthQuake6: 'Skill/EarthQuake06.glb',
  earthQuake7: 'Skill/EarthQuake07.glb',
  earthQuake8: 'Skill/EarthQuake08.glb',
  /** MODEL_SPEARSKILL: the spear-skill ribbon carrier (Impale's thrust, Soul Barrier's joints). */
  ridingSpear: 'Skill/RidingSpear01.glb',
  /** MODEL_SPEAR: the item spear Impale / DeathStab throw. */
  spear: 'Item/Spear01.glb',
  /** MODEL_WAVES (m_Waves) / MODEL_PIERCING2 (m_Piercing): Force / Force Wave. */
  waves: 'Skill/m_waves.glb',
  piercing2: 'Skill/m_Piercing.glb',
  /** MODEL_PIER_PART: Fire Burst's darts, Space Split's bolt. */
  pierPart: 'Skill/PierPart.glb',
  /** MODEL_ALICE_BUFFSKILL_EFFECT2 (elshildring2). */
  elShieldRing2: 'Effect/elshildring2.glb',
  /** MODEL_KNIGHT_PLANCRACK_A: Lightning Shock's ground cracks. */
  knightPlanCrack: 'Effect/knight_plancrack_a.glb',
  /** MODEL_KNIGHT_PLANCRACK_B: Strike of Destruction's crack trail. */
  knightPlanCrack2: 'Effect/knight_plancrack_b.glb',
  /** MODEL_RAKLION_BOSS_CRACKEFFECT (knight_plancrack_grand): the big crack under a Strike of Destruction. */
  knightPlanCrackGrand: 'Effect/knight_plancrack_grand.glb',
  /** MODEL_NIGHTWATER_01: the standing splash of a Strike of Destruction. */
  nightwater: 'Effect/nightwater01.glb',
  waveForce: 'Skill/WaveForce.glb',
  swordForce: 'Skill/SwordForce.glb',
  piercing: 'Skill/Piercing.glb',
  javelin: 'Skill/Javelin.glb',
  saw: 'Skill/Saw01.glb',
  laser: 'Skill/Laser01.glb',
  darkLordSkill: 'Skill/DarkLordSkill.glb',
  /** MODEL_DESAIR (desair.bmd): the dark bird riding Chaotic Diseier's ribbons. */
  desair: 'Skill/desair.glb',
  darkSpirit: 'Skill/darkspirit.glb',
  darkScreamFire: 'Skill/darkfirescrem01.glb', // MODEL_DARK_SCREAM_FIRE
  darkScream: 'Skill/darkfirescrem02.glb', // MODEL_DARK_SCREAM
  protect: 'Skill/Protect01.glb',
  protect2: 'Skill/Protect02.glb',
  phoenixShield: 'Skill/PhoenixShield01.glb',
  phoenix: 'Skill/phoenix.glb',
  aurora: 'Skill/Aurora.glb',
  blizzard: 'Skill/blizzard.glb',
  snow: 'Skill/Snow01.glb',
  snow2: 'Skill/Snow02.glb',
  snow3: 'Skill/Snow03.glb',
  chainLightning: 'Skill/chain_lightning_ani.glb',
  flashing: 'Skill/flashing.glb',
  /** MODEL_TAIL (tail.bmd): Rageful Blow's falling streaks. */
  tail: 'Skill/tail.glb',
  combo: 'Skill/combo.glb',
  deathStab: 'Skill/deathsp_eff.glb',
  elfSkill: 'Skill/elf_skill.glb',
  manaRune: 'Skill/ManaRune.glb',
  ring: 'Skill/ring.glb',
  airforce: 'Skill/airforce.glb',
  boswind: 'Skill/boswind.glb',
  mayaTornado: 'Skill/mayatonedo.glb',
  hellgate: 'Skill/HellGate.glb',
  skeleton: 'Skill/Skeleton01.glb',
  dragonHead: 'Skill/dragonhead.glb',
  fenrirRed: 'Skill/fenril_red.glb',
  fenrirBlue: 'Skill/fenril_blue.glb',
  fenrirBlack: 'Skill/fenril_black.glb',
  fenrirGold: 'Skill/fenril_gold.glb',
  wallStone: 'Skill/wallstone1.glb',
  bossRock: 'Skill/bossrock.glb',
  unitedSoldier: 'Skill/unitedsoldier.glb',
  nightmareSummon: 'Skill/nightmaresum.glb',
  summonLagul: 'Skill/summon_lagul.glb',
  summonNeil: 'Skill/summon_neil.glb',
  summonSahamutt: 'Skill/summon_sahamutt.glb',
  kcross: 'Skill/kcross.glb',
  flameStrike: 'Effect/FlameStrike.glb',
  lightningType: 'Effect/lightning_type01.glb',
  multishot: 'Effect/multishot01.glb',
  multishot2: 'Effect/multishot02.glb',
  multishot3: 'Effect/multishot03.glb',
  shockwave: 'Effect/shockwave01.glb',
  shockwaveGround: 'Effect/shockwave_ground01.glb',
  shockwaveSpin: 'Effect/shockwave_spin01.glb',
  windSpin: 'Effect/wind_spin02.glb',
  windForce: 'Effect/wind_foce.glb',
  bladeTornado: 'Effect/bladetonedo.glb',
  phoenixShot: 'Effect/phoenix_shot_effect.glb',
  superPower: 'Effect/superpower.glb',
  wolfHead: 'Effect/wolf_head_effect.glb',
  dragonKick: 'Effect/dragon_kick_dummy.glb',
  magicPowerUp: 'Effect/magic_powerup.glb',
  ringRoute: 'Effect/ringtyperout.glb',
  clinderLight: 'Effect/clinderlight.glb',
  atShield: 'Effect/atshild.glb',
  elShieldRing: 'Effect/elshildring.glb',
  shieldUp: 'Effect/shield_up.glb',
  /** MODEL_ARROWSRE06 (arrowsre06.bmd): the rune Swell of Magic Power stamps on the hands every six seconds. */
  arrowsRe06: 'Effect/arrowsre06.glb',
  volcanoStone: 'Effect/volcano_stone.glb',
  changeUp: 'Effect/Change_Up_Eff.glb',
  iceStone: 'Effect/ice_stone00.glb',
  /** MODEL_SUMMONER_CASTING_EFFECT2 / 22 / 222: Weakness and Innovation's turning circles. */
  suhwanzin2: 'Effect/Suhwanzin2.glb',
  suhwanzin22: 'Effect/Suhwanzin22.glb',
  suhwanzin222: 'Effect/Suhwanzin222.glb',
  /** MODEL_SUMMONER_CASTING_EFFECT1 / 11 / 111 / 4: the rest of the summon casting circle. */
  suhwanzin1: 'Effect/Suhwanzin1.glb',
  suhwanzin11: 'Effect/Suhwanzin11.glb',
  suhwanzin111: 'Effect/Suhwanzin111.glb',
  suhwanzin4: 'Effect/Suhwanzin4.glb',
  /** MODEL_SUMMONER_SUMMON_NEIL_NIFE1..3 / NEIL_GROUND1..3: Requiem's knives and ground rings. */
  neilKnife1: 'Skill/nelleff_nife01.glb',
  neilKnife2: 'Skill/nelleff_nife02.glb',
  neilKnife3: 'Skill/nelleff_nife03.glb',
  neilGround1: 'Skill/nell_nifegrund01.glb',
  neilGround2: 'Skill/nell_nifegrund02.glb',
  neilGround3: 'Skill/nell_nifegrund03.glb',
} as const;

export type EffectModel = (typeof MODEL)[keyof typeof MODEL];

// ---- palette (linear RGB, the original's `Light[3]` per effect) ---------------

export const RGBS = {
  white: [1, 1, 1] as RGB,
  fire: [1, 0.55, 0.2] as RGB,
  ember: [1, 0.35, 0.1] as RGB,
  gold: [1, 0.85, 0.4] as RGB,
  ice: [0.55, 0.75, 1] as RGB,
  frost: [0.8, 0.9, 1] as RGB,
  venom: [0.35, 0.9, 0.3] as RGB,
  decay: [0.5, 0.7, 0.2] as RGB,
  arc: [0.75, 0.85, 1] as RGB,
  spark: [0.9, 0.95, 1] as RGB,
  energy: [0.8, 0.85, 1] as RGB,
  tide: [0.3, 0.6, 1] as RGB,
  holy: [1, 0.95, 0.7] as RGB,
  shade: [0.6, 0.3, 0.9] as RGB,
  blood: [0.9, 0.15, 0.1] as RGB,
  /**
   * Physical blood, as against the `blood` above - the glowing red the bleed
   * *skills* tint their rings and ribbons with. Only ever a modulator on the
   * blood sheets, which carry the red themselves; it pulls them a shade
   * darker so a fleck reads as fluid rather than as an ember.
   */
  gore: [0.85, 0.3, 0.25] as RGB,
  steel: [0.85, 0.85, 0.95] as RGB,
  wind: [0.7, 0.9, 0.8] as RGB,
  dark: [0.35, 0.2, 0.5] as RGB,
  soul: [0.4, 0.6, 1] as RGB,
} as const;

// ---- sheet cells -------------------------------------------------------------

/**
 * BITMAP_EXPLOTION (Explotion01, 256×256): a 4×4 sheet of 64 px cells of which
 * the first 10 are frames (`Frame = (20 − LifeTime) / 2` over its 20-tick
 * life, ZzzEffectParticle.cpp); the last six cells are solid white filler.
 */
export const EXPLOSION_CELLS: SheetCells = { w: 64, h: 64, count: 10 };

/** `BITMAP_FENRIR_FOOT_THUNDER1 + (m_iAnimation % 5)`, in order. */
export const FOOT_THUNDER_FRAMES = [
  TEX.footThunder1,
  TEX.footThunder2,
  TEX.footThunder3,
  TEX.footThunder4,
  TEX.footThunder5,
] as const;

// ---- particle recipes --------------------------------------------------------

/** BITMAP_FLARE sparks thrown from an impact, rising and dying in half a second. */
export const SPARKS: ParticleRecipe = {
  texture: TEX.flare,
  colour: RGBS.spark,
  size: 0.2,
  life: 0.5,
  power: 2.5,
  gravity: -2,
  box: [0.1, 0.1, 0.1],
};

/** Fire chips: BITMAP_SPARK, hot and short. */
export const FIRE_SPARKS: ParticleRecipe = {
  texture: TEX.spark,
  colour: RGBS.fire,
  colourEnd: RGBS.ember,
  size: 0.16,
  life: 0.45,
  power: 3,
  gravity: -3,
  spin: 4,
};

/** BITMAP_FIRE puffs that drift up - a small blaze, the fire left on a hit. */
export const FIRE_PUFF: ParticleRecipe = {
  texture: TEX.fire,
  cells: { w: 64, h: 64, count: 4 },
  colour: RGBS.fire,
  colourEnd: RGBS.ember,
  size: 0.55,
  life: 0.6,
  power: 0.4,
  gravity: 1.2,
  dir1: [-0.3, 0.6, -0.3],
  dir2: [0.3, 1, 0.3],
  endScale: 1.6,
};

/**
 * BITMAP_FIRE sub5 / sub8: what a flying MODEL_FIRE leaves behind it. This one
 * must not climb - the original lifts a trail puff 12 cm over its whole life
 * (`Gravity += 0.004`, `Position[2] += Gravity × 10` for 24 ticks,
 * ZzzEffectParticle.cpp:4574) and shrinks it to a third, so the puffs stay on
 * the path and read as a streak pointing back at where the ball came from.
 */
export const FIRE_TRAIL: ParticleRecipe = {
  texture: TEX.fire,
  cells: { w: 64, h: 64, count: 4 },
  colour: RGBS.fire,
  colourEnd: RGBS.ember,
  size: 0.5,
  life: 0.95,
  power: 0.12,
  gravity: 0.12,
  box: [0.1, 0.1, 0.1],
  spin: 2.2,
  endScale: 0.35,
};

/**
 * BITMAP_FIRE sub5 as MODEL_FIRE sub0/sub1 leaves it every tick (ZzzEffect.cpp:7954; ZzzEffectParticle.cpp:407-419,
 * :4555-4563): LT 24, 64 px x 1.28-1.91, shrinking 0.04 a tick, rising 12 cm, turning 5 deg a tick, and
 * kept at its creation Light `(Lum, 0.1 Lum, 0)` until it dies. Deep red, not FIRE_TRAIL's orange.
 */
export const FIRE_BALL_TRAIL: ParticleRecipe = {
  texture: TEX.fire,
  cells: { w: 64, h: 64, count: 4 },
  colour: [1, 0.1, 0],
  size: 1.02,
  sizeJitter: 0.2,
  life: 0.96,
  lifeJitter: 0,
  power: 0,
  powerJitter: 0,
  gravity: 0.26,
  box: [0.02, 0.02, 0.02],
  spin: 2.2,
  endScale: 0.4,
  fade: [
    [0, 1],
    [1, 1],
  ],
};

/**
 * A smoke roll behind a stone or under a flame. Additive like the original:
 * RenderParticles forces EnableAlphaBlend for every JPEG (Components == 3)
 * sheet (ZzzEffectParticle.cpp:8919), and smoke01 has no alpha channel -
 * alpha-blending it drew each particle as an opaque black square.
 */
export const SMOKE: ParticleRecipe = {
  texture: TEX.smoke,
  colour: [0.25, 0.22, 0.2],
  colourEnd: [0.1, 0.1, 0.1],
  size: 0.6,
  life: 1.2,
  power: 0.5,
  gravity: 0.6,
  dir1: [-0.3, 0.5, -0.3],
  dir2: [0.3, 1, 0.3],
  endScale: 2.2,
  spin: 0.8,
  blend: 'add',
};

/** Ice shards / snow motes: BITMAP_FLARE tinted, slow, falling. */
export const ICE_MOTES: ParticleRecipe = {
  texture: TEX.flare,
  colour: RGBS.ice,
  colourEnd: RGBS.frost,
  size: 0.18,
  life: 0.9,
  power: 1.2,
  gravity: -1.5,
  spin: 2,
};

/** The Ice Storm's snow: BITMAP_FLARE small, many, drifting down. */
export const SNOWFALL: ParticleRecipe = {
  texture: TEX.flare,
  colour: RGBS.frost,
  size: 0.12,
  life: 1.4,
  power: 0.3,
  gravity: -2.5,
  box: [1.5, 0.2, 1.5],
  dir1: [-0.2, -1, -0.2],
  dir2: [0.2, -0.5, 0.2],
  capacity: 512,
};

/** Poison bubbles: green flare motes wobbling up. */
export const VENOM_MOTES: ParticleRecipe = {
  texture: TEX.flare,
  colour: RGBS.venom,
  colourEnd: RGBS.decay,
  size: 0.22,
  life: 0.8,
  power: 0.6,
  gravity: 0.8,
  dir1: [-0.4, 0.3, -0.4],
  dir2: [0.4, 1, 0.4],
  endScale: 1.5,
};

/** Energy / lightning motes: pale blue flares snapping outward. */
export const ARC_MOTES: ParticleRecipe = {
  texture: TEX.flare,
  colour: RGBS.arc,
  size: 0.16,
  life: 0.35,
  power: 3,
  gravity: -1,
  spin: 6,
};

/** Water drops for the tide skills. */
export const TIDE_DROPS: ParticleRecipe = {
  texture: TEX.flare,
  colour: RGBS.tide,
  colourEnd: RGBS.frost,
  size: 0.15,
  life: 0.7,
  power: 2.2,
  gravity: -4,
  dir1: [-1, 0.6, -1],
  dir2: [1, 1, 1],
};

/** Holy motes: the elf buffs' warm sparkles drifting up around the body. */
export const HOLY_MOTES: ParticleRecipe = {
  texture: TEX.shiny,
  colour: RGBS.holy,
  size: 0.18,
  life: 1.2,
  power: 0.4,
  gravity: 0.5,
  box: [0.35, 0.4, 0.35],
  dir1: [-0.1, 0.5, -0.1],
  dir2: [0.1, 1, 0.1],
  spin: 1,
};

/** Violet shade for curses and summoner skills. */
export const SHADE_MOTES: ParticleRecipe = {
  texture: TEX.flare,
  colour: RGBS.shade,
  colourEnd: RGBS.dark,
  size: 0.25,
  life: 0.9,
  power: 0.8,
  gravity: 0.4,
  endScale: 1.8,
  spin: 1.5,
};

/**
 * Blood flecks thrown off a struck body - a blow's, and the knight's bleed
 * skills'.
 *
 * **Alpha, never additive.** Additive light can only brighten what is behind
 * it, so a red-tinted `flare` over a bright ground - Devias snow, Tarkan sand
 * - adds into all three channels at once, clips to white, and the bloom in
 * `scenes/sceneLook.ts` then spreads that clipped white into a pink haze:
 * blood came out looking like steam. The blood sheet drawn straight-alpha
 * *darkens* the ground the way fluid does, and its deep red sits well under
 * every mood's bloom threshold (0.66 at the lowest), so the pipeline leaves
 * it alone instead of blowing it out.
 */
export const BLOOD_CHIPS: ParticleRecipe = {
  texture: TEX.blood,
  colour: RGBS.gore,
  size: 0.14,
  life: 0.5,
  power: 2.5,
  gravity: -5,
  dir1: [-1, 0.4, -1],
  dir2: [1, 1, 1],
  blend: 'alpha',
};

/**
 * The wider spray behind the flecks: a few soft spatter cards that grow and
 * fade over a third of a second. This is what stands in for the white-cored
 * `flash(TEX.flare, RGBS.blood)` a blood hit used to draw on top of its
 * chips - the single brightest thing in the effect, and the one that read as
 * a pale pink cloud rather than as blood.
 */
export const BLOOD_MIST: ParticleRecipe = {
  texture: TEX.blood,
  colour: RGBS.gore,
  size: 0.3,
  sizeJitter: 0.4,
  life: 0.3,
  lifeJitter: 0.4,
  power: 1.2,
  gravity: -3,
  dir1: [-1, 0, -1],
  dir2: [1, 0.8, 1],
  endScale: 2,
  spin: 5,
  blend: 'alpha',
};

/** Steel glints thrown off a blade. */
export const STEEL_GLINTS: ParticleRecipe = {
  texture: TEX.spark3,
  colour: RGBS.steel,
  size: 0.12,
  life: 0.35,
  power: 3.5,
  gravity: -3,
  spin: 8,
};

/** Dust kicked up by an earth skill. Additive - same smoke01 rule as SMOKE. */
export const DUST: ParticleRecipe = {
  texture: TEX.smoke,
  colour: [0.5, 0.42, 0.3],
  colourEnd: [0.3, 0.26, 0.2],
  size: 0.7,
  life: 1.0,
  power: 1.5,
  gravity: -0.5,
  dir1: [-1, 0.3, -1],
  dir2: [1, 0.8, 1],
  endScale: 2.5,
  blend: 'add',
};

/** Wind streaks for cyclone/twister skills. */
export const WIND_STREAKS: ParticleRecipe = {
  texture: TEX.lines,
  colour: RGBS.wind,
  size: 0.5,
  life: 0.6,
  power: 2,
  gravity: 1,
  dir1: [-1, 0.2, -1],
  dir2: [1, 0.8, 1],
  spin: 5,
  endScale: 0.4,
};

/**
 * BITMAP_SMOKE sub1, the Poison hit's cloud (ZzzEffectParticle.cpp:1274-1283 init, :5360-5365 move):
 * LT 50, Scale 0.80-1.11 of the 64 px sheet, upright, thrown 40-47 cm a tick and slowed x0.4 a tick
 * (about 0.7 m out in 3 ticks), Scale +0.05 a tick. The move overwrites the creation Light with
 * `LT/50 x (0.5, 1, 0.8)`, so the (0.4, 0.6, 1) passed at creation never shows.
 */
export const POISON_SMOKE: ParticleRecipe = {
  texture: TEX.smoke,
  colour: [0.5, 1, 0.8],
  size: 0.61,
  sizeJitter: 0.16,
  life: 2,
  lifeJitter: 0,
  box: [0.32, 0.32, 0.32],
  dir1: [-1, -0.7, -1],
  dir2: [1, 0.7, 1],
  power: 10,
  powerJitter: 0.15,
  settle: 0.07,
  gravity: 0,
  endScale: 3.6,
  spin: 0,
  upright: true,
  fade: [
    [0, 1],
    [1, 0],
  ],
  blend: 'add',
};

/** BITMAP_LIGHT motes in Nova's charge blue (0.3, 0.3, 1.0), gathering on the body. */
export const NOVA_MOTES: ParticleRecipe = {
  texture: TEX.flare,
  colour: [0.3, 0.3, 1],
  size: 0.35,
  life: 0.5,
  power: 0.4,
  gravity: 0.5,
  box: [0.3, 0.6, 0.3],
  endScale: 0.3,
};

/** BITMAP_ENERGY (Thunder01) chips: the Lightning cast's hand crackle, Energy Ball's trail. */
export const ENERGY_CHIPS: ParticleRecipe = {
  texture: TEX.thunder,
  colour: RGBS.arc,
  size: 0.3,
  life: 0.3,
  power: 1.5,
  gravity: 0,
  spin: 6,
};

/** BITMAP_FLAME tongues thrown from the Flame column, 6 a tick in a ±25 cm box. */
export const FLAME_TONGUES: ParticleRecipe = {
  texture: TEX.flame,
  colour: RGBS.fire,
  colourEnd: RGBS.ember,
  size: 0.9,
  sizeJitter: 0.2,
  life: 0.8,
  box: [0.25, 0.05, 0.25],
  dir1: [-0.1, 1, -0.1],
  dir2: [0.1, 1, 0.1],
  power: 2,
  gravity: 0,
  endScale: 1.3,
  capacity: 256,
};

/**
 * The Nova death's glow: `CreateParticle(BITMAP_LIGHT, bone, …, 5, 0.5 + rand()%100/50)`
 * ten a tick from random bones for the first 30 ticks (ZzzCharacter.cpp:3184-3193),
 * Light (0.3, 0.3, 1).
 */
export const NOVA_DEATH_MOTES: ParticleRecipe = {
  texture: TEX.flare,
  colour: [0.3, 0.3, 1],
  size: 0.45,
  sizeJitter: 0.3,
  life: 0.5,
  power: 0.3,
  gravity: 0.4,
  endScale: 0.4,
  capacity: 512,
};

/**
 * `CreateBomb(pos, true)` (ZzzEffect.cpp:6394): 20 BITMAP_SPARK chips thrown
 * up in a 60-120° fan and one grey BITMAP_EXPLOTION card - the Chaos Castle
 * corpse pops.
 */
export const BOMB_SPARKS: ParticleRecipe = {
  texture: TEX.spark2,
  colour: RGBS.white,
  size: 0.18,
  life: 0.5,
  power: 3.5,
  gravity: -6,
  dir1: [-0.6, 0.5, -0.6],
  dir2: [0.6, 1, 0.6],
  spin: 6,
};

/** Soul motes: blue-white for Soul Barrier and mana skills. */
export const SOUL_MOTES: ParticleRecipe = {
  texture: TEX.flareBlue,
  colour: RGBS.soul,
  size: 0.2,
  life: 1.0,
  power: 0.3,
  gravity: 0.6,
  box: [0.35, 0.5, 0.35],
  spin: 1,
};

/**
 * `BITMAP_SMOKE + 1` (smoke02.tga, 64 px, alpha `EnableAlphaBlend3`) SubType
 * 0 - the sand a walking Tarkan monster kicks up (`MonsterMoveSandSmoke`,
 * ZzzCharacter.cpp:5456; init ZzzEffectParticle.cpp:1661, move :7052): LT 32
 * ticks, Scale 0.32–0.64 (card 20–41 cm), ±8 cm jitter, `Light` fading
 * LifeTime/32 linearly to black under the texture's own alpha, Scale +0.08 a tick
 * (×6.3 at the mean by death), the card re-pinned every tick to the terrain
 * at half its own height. The pin is the 0.6 tile/s climb here: the centre
 * rises as fast as the card swells, so the bottom edge stays on the ground.
 * Not ported: the 3 cm/tick drift along the monster's facing, decaying ×0.9
 * a tick (30 cm in all) - a shared system has one direction for every
 * emitter.
 */
export const SAND_SMOKE: ParticleRecipe = {
  texture: TEX.smokeAlpha,
  colour: RGBS.white,
  // core.ts lerps colour over the first 60 % of life, then fades alpha: 0.4
  // grey there is the original's Light at the same age.
  colourEnd: [0.4, 0.4, 0.4],
  size: 0.307,
  sizeJitter: 0.333,
  life: 1.28,
  lifeJitter: 0,
  box: [0.08, 0, 0.08],
  dir1: [0, 1, 0],
  dir2: [0, 1, 0],
  power: 0.6,
  powerJitter: 0,
  gravity: 0,
  endScale: 6.3,
  blend: 'alpha',
  capacity: 256,
};

/**
 * `BITMAP_SPARK` SubType 0 (Spark02) - the chips a landed blow throws
 * (ZzzEffectParticle.cpp:2012 init, :6554 move): Scale `(rand()%4+4)*0.1` =
 * 0.4–0.7, LT 24–39 ticks, thrown 2–4 cm/tick sideways and 6–22 cm/tick up,
 * gravity −2 cm/tick², brightness LifeTime/16 (full until the last 16
 * ticks). `RenderParticles` draws `pBitmap->Width * o->Scale` and Spark02 is
 * **4 px** - a chip is a 1.6–2.8 cm card (0.016–0.028 tiles), a hot grain,
 * not a flame card. Babylon's direction is not normalised, so the two
 * corners *are* the velocity range in tiles/s at power 1.
 */
export const HIT_SPARKS: ParticleRecipe = {
  texture: TEX.spark2,
  colour: RGBS.white,
  size: 0.022,
  sizeJitter: 0.27,
  life: 1.26,
  lifeJitter: 0.24,
  box: [0.05, 0.05, 0.05],
  dir1: [-1, 1.5, -1],
  dir2: [1, 5.5, 1],
  power: 1,
  powerJitter: 0,
  gravity: -12.5,
  spin: 3,
  capacity: 256,
};

/**
 * `BITMAP_SHINY` (Shiny01), SubType 0 and 1, from `CreateShiny`
 * (ZzzObject.cpp:6223): LT 18 ticks, tilted 45°, no motion - a star that
 * appears, holds and is gone. Two per burst, every 48th tick.
 */
export const SHINY_GLINT: ParticleRecipe = {
  texture: TEX.shiny,
  colour: RGBS.white,
  // `pBitmap->Width * o->Scale`: Shiny01 is 16 px and CreateShiny passes scale 1 → a 16 cm card.
  size: 0.16,
  sizeJitter: 0.1,
  life: 0.72,
  lifeJitter: 0,
  box: [0.02, 0.02, 0.02],
  dir1: [0, 0, 0],
  dir2: [0, 0, 0],
  power: 0,
  powerJitter: 0,
  gravity: 0,
  spin: 1.5,
  endScale: 0.6,
  capacity: 64,
};

// ---- monster body effects (effects/monsterVisuals.ts) --------------------------

/**
 * `BITMAP_SMOKE` SubType 0 (smoke01.jpg, additive) as a monster breathes or
 * snorts it (ZzzEffectParticle.cpp:1147 init, :5273 move): LT 16 ticks,
 * Scale 0.48-0.80 of the 64 px sheet (31-51 cm), `Light = LT/8` so full for
 * the first half then to black, `Gravity += 0.2` cm/tick² upward from rest,
 * Scale +0.05 a tick (x2.25 by death), a random spin. Same smoke01 additive
 * rule as SMOKE: the JPEG has no alpha, so it is light, not matter. The tint
 * is the original's `Light` (1, 1, 1) at its brightest: the sheet's own grey
 * is all the darkness the puff has.
 */
export const BODY_SMOKE: ParticleRecipe = {
  texture: TEX.smoke,
  colour: [0.85, 0.82, 0.78],
  colourEnd: [0.15, 0.15, 0.15],
  size: 0.41,
  sizeJitter: 0.25,
  life: 0.64,
  lifeJitter: 0,
  box: [0.02, 0, 0.02],
  dir1: [0, 1, 0],
  dir2: [0, 1, 0],
  power: 0,
  powerJitter: 0,
  gravity: 1.25,
  endScale: 2.25,
  spin: 1,
  blend: 'add',
  capacity: 256,
};

/**
 * BITMAP_SMOKE sub0 as MODEL_ICE and its shards leave it (ZzzEffect.cpp:7644-7651, MoveHandlers.cpp:3978):
 * BODY_SMOKE with the original's fixed rotation and `Light = LT/8`, full for 8 ticks, then to black.
 */
export const ICE_SHARD_SMOKE: ParticleRecipe = {
  ...BODY_SMOKE,
  colour: [1, 1, 1],
  colourEnd: [1, 1, 1],
  spin: 0,
  fade: [
    [0, 1],
    [0.5, 1],
    [1, 0],
  ],
};

/** The crystal's puffs: +-32 cm across, 32-159 cm up (ZzzEffect.cpp:7645-7648), about a 0.96 tile centre. */
export const ICE_SMOKE: ParticleRecipe = {
  ...ICE_SHARD_SMOKE,
  box: [0.32, 0.635, 0.32],
};

/**
 * BITMAP_SMOKE sub3, 4 a tick off MODEL_MAGIC2 (ZzzEffectParticle.cpp:1250-1255, :5330-5334): rotation 0,
 * thrown 40-47 cm a tick along a random yaw pitched +-45 deg with `Velocity *= 0.4` (about 0.7 m out),
 * Scale +0.1 a tick, `Light = LT/8 x (0.8, 0.8, 1)` over its 9 drawn ticks.
 */
export const POWER_WAVE_SMOKE: ParticleRecipe = {
  texture: TEX.smoke,
  colour: [0.8, 0.8, 1],
  size: 0.675,
  sizeJitter: 0.14,
  life: 0.36,
  lifeJitter: 0,
  box: [0, 0, 0],
  dir1: [-1, -0.7, -1],
  dir2: [1, 0.7, 1],
  power: 10.9,
  powerJitter: 0.15,
  settle: 0.37,
  gravity: 0,
  endScale: 1.76,
  spin: 0,
  upright: true,
  fade: [
    [0, 1],
    [0.11, 1],
    [1, 0],
  ],
  blend: 'add',
  capacity: 512,
  realSeconds: true,
};

/**
 * The BITMAP_ENERGY particle a tick at the ball (ZzzEffect.cpp:6879; ZzzEffectParticle.cpp:723-726):
 * Thunder01 x 0.6-1.3, random rotation turning 20 deg a tick, LT 2, so drawn for one tick at saturated light.
 */
export const ENERGY_BALL_CORE: ParticleRecipe = {
  texture: TEX.thunder,
  colour: [1, 1, 1],
  size: 0.61,
  sizeJitter: 0.37,
  life: 0.04,
  lifeJitter: 0,
  box: [0, 0, 0],
  power: 0,
  powerJitter: 0,
  gravity: 0,
  spin: 8.7,
  fade: [
    [0, 1],
    [1, 1],
  ],
  blend: 'add',
  capacity: 64,
  realSeconds: true,
};

/** The BITMAP_SPARK+1 sub0 a tick at the ball: Spark03 at Scale 4, down to 3.5 by its one drawn tick (ZzzEffectParticle.cpp:6613-6616). */
export const ENERGY_BALL_STAR: ParticleRecipe = {
  ...ENERGY_BALL_CORE,
  texture: TEX.spark3,
  size: 1.12,
  sizeJitter: 0,
  spin: 0,
  upright: true,
};

/** CheckTargetRange's BITMAP_SPARK+1 sub1 (ZzzEffect.cpp:283-285): Scale 6, down to 4 by its one drawn tick, white. */
export const ENERGY_BALL_POP: ParticleRecipe = {
  ...ENERGY_BALL_STAR,
  size: 1.28,
};

/**
 * BITMAP_POUNDING_BALL sub1 off a Lance star (ZzzEffectParticle.cpp:3262-3269): PoundingBall x 1.28-2.55, a
 * fixed random rotation, Light 0.5 held for its 14 drawn ticks, drifting 3-5 cm a tick. Its move branch is
 * dead code (`SubType == 0 && SubType == 1`, :8163), so it neither shrinks nor fades.
 */
export const LANCE_PUFF: ParticleRecipe = {
  texture: TEX.powerWave,
  colour: [0.5, 0.5, 0.5],
  size: 1.23,
  sizeJitter: 0.33,
  life: 0.56,
  lifeJitter: 0,
  box: [0, 0, 0],
  dir1: [-1, 0, -1],
  dir2: [1, 0, 1],
  power: 1.2,
  powerJitter: 0.3,
  gravity: 0,
  spin: 0,
  fade: [
    [0, 1],
    [1, 1],
  ],
  blend: 'add',
  capacity: 256,
  realSeconds: true,
};

// ---- dw1 improved looks (Enhanced and Ultra) -----------------------------------

/** Hot chips a flying MODEL_FIRE sheds on the graded tiers: small, orange going red, falling away from the path. */
export const FIRE_BALL_EMBERS: ParticleRecipe = {
  texture: TEX.spark2,
  colour: [1, 0.55, 0.15],
  colourEnd: [0.7, 0.12, 0],
  size: 0.09,
  sizeJitter: 0.4,
  life: 0.55,
  lifeJitter: 0.3,
  box: [0.12, 0.12, 0.12],
  dir1: [-1, -0.2, -1],
  dir2: [1, 0.8, 1],
  power: 0.9,
  gravity: -2.5,
  spin: 4,
  capacity: 256,
};

/** The meteor's blast on the graded tiers: BITMAP_FIRE rolled out flat from the landing and rising as it burns off. */
export const METEOR_BLAST: ParticleRecipe = {
  texture: TEX.fire,
  cells: { w: 64, h: 64, count: 4 },
  colour: [1, 0.5, 0.15],
  colourEnd: [0.6, 0.08, 0],
  size: 0.7,
  sizeJitter: 0.3,
  life: 0.55,
  lifeJitter: 0.3,
  box: [0.15, 0.05, 0.15],
  dir1: [-1, 0.1, -1],
  dir2: [1, 0.45, 1],
  power: 2.6,
  settle: 0.5,
  gravity: 0.8,
  spin: 2,
  endScale: 1.8,
};

/** Dust and smoke the landing throws up: straight-alpha matter, so it darkens what it covers and never blooms. */
export const METEOR_DUST: ParticleRecipe = {
  texture: TEX.smokeAlpha,
  colour: [0.26, 0.23, 0.2],
  size: 0.8,
  sizeJitter: 0.3,
  life: 1.5,
  lifeJitter: 0.25,
  box: [0.35, 0.05, 0.35],
  dir1: [-0.5, 0.4, -0.5],
  dir2: [0.5, 1, 0.5],
  power: 0.9,
  settle: 0.4,
  gravity: 0.35,
  spin: 0.6,
  endScale: 2.6,
  fade: [
    [0, 0],
    [0.15, 0.7],
    [1, 0],
  ],
  blend: 'alpha',
};

/** Poison's low venom haze on the graded tiers: smoke01 in the cloud's green, hugging the ground and spreading. */
export const POISON_MIST: ParticleRecipe = {
  texture: TEX.smoke,
  colour: [0.18, 0.5, 0.32],
  size: 0.9,
  sizeJitter: 0.25,
  life: 1.5,
  lifeJitter: 0.2,
  box: [0.35, 0.05, 0.35],
  dir1: [-1, 0.05, -1],
  dir2: [1, 0.2, 1],
  power: 0.7,
  settle: 0.5,
  gravity: 0.05,
  spin: 0.4,
  endScale: 2.4,
  fade: [
    [0, 0],
    [0.2, 1],
    [1, 0],
  ],
  blend: 'add',
};

/** Poison's bubbles: small green flares rising through the cloud and popping. */
export const POISON_BUBBLES: ParticleRecipe = {
  texture: TEX.flare,
  colour: [0.4, 1, 0.55],
  colourEnd: [0.2, 0.6, 0.3],
  size: 0.18,
  sizeJitter: 0.4,
  life: 1,
  lifeJitter: 0.4,
  box: [0.45, 0.3, 0.45],
  dir1: [-0.15, 0.6, -0.15],
  dir2: [0.15, 1, 0.15],
  power: 0.5,
  gravity: 0.3,
  endScale: 1.4,
};

/** Frost glints on and around the Ice crystal: tiny cold flares that twinkle out. */
export const FROST_GLINTS: ParticleRecipe = {
  texture: TEX.shiny,
  colour: [0.75, 0.9, 1],
  size: 0.2,
  sizeJitter: 0.4,
  life: 0.6,
  lifeJitter: 0.4,
  box: [0.4, 0.55, 0.4],
  power: 0.15,
  gravity: -0.3,
  spin: 3,
  fade: [
    [0, 0],
    [0.3, 1],
    [1, 0],
  ],
};

/** The cold breath rolling off the crystal's base: smoke01 in ice blue, pushed out along the ground. */
export const ICE_MIST: ParticleRecipe = {
  texture: TEX.smoke,
  colour: [0.22, 0.4, 0.68],
  size: 0.7,
  sizeJitter: 0.3,
  life: 1.1,
  lifeJitter: 0.2,
  box: [0.25, 0.04, 0.25],
  dir1: [-1, 0, -1],
  dir2: [1, 0.15, 1],
  power: 1.4,
  settle: 0.35,
  gravity: 0.05,
  spin: 0.5,
  endScale: 2.4,
  fade: [
    [0, 0],
    [0.15, 1],
    [1, 0],
  ],
  blend: 'add',
};

/** Power Wave's wake on the graded tiers: cold glints thrown off the sheet's front, rising and twinkling out behind it. */
export const POWER_WAVE_GLINTS: ParticleRecipe = {
  texture: TEX.shiny,
  colour: [0.7, 0.85, 1],
  colourEnd: [0.3, 0.5, 1],
  size: 0.16,
  sizeJitter: 0.45,
  life: 0.45,
  lifeJitter: 0.35,
  box: [0.45, 0.35, 0.45],
  dir1: [-0.4, 0.4, -0.4],
  dir2: [0.4, 1, 0.4],
  power: 0.8,
  powerJitter: 0.4,
  gravity: 0.4,
  spin: 3,
  fade: [
    [0, 0],
    [0.2, 1],
    [1, 0],
  ],
  capacity: 256,
  realSeconds: true,
};

/** Power Wave's ground skim: a low blue haze dragged along under the sheet, the wave's contact with the ground. */
export const POWER_WAVE_SKIM: ParticleRecipe = {
  texture: TEX.smoke,
  colour: [0.2, 0.35, 0.7],
  size: 0.8,
  sizeJitter: 0.25,
  life: 0.5,
  lifeJitter: 0.2,
  box: [0.35, 0.03, 0.35],
  dir1: [-1, 0, -1],
  dir2: [1, 0.1, 1],
  power: 0.8,
  settle: 0.4,
  gravity: 0,
  spin: 0.5,
  endScale: 1.8,
  fade: [
    [0, 0],
    [0.2, 1],
    [1, 0],
  ],
  blend: 'add',
  capacity: 128,
  realSeconds: true,
};

/** The Energy Ball's halo on the graded tiers: a blue flare under each tick's cards, drawn one tick with them. */
export const ENERGY_BALL_GLOW: ParticleRecipe = {
  ...ENERGY_BALL_CORE,
  texture: TEX.flare,
  colour: [0.15, 0.35, 0.8],
  size: 1.4,
  sizeJitter: 0,
  // A shade under the tick and dimming, so the last tick's halo is gone or faint when the next one is laid.
  life: 0.032,
  spin: 0,
  fade: [
    [0, 1],
    [1, 0.4],
  ],
};

/** The Energy Ball's wake: small blue glints shed along its path, falling behind it as they die (flare01: Spark02's art is yellow). */
export const ENERGY_BALL_WAKE: ParticleRecipe = {
  texture: TEX.flare,
  colour: [0.65, 0.85, 1],
  colourEnd: [0.15, 0.3, 1],
  size: 0.14,
  sizeJitter: 0.4,
  life: 0.35,
  lifeJitter: 0.3,
  box: [0.1, 0.1, 0.1],
  dir1: [-1, -0.5, -1],
  dir2: [1, 0.8, 1],
  power: 0.9,
  powerJitter: 0.4,
  gravity: -1.5,
  spin: 4,
  capacity: 256,
  realSeconds: true,
};

/** The Energy Ball's pop: blue-white sparks flung out of the Spark03 flash. */
export const ENERGY_BALL_BURST: ParticleRecipe = {
  ...ENERGY_BALL_WAKE,
  colour: [0.8, 0.92, 1],
  size: 0.12,
  life: 0.4,
  box: [0.05, 0.05, 0.05],
  dir1: [-1, -0.6, -1],
  dir2: [1, 1, 1],
  power: 3.2,
  settle: 0.6,
  gravity: -1,
};

/** Hot sparks a Lance star sheds on the graded tiers: the star's orange, going red, falling away from the spin. */
export const LANCE_SPARKS: ParticleRecipe = {
  texture: TEX.spark2,
  colour: [1, 0.72, 0.4],
  colourEnd: [0.8, 0.25, 0.05],
  size: 0.15,
  sizeJitter: 0.4,
  life: 0.4,
  lifeJitter: 0.3,
  box: [0.12, 0.12, 0.12],
  dir1: [-1, -0.3, -1],
  dir2: [1, 0.9, 1],
  power: 1.4,
  powerJitter: 0.4,
  gravity: -2.5,
  spin: 4,
  capacity: 384,
  realSeconds: true,
};

/** A Lance star striking home: a short spray of its sparks. */
export const LANCE_STRIKE: ParticleRecipe = {
  ...LANCE_SPARKS,
  size: 0.16,
  life: 0.45,
  box: [0.05, 0.05, 0.05],
  dir1: [-1, -0.4, -1],
  dir2: [1, 1, 1],
  power: 3.4,
  settle: 0.55,
  gravity: -2,
};

/**
 * `BITMAP_SMOKE + 1` SubType 1 (:1690) - the puff `MonsterDieSandSmoke` and
 * the golden bosses' `Appear` throw 20 of a tick: SAND_SMOKE with LT 40, no
 * drift, ±8 cm in every axis, and the same +0.08 Scale a tick, so x7.7 by
 * death. The terrain re-pin becomes a climb matching the swell, as in
 * SAND_SMOKE.
 */
export const SAND_SMOKE_BURST: ParticleRecipe = {
  ...SAND_SMOKE,
  life: 1.6,
  box: [0.08, 0.08, 0.08],
  power: 0.74,
  endScale: 7.7,
  capacity: 512,
};

/**
 * `BITMAP_FLAME` SubType 1 (:610 init, :4786 move) - the small flame a Beam
 * Knight carries on two bones and Death Beam Knight on every wing bone: LT
 * 15 ticks, Scale +0.32-0.64 on the call's own, drifting 0.6-1 cm a tick,
 * `Light -= 0.05` a tick, re-rolled rotation every tick (the flicker). The
 * card is Flame01 at the row's `scale`; the rotation re-roll is a fast spin.
 */
export const FLAME_LICK: ParticleRecipe = {
  texture: TEX.flame,
  colour: RGBS.fire,
  colourEnd: RGBS.ember,
  size: 0.55,
  sizeJitter: 0.25,
  life: 0.6,
  lifeJitter: 0,
  box: [0.02, 0.02, 0.02],
  dir1: [0, 1, 0],
  dir2: [0, 1, 0],
  power: 0.2,
  powerJitter: 0.5,
  gravity: 0,
  spin: 20,
  capacity: 512,
};
