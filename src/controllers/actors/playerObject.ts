import {
  BoundingBox,
  Matrix,
  Vector3,
  type Scene,
  type TransformNode,
} from '../render/babylon/exports';
import { ModelObject } from '../render/modelObject';
import { CharacterClassNumber, PlayerClass, getBaseClass } from '../../core/types';
import { Entity, World, type Item } from '../../ecs/world';
import { PlayerAction } from '@versions/shared/objects/enum';
import { loadGLTF } from '../assets/modelLoader';
import { Ecs } from '../../ecs/current';
import {
  BACK_BONE,
  LEFT_HAND_BONE,
  PHOENIX_WING_MODEL,
  phoenixWingLink,
  questItemLink,
  RIGHT_HAND_BONE,
} from './weaponAttachment';
import { itemVisualTier, type ItemVisualTier } from '../item_fx/itemVisualTier';
import { requestGlowProbe } from '../render/sceneLook';
import { WingObject } from './wingObject';
import { WING_BONE, wingSpec } from './wings';
import { ItemsDatabase } from '@versions/shared/items/itemsDatabase';
import { archangelWeapon } from '../item_rules';
import { IMP_BONE, petSpec, type PetSpec } from '@/controllers/pets';
import { angleLinkMatrix } from '../render/boneLink';
import { chooseIdleAction, isPhoenixSoulStar } from './weaponClass';
import { isFemaleClass } from './mapPlayerNetClassToModelClass';
import { playerPlaySpeed } from '../anim/playSpeed';
import type { ShatterDeath } from '../fx/deathVisuals';

/** `MODEL_WEBZEN_MARK`: `Data\Skill\MuSign` (ZzzOpenData.cpp:4343). */
const GM_MARK_MODEL = 'Skill/musign.glb';
/** `CSParts(MODEL_WEBZEN_MARK, 20, false, 70, -5, 0)` (CSParts.cpp:46): head bone 20, cm as metres. */
const GM_MARK_BONE = 20;
const GM_MARK_OFFSET = new Vector3(0.7, -0.05, 0);
/** `m_pObj.Velocity` (CSParts.cpp:25): the mark's own clip, keys per tick. */
const GM_MARK_SPEED = 0.5;
const toBody = new Matrix();
const boneToBody = new Matrix();

export class PlayerObject extends ModelObject {
  /**
   * The class a *player-rig NPC* poses as (`c->Class` on the NPC the
   * original creates with `CreateCharacter(..., MODEL_PLAYER, ...)`).
   * `null` on real players - their class arrives with the appearance.
   * Read by `modules/scope/objects.ts` so `isFemale` is not hard-zeroed for these.
   */
  static NpcClass: CharacterClassNumber | null = null;

  /**
   * `if (c->MonsterIndex == MONSTER_ELF_SOLDIER) Fly = true;`
   * (ZzzCharacter.cpp:222) - the Elf Soldier hovers wherever she stands.
   */
  static NpcAlwaysFly = false;

  /** `c->PK` a player-rig NPC is created with (`PVP_*`), or null: 6 draws the body red. */
  static NpcHeroState: number | null = null;

  /**
   * A player-rig monster that bursts into pieces instead of playing
   * PLAYER_DIE1 (the Skeleton ring bodies, ZzzCharacter.cpp:1383-1390).
   * `null` = the Die clip. Read by deathSystem.startDie.
   */
  static DeathShatter: ShatterDeath | null = null;

  playerClass: PlayerClass = PlayerClass.DarkKnight;

