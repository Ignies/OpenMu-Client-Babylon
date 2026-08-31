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
   * what everything blood is drawn with rather than a red-tinted `flare` —
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
  /** BITMAP_TWLIGHT (Skill/twlighthik01.jpg): Recover's halo. */
  twilight: 'Skill/twlighthik01.OZJ',
  /** BITMAP_ORORA (hikorora.jpg). */
  orora: 'Effect/hikorora.OZJ',
  /** BITMAP_BLUR+10 / sword trails. */
  swordBlur: 'Effect/sword_blur.OZJ',
  swordEff: 'Effect/SwordEff.OZJ',
  swordEff2: 'Effect/SwordEffor2.OZJ',
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
  pierce: 'Effect/Piercing.OZJ',
  waves: 'Effect/waves.OZJ',
  water: 'Effect/water.OZJ',
  wind: 'Effect/wind01.OZJ',
  groundWind: 'Effect/ground_wind.OZJ',
  forcePillar: 'Effect/force_Pillar.OZJ',
  ghost: 'Effect/ghosteffect01.OZJ',
  ghost2: 'Effect/Ghosteffect02.OZJ',
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
  kwave: 'Effect/Kwave.OZJ',
  powerWave: 'Effect/PoundingBall.OZJ',
} as const;

export type EffectTexture = (typeof TEX)[keyof typeof TEX];

// ---- models (Data/Skill/*.bmd → *.glb) -----------------------------------------

export const MODEL = {
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
  groundStone: 'Skill/GroundStone.glb',
  groundStone2: 'Skill/GroundStone2.glb',
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
  waveForce: 'Skill/WaveForce.glb',
  swordForce: 'Skill/SwordForce.glb',
  piercing: 'Skill/Piercing.glb',
  javelin: 'Skill/Javelin.glb',
  saw: 'Skill/Saw01.glb',
  laser: 'Skill/Laser01.glb',
  darkLordSkill: 'Skill/DarkLordSkill.glb',
  darkSpirit: 'Skill/darkspirit.glb',
  darkFireScream: 'Skill/darkfirescrem01.glb',
  darkFireScream2: 'Skill/darkfirescrem02.glb',
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
  combo: 'Skill/combo.glb',
  deathStab: 'Skill/deathsp_eff.glb',
  elfSkill: 'Skill/elf_skill.glb',
  manaRune: 'Skill/ManaRune.glb',
  ring: 'Skill/ring.glb',
  airforce: 'Skill/airforce.glb',
  boswind: 'Skill/boswind.glb',
  mayaTornado: 'Skill/mayatonedo.glb',
  hellgate: 'Skill/hellgate.glb',
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
  volcanoStone: 'Effect/volcano_stone.glb',
  changeUp: 'Effect/Change_Up_Eff.glb',
  iceStone: 'Effect/ice_stone00.glb',
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
   * Physical blood, as against the `blood` above — the glowing red the bleed
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

/** BITMAP_FIRE puffs that drift up — the trail of a fireball, a small blaze. */
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

/** A dark smoke roll (alpha blended) behind a stone or under a flame. */
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
  blend: 'alpha',
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
 * Blood flecks thrown off a struck body — a blow's, and the knight's bleed
 * skills'.
 *
 * **Alpha, never additive.** Additive light can only brighten what is behind
 * it, so a red-tinted `flare` over a bright ground — Devias snow, Tarkan sand
 * — adds into all three channels at once, clips to white, and the bloom in
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
 * chips — the single brightest thing in the effect, and the one that read as
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

/** Dust kicked up by an earth skill (alpha). */
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
  blend: 'alpha',
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

/** BITMAP_SMOKE tinted the Poison hit's (0.4, 0.6, 1.0). */
export const POISON_SMOKE: ParticleRecipe = {
  ...SMOKE,
  colour: [0.4, 0.6, 1],
  colourEnd: [0.15, 0.25, 0.4],
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
 * up in a 60-120° fan and one grey BITMAP_EXPLOTION card — the Chaos Castle
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
 * 0 — the sand a walking Tarkan monster kicks up (`MonsterMoveSandSmoke`,
 * ZzzCharacter.cpp:5456; init ZzzEffectParticle.cpp:1661, move :7052): LT 32
 * ticks, Scale 0.32–0.64 (card 20–41 cm), ±8 cm jitter, `Light` fading
 * LifeTime/32 linearly to black under the texture's own alpha, Scale +0.08 a tick
 * (×6.3 at the mean by death), the card re-pinned every tick to the terrain
 * at half its own height. The pin is the 0.6 tile/s climb here: the centre
 * rises as fast as the card swells, so the bottom edge stays on the ground.
 * Not ported: the 3 cm/tick drift along the monster's facing, decaying ×0.9
 * a tick (30 cm in all) — a shared system has one direction for every
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
 * `BITMAP_SPARK` SubType 0 (Spark02) — the chips a landed blow throws
 * (ZzzEffectParticle.cpp:2012 init, :6554 move): Scale `(rand()%4+4)*0.1` =
 * 0.4–0.7, LT 24–39 ticks, thrown 2–4 cm/tick sideways and 6–22 cm/tick up,
 * gravity −2 cm/tick², brightness LifeTime/16 (full until the last 16
 * ticks). `RenderParticles` draws `pBitmap->Width * o->Scale` and Spark02 is
 * **4 px** — a chip is a 1.6–2.8 cm card (0.016–0.028 tiles), a hot grain,
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
 * (ZzzObject.cpp:6223): LT 18 ticks, tilted 45°, no motion — a star that
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
