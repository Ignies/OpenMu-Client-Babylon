import {
  BoundingBox,
  Vector3,
  type Scene,
  type TransformNode,
} from '../libs/babylon/exports';
import { ModelObject } from './modelObject';
import { CharacterClassNumber, PlayerClass } from './types';
import { Entity, World, type Item } from '../ecs/world';
import { PlayerAction } from './objects/enum';
import { loadGLTF } from './modelLoader';
import { Store } from '../store';
import { LEFT_HAND_BONE, RIGHT_HAND_BONE } from './weaponAttachment';
import { itemVisualTier, type ItemVisualTier } from './itemVisualTier';
import { requestGlowProbe } from '../scenes/sceneLook';
import { WingObject } from './wingObject';
import { WING_BONE, wingSpec } from './wings';
import { ItemsDatabase } from './itemsDatabase';
import { IMP_BONE, petSpec, type PetSpec } from './pets';
import { angleLinkMatrix } from './boneLink';
import { chooseIdleAction } from './weaponClass';
import { getBaseClass } from './characterStats';
import { isFemaleClass } from './mapPlayerNetClassToModelClass';
import { playerPlaySpeed } from './playSpeed';
import type { ShatterDeath } from './deathVisuals';

export class PlayerObject extends ModelObject {
  /**
   * The class a *player-rig NPC* poses as (`c->Class` on the NPC the
   * original creates with `CreateCharacter(..., MODEL_PLAYER, ...)`).
   * `null` on real players — their class arrives with the appearance.
   * Read by logic.ts so `isFemale` is not hard-zeroed for these.
   */
  static NpcClass: CharacterClassNumber | null = null;

  /**
   * `if (c->MonsterIndex == MONSTER_ELF_SOLDIER) Fly = true;`
   * (ZzzCharacter.cpp:222) — the Elf Soldier hovers wherever she stands.
   */
  static NpcAlwaysFly = false;

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
  readonly Wings: WingObject;
  /** `c->Helper` when it is link-rendered on the body (the Imp / Satan). */
  readonly Pet: ModelObject;

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
    this.Wings = new WingObject(scene, this.node);
    this.Pet = new ModelObject(scene, this.node);

    this.HelmMask.NodeNamePrefix = 'HelmMask_';
    this.Helm.NodeNamePrefix = 'Helm_';
    this.Armor.NodeNamePrefix = 'Armor_';
    this.Pants.NodeNamePrefix = 'Pants_';
    this.Gloves.NodeNamePrefix = 'Gloves_';
    this.Boots.NodeNamePrefix = 'Boots_';
    this.Weapon1.NodeNamePrefix = 'Weapon1_';
    this.Weapon2.NodeNamePrefix = 'Weapon2_';
    this.Wings.NodeNamePrefix = 'Wings_';
    this.Pet.NodeNamePrefix = 'Pet_';

    const objs = [
      this.HelmMask,
      this.Helm,
      this.Armor,
      this.Pants,
      this.Gloves,
      this.Boots,
      this.Weapon1,
      this.Weapon2,
      this.Wings,
      this.Pet,
    ];

    objs.forEach(obj => {
      obj.setParent(this);
      obj.LinkParent = true;
    });

    // c->Wing hangs off back bone 47 (ZzzCharacter.cpp:15104); a cape moves
    // it to bone 19 with a link matrix — WingObject.prepare() owns that.
    this.Wings.LinkParent = false;
    this.Wings.ParentBoneLink = WING_BONE;
    this.Wings.SkipBoundingBox = true;

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

    if (!wings || !spec || !def) {
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
   * Loads (or clears) the body-linked pet. Only the Imp lives here — the
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
    const gltf = await loadGLTF(spec.model, Store.world!);
    if (seq !== this.Pet.loadSeq) return;
    this.Pet.load(gltf);

    for (const mesh of this.Pet.getMeshes(true)) {
      mesh.isPickable = false;
      mesh.metadata ??= {};
      mesh.metadata.timeOffset = 0;
    }
  }

  /**
   * Starts the idle clip a player-rig NPC stands in. The factories used to
   * assign `CurrentAction` without playing it, which left the model on the
   * glTF loader’s auto-started clip 0 (`PLAYER_SET`) — always the male rest
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
    const gltf = await loadGLTF(dir + modelPath, Store.world!);
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
  }

  Update(gameTime: World['gameTime']): void {
    super.Update(gameTime);

    // Update all children
    for (const child of this.Children) {
      child.Update(gameTime);
    }
  }

  Draw(gameTime: World['gameTime']): void {
    super.Draw(gameTime);

    // Update all children
    for (const child of this.Children) {
      child.Draw(gameTime);
    }
  }
}

/** The class a player-rig NPC factory poses as, if it declares one. */
export function npcClassOf(
  factory: typeof ModelObject
): CharacterClassNumber | null {
  return (factory as typeof PlayerObject).NpcClass ?? null;
}