  readonly HelmMask: ModelObject;
  readonly Helm: ModelObject;
  readonly Armor: ModelObject;
  readonly Pants: ModelObject;
  readonly Gloves: ModelObject;
  readonly Boots: ModelObject;
  readonly Weapon1: ModelObject;
  readonly Weapon2: ModelObject;
  /**
   * The wings the Phoenix Soul Star trails from each forearm - a second model
   * for the same weapon slot, which the original draws in its own pass
   * (`RenderPhoenixGloves`, MonkSystem.cpp:241). Empty for every other item.
   */
  readonly PhoenixWing1: ModelObject;
  readonly PhoenixWing2: ModelObject;
  readonly Wings: WingObject;
  /**
   * The Blood Castle quest weapon, carried on the back bone beside the wings
   * while this character is the one holding it (`c->EtcPart` 1..3,
   * ZzzCharacter.cpp:15367-15391). Empty everywhere else.
   */
  readonly QuestItem: ModelObject;
  /** `c->Helper` when it is link-rendered on the body (the Imp / Satan). */
  readonly Pet: ModelObject;
  /**
   * The Webzen mark over a game master (`PARTS_WEBZEN`, CSParts.cpp:28-46). Its own root, so it
   * carries its own chrome pass, and not on a bone: `CSParts::IRender` puts it at bone 20 plus
   * the offset and turns it with the character (CSParts.cpp:186-212). `gmMarkOn` is the request.
   */
  readonly GmMark: ModelObject;
  gmMarkOn = false;

  IsInteractable = false;

  constructor(scene: Scene, parent: TransformNode) {
    super(scene, parent);

    this.BoundingBoxLocal = new BoundingBox(
      new Vector3(-0.4, 0, -0.4),
      new Vector3(0.4, 1.2, 0.4)
    );

    this.CurrentAction = PlayerAction.PLAYER_SKILL_INFERNO;

    this.HelmMask = new ModelObject(scene, this.node);
    this.Helm = new ModelObject(scene, this.node);
    this.Armor = new ModelObject(scene, this.node);
    this.Pants = new ModelObject(scene, this.node);
    this.Gloves = new ModelObject(scene, this.node);
    this.Boots = new ModelObject(scene, this.node);
    this.Weapon1 = new ModelObject(scene, this.node);
    this.Weapon2 = new ModelObject(scene, this.node);
    this.PhoenixWing1 = new ModelObject(scene, this.node);
    this.PhoenixWing2 = new ModelObject(scene, this.node);
    this.Wings = new WingObject(scene, this.node);
    this.QuestItem = new ModelObject(scene, this.node);
    this.Pet = new ModelObject(scene, this.node);
    this.GmMark = new ModelObject(scene, this.node);
    this.GmMark.NodeNamePrefix = 'GmMark_';
    this.GmMark.SkipBoundingBox = true;
    this.GmMark.CastsShadow = false;
    this.GmMark.FixedLight = true;
    this.GmMark.AnimationSpeed = GM_MARK_SPEED;
    // ZzzObject.cpp:1558-1564: the lit model, then RENDER_BRIGHT | RENDER_CHROME in (1, 0.5, 0).
    this.GmMark.BodyShine.tint.set(1, 0.5, 0);
    this.GmMark.BodyShine.chromeOnly = true;

    this.HelmMask.NodeNamePrefix = 'HelmMask_';
    this.Helm.NodeNamePrefix = 'Helm_';
    this.Armor.NodeNamePrefix = 'Armor_';
    this.Pants.NodeNamePrefix = 'Pants_';
    this.Gloves.NodeNamePrefix = 'Gloves_';
    this.Boots.NodeNamePrefix = 'Boots_';
    this.Weapon1.NodeNamePrefix = 'Weapon1_';
    this.Weapon2.NodeNamePrefix = 'Weapon2_';
    this.PhoenixWing1.NodeNamePrefix = 'PhoenixWing1_';
    this.PhoenixWing2.NodeNamePrefix = 'PhoenixWing2_';
    this.Wings.NodeNamePrefix = 'Wings_';
    this.QuestItem.NodeNamePrefix = 'QuestItem_';
    this.Pet.NodeNamePrefix = 'Pet_';

    // The player's shadow pass opens at half alpha (ZzzCharacter.cpp:8588).
    this.ShadowMinAlpha = PLAYER_SHADOW_MIN_ALPHA;
    for (const part of [this.HelmMask, this.Helm, this.Armor, this.Pants, this.Gloves, this.Boots, this.Weapon1, this.Weapon2]) {
      part.ShadowMinAlpha = PLAYER_SHADOW_MIN_ALPHA;
    }

    // Never in RenderCharacter's shadow pass, which draws BodyPart[] and Weapon[] alone (ZzzCharacter.cpp:8590-8628).
    this.PhoenixWing1.ClassicShadow = false;
    this.PhoenixWing2.ClassicShadow = false;
    this.QuestItem.ClassicShadow = false;
    this.Pet.ClassicShadow = false;

    const objs = [
      this.HelmMask,
      this.Helm,
      this.Armor,
      this.Pants,
      this.Gloves,
      this.Boots,
      this.Weapon1,
      this.Weapon2,
      this.PhoenixWing1,
      this.PhoenixWing2,
      this.Wings,
      this.QuestItem,
      this.Pet,
    ];

    objs.forEach(obj => {
      obj.setParent(this);
      obj.LinkParent = true;
    });

    // c->Wing hangs off back bone 47 (ZzzCharacter.cpp:15104); a cape moves
    // it to bone 19 with a link matrix - WingObject.prepare() owns that.
    this.Wings.LinkParent = false;
    this.Wings.ParentBoneLink = WING_BONE;
    this.Wings.SkipBoundingBox = true;

    // The Blood Castle quest weapon rides the same bone as the wings: the
    // original borrows the wing PART_t for it and draws it first, so a
    // carrier with wings wears both (ZzzCharacter.cpp:15367-15391). Unlike
    // the wings it is linked with a matrix - see setQuestItemAsync.
    this.QuestItem.LinkParent = false;
    this.QuestItem.ParentBoneLink = BACK_BONE;
    this.QuestItem.SkipBoundingBox = true;

    // The Imp rides bone 34 with a (20,0,0) cm offset (ZzzCharacter.cpp:15148-15170).
    this.Pet.LinkParent = false;
    this.Pet.ParentBoneLink = IMP_BONE;
    this.Pet.SkipBoundingBox = true;
    this.Weapon1.SkipBoundingBox = true;
    this.Weapon2.SkipBoundingBox = true;
    this.HelmMask.SkipBoundingBox = true;
    this.Pants.SkipBoundingBox = true;
    this.Gloves.SkipBoundingBox = true;
    this.Helm.SkipBoundingBox = true;

    // Original bone links (ZzzCharacter.cpp:11849-11850): Weapon[0] → 33
    // (right hand), Weapon[1] → 42 (left hand); back / wings → 47.
    // The actual per-item bone/offset is applied by weaponAttachment.ts.
    this.Weapon1.LinkParent = false;
    this.Weapon1.ParentBoneLink = RIGHT_HAND_BONE;
    this.Weapon2.LinkParent = false;
    this.Weapon2.ParentBoneLink = LEFT_HAND_BONE;

    for (const slot of [0, 1] as const) {
      const wing = slot === 0 ? this.PhoenixWing1 : this.PhoenixWing2;
      const { bone, link } = phoenixWingLink(slot);
      wing.LinkParent = false;
      wing.SkipBoundingBox = true;
      wing.setBoneLink(bone, link);
    }
  }

  /**
   * Loads (or clears) the phoenix wings of one weapon slot. They belong to
   * the Phoenix Soul Star alone, and the original runs them off the weapon's
   * own clip - `PHOENIX_POSE`, applied every frame with the other parts.
   */
  async setPhoenixWingAsync(slot: 0 | 1, weapon: Item | null) {
    const wing = slot === 0 ? this.PhoenixWing1 : this.PhoenixWing2;
    if (!isPhoenixSoulStar(weapon)) {
      wing.Unload();
      return;
    }
    await this.loadPartAsync('Item/', wing, PHOENIX_WING_MODEL);
  }

  async init(world: World, entity: Entity) {
    await super.init(world, entity);

    this.load(await loadGLTF('Player/player.glb', world));
    this.Ready = false;
    await this.updateBodyPartClassesAsync();

    this.Ready = true;
  }

  async updateBodyPartClassesAsync() {
    await this.setBodyPartsAsync(
      'Player/',
      'HelmClass',
      'ArmorClass',
      'PantClass',
      'GloveClass',
      'BootClass',
      this.playerClass
    );
  }

  /**
   * Loads (or clears) the wing part. `WingObject.prepare` has to run before
   * `load()`, because `BlendMesh` is consumed there and the bone link decides
   * whether the part hangs from the back bone or the cape bone.
   */
  async setWingsAsync(wings: Item | null) {
    const spec = wingSpec(wings);
    const def = wings && spec ? ItemsDatabase.getItem(wings.group, wings.num) : null;

    if (!wings || !spec || !def || spec.clothOnly) {
      this.Wings.prepare(null);
      this.Wings.Unload();
      return;
    }

    this.Wings.prepare(spec);

    await this.loadPartAsync(
      def.szModelFolder,
      this.Wings,
      def.szModelName,
      wings.lvl,
      wings.isExcellent,
      itemVisualTier(wings)
    );
  }

  /**
   * Loads (or clears) the Blood Castle quest weapon on the back.
   * `level` is `c->EtcPart`: 1 the Divine Staff, 2 the Divine Sword, 3 the
   * Divine Crossbow of Archangel (ZzzCharacter.cpp:15380-15385), which are
   * the three models the Weapon of Archangel is shown as - the same table the
   * ground drop reads (`dropModelProxy.ts`).
   */
  async setQuestItemAsync(level: number | null) {
    const weapon = level ? archangelWeapon(level - 1) : null;
    const def = weapon ? ItemsDatabase.getItem(weapon[0], weapon[1]) : null;

    if (!weapon || !def) {
      this.QuestItem.Unload();
      return;
    }

    this.QuestItem.setBoneLink(
      BACK_BONE,
      questItemLink({ group: weapon[0], num: weapon[1] })
    );
    await this.loadPartAsync(def.szModelFolder, this.QuestItem, def.szModelName);
  }

  /**
   * Loads (or clears) the body-linked pet. Only the Imp lives here - the
   * Guardian Angel and the two mounts are world objects owned by PetSystem.
   */
  async setBodyPetAsync(pet: Item | null) {
    const spec: PetSpec | null = petSpec(pet);

    if (!spec || spec.kind !== 'imp') {
      this.Pet.Unload();
      return;
    }

    this.Pet.setBoneLink(
      IMP_BONE,
      angleLinkMatrix({ angle: [0, 0, 0], offset: [20, 0, 0] })
    );
    this.Pet.CurrentAction = -1;

    const seq = ++this.Pet.loadSeq;
    const gltf = await loadGLTF(spec.model, Ecs.world!);
    if (seq !== this.Pet.loadSeq) return;
    this.Pet.load(gltf);

    for (const mesh of this.Pet.getMeshes(true)) {
      mesh.isPickable = false;
      mesh.metadata ??= {};
      mesh.metadata.timeOffset = 0;
    }
  }

  /** Puts on (or takes off) the Webzen mark (`CreatePartsFactory` / `DeleteParts`, CSParts.cpp). */
  async setGmMarkAsync(on: boolean) {
    this.gmMarkOn = on;
    if (!on) {
      this.GmMark.Unload();
      return;
    }

    const world = Ecs.world;
    if (!world) return;
    const seq = ++this.GmMark.loadSeq;
    const gltf = await loadGLTF(GM_MARK_MODEL, world);
    if (seq !== this.GmMark.loadSeq) return;
    this.GmMark.load(gltf);
    for (const mesh of this.GmMark.getMeshes()) mesh.isPickable = false;
  }

  /** `CSParts::IRender`: bone 20's transform of the offset, in the body's frame, so it turns with the body. */
  private placeGmMark(gameTime: World['gameTime']) {
    const bone = this.gltf?.skeleton?.bones[GM_MARK_BONE + 1]?.getTransformNode();
    if (!bone) return;
    this.node.getWorldMatrix().invertToRef(toBody);
    bone.getWorldMatrix().multiplyToRef(toBody, boneToBody);
    Vector3.TransformCoordinatesToRef(GM_MARK_OFFSET, boneToBody, this.GmMark.node.position);
    this.GmMark.Update(gameTime);
  }

  /**
   * Starts the idle clip a player-rig NPC stands in. The factories used to
   * assign `CurrentAction` without playing it, which left the model on the
   * glTF loader’s auto-started clip 0 (`PLAYER_SET`) - always the male rest
   * pose, whatever the NPC’s class.
   */
  startNpcIdle() {
    const ctor = this.constructor as typeof PlayerObject;
    const cls = ctor.NpcClass ?? CharacterClassNumber.DarkKnight;

    const action = ctor.NpcAlwaysFly
      ? PlayerAction.PLAYER_STOP_FLY
      : chooseIdleAction({
          hands: undefined,
          baseClass: getBaseClass(cls),
          isFemale: isFemaleClass(cls),
          weaponsStowed: true,
          inChaosCastle: false,
        });

    this.AnimationSpeed = playerPlaySpeed(action);
    this.playAction(action, true);
  }

  async setDefaultHelm() {
    await this.setBodyPartsAsync(
      'Player/',
      'HelmClass',
      '',
      '',
      '',
      '',
      this.playerClass
    );
  }

  async setDefaultMask() {
    this.HelmMask.Unload();
  }

  async setDefaultArmor() {
    await this.setBodyPartsAsync(
      'Player/',
      '',
      'ArmorClass',
      '',
      '',
      '',
      this.playerClass
    );
  }

  async setDefaultPants() {
    await this.setBodyPartsAsync(
      'Player/',
      '',
      '',
      'PantClass',
      '',
      '',
      this.playerClass
    );
  }

  async setDefaultGloves() {
    await this.setBodyPartsAsync(
      'Player/',
      '',
      '',
      '',
      'GloveClass',
      '',
      this.playerClass
    );
  }

  async setDefaultBoots() {
    await this.setBodyPartsAsync(
      'Player/',
      '',
      '',
      '',
      '',
      'BootClass',
      this.playerClass
    );
  }

  async setBodyPartsAsync(
    pathPrefix: string,
    helmPrefix: string,
    armorPrefix: string,
    pantPrefix: string,
    glovePrefix: string,
    bootPrefix: string,
    skinIndex: number
  ) {
    // Format skin index to two digits (e.g., 1 -> "01", 10 -> "10")
    const fileSuffix = skinIndex.toString().padStart(2, '0');

    await Promise.all([
      !helmPrefix
        ? Promise.resolve()
        : this.loadPartAsync(
            pathPrefix,
            this.Helm,
            `${helmPrefix}${fileSuffix}.glb`
          ),
      !armorPrefix
        ? Promise.resolve()
        : this.loadPartAsync(
            pathPrefix,
            this.Armor,
            `${armorPrefix}${fileSuffix}.glb`
          ),
      !pantPrefix
        ? Promise.resolve()
        : this.loadPartAsync(
            pathPrefix,
            this.Pants,
            `${pantPrefix}${fileSuffix}.glb`
          ),
      !glovePrefix
        ? Promise.resolve()
        : this.loadPartAsync(
            pathPrefix,
            this.Gloves,
            `${glovePrefix}${fileSuffix}.glb`
          ),
      !bootPrefix
        ? Promise.resolve()
        : this.loadPartAsync(
            pathPrefix,
            this.Boots,
            `${bootPrefix}${fileSuffix}.glb`
          ),
    ]);
  }

  async loadPartAsync(
    dir: string,
    part: ModelObject,
    modelPath: string,
    itemLvl?: number,
    isExcellent?: boolean,
    tier?: ItemVisualTier
  ) {
    const seq = ++part.loadSeq;
    // Counted so the loading screen can tell a character that is merely
    // `Ready` (its rig is in) from one that is dressed: every part of a
    // character comes through here (`sceneGate.isStaged`).
    this.PartsPending++;
    try {
      const gltf = await loadGLTF(dir + modelPath, Ecs.world!);
      if (seq !== part.loadSeq) return;
      part.load(gltf);

      gltf.mesh.isPickable = this.IsInteractable;
      const meshes = part.getMeshes(true);

      meshes.forEach(mesh => {
        mesh.isPickable = this.IsInteractable;
        mesh.metadata ??= {};
        mesh.metadata.itemLvl = itemLvl ?? 0;
        mesh.metadata.isExcellent = isExcellent ?? false;
        // Read by the GlowLayer emissive selector (sceneLook.ts); null keeps
        // the default body parts off the glow pass.
        mesh.metadata.itemTier = tier?.active ? tier : null;
        mesh.metadata.timeOffset = 0;
        if (tier?.active) requestGlowProbe();
      });
    } finally {
      this.PartsPending--;
    }
  }

  /**
   * `RenderCharacter`'s shadow pass (ZzzCharacter.cpp:8590-8628): none for a Uniria or Dinorant rider out of a
   * safe zone, no weapon in a safe zone, never a bow or crossbow (`MODEL_SHORT_BOW` to `MODEL_BOW + 32`).
   */
  setClassicShadows(rider: boolean, inSafeZone: boolean, weapon1: Item | null | undefined, weapon2: Item | null | undefined): void {
    const body = !rider;
    this.ClassicShadow = body;
    this.HelmMask.ClassicShadow = body;
    this.Helm.ClassicShadow = body;
    this.Armor.ClassicShadow = body;
    this.Pants.ClassicShadow = body;
    this.Gloves.ClassicShadow = body;
    this.Boots.ClassicShadow = body;
    this.Weapon1.ClassicShadow = body && !inSafeZone && !isBowOrCrossbow(weapon1);
    this.Weapon2.ClassicShadow = body && !inSafeZone && !isBowOrCrossbow(weapon2);
  }

  Update(gameTime: World['gameTime']): void {
    super.Update(gameTime);

    // Update all children
    for (const child of this.Children) {
      child.Update(gameTime);
    }

    if (this.GmMark.Ready) this.placeGmMark(gameTime);
  }

  dispose(): void {
    // Not a child (its own root), so the base does not reach it.
    this.GmMark.dispose();
    super.dispose();
  }

  Draw(gameTime: World['gameTime']): void {
    super.Draw(gameTime);

    // Update all children
    for (const child of this.Children) {
      child.Draw(gameTime);
    }
  }
}

const PLAYER_SHADOW_MIN_ALPHA = 0.5;

const BOW_GROUP = 4;
const LAST_BOW = 32;

const isBowOrCrossbow = (item: Item | null | undefined): boolean => item?.group === BOW_GROUP && item.num <= LAST_BOW;

/** The class a player-rig NPC factory poses as, if it declares one. */
export function npcClassOf(
  factory: typeof ModelObject
): CharacterClassNumber | null {
  return (factory as typeof PlayerObject).NpcClass ?? null;
}

/** The `HeroState` (`c->PK`) a player-rig NPC factory spawns with, if it declares one. */
export function npcHeroStateOf(factory: typeof ModelObject): number | null {
  return (factory as typeof PlayerObject).NpcHeroState ?? null;
}

/**
 * Whether this body is a character's own rig rather than something else's.
 *
 * A transformation skin can be either (`controllers/actors/transformedBody.ts`): a part
 * file worn on the character's rig, which is still a `PlayerObject`, or a
 * whole monster with a rig of its own, which is not. Everything that reaches
 * for an equipment socket or a player clip has to ask first.
 */
export function isPlayerBody(model: ModelObject): model is PlayerObject {
  return model instanceof PlayerObject;
}
