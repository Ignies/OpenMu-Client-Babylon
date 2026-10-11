import { cloth, type ClothSet } from '../../controllers/cloth';
import { cloaksFor, type CloakWearer } from '../../controllers/actors/cloaks';
import { heldWeapons } from '../../controllers/actors';
import { inChaosCastle } from '../../controllers/actors/locomotion';
import { MonsterObject } from '../../controllers/actors/monsterObject';
import { isPlayerBody } from '../../controllers/actors/playerObject';
import { characterSkinParts } from '../../controllers/actors/transformedBody';
import { isBook, isSwordformGloves } from '../../controllers/actors/weaponClass';
import type { ModelObject } from '../../controllers/render/modelObject';
import { petSpec } from '@/controllers/pets';
import type { Entity, ISystemFactory, Item, World } from '../world';

/** `eBuff_Cloaking`, `eDeBuff_Stun`, `eDeBuff_Sleep` (`eBuffState`, _enum.h). */
const CLOAKING = 18;
const STUN = 61;
const SLEEP = 72;

/** The part file a rig-worn skin draws, by skin number, read once (`characterSkinParts` builds its table per call). */
const skinParts = new Map<number, string | null>();
function skinPart(skin: number | undefined): string | null {
  if (skin === undefined) return null;
  let part = skinParts.get(skin);
  if (part === undefined) skinParts.set(skin, (part = characterSkinParts()[skin]?.[1] ?? null));
  return part;
}

/** A held item `RenderLinkObject` draws (books return before it, glove weapons have their own pass). */
const linked = (item: Item | null | undefined): boolean => !!item && !isBook(item) && !isSwordformGloves(item);

/** The body's cloth set (`o->m_pCloth`): the player rig's or a monster's. */
function clothOf(model: ModelObject): ClothSet | null {
  if (isPlayerBody(model)) return model.Cloth;
  return model instanceof MonsterObject ? model.Cloth : null;
}

/**
 * Every character's physics cloths, each frame: the wearers' content builds and draws them on the body's
 * set (`cloaksFor`), and the cloth clock moves on. The characters come first, then the monsters that have
 * no equipment (the Nightmare); a player-rig monster (the Death King) has its kit's and is a character. A
 * cloaked or unseen body moves none (the original only steps a rendered character's cloth); stun and sleep
 * hold them (`Move2(0, 5)`, ZzzCharacter.cpp:9963-9968).
 */
function clothSystem(world: World) {
  const characters = world.with('charAppearance', 'modelObject');
  const monsters = world.with('npcType', 'modelObject');
  /** Each character's wing the frame before. */
  const wings = new WeakMap<Entity, Item | null>();
  const wearer: CloakWearer = {
    charClass: 0,
    wing: null,
    wingBefore: null,
    armor: null,
    skin: null,
    chaosCastle: false,
    netId: null,
    hero: false,
    guild: null,
    monster: null,
    rig: false,
  };

  /** One body's frame: the rule on its set, then what the set needs to step and draw. */
  function step(e: Entity, model: ModelObject, set: ClothSet, castle: boolean, mapIndex: number): void {
    set.undraw();
    set.setLight(cloaksFor(wearer, set));
    if (!set.built) return;
    const buffs = e.buffs;
    set.shown = model.Ready && !model.OutOfView && e.visibility?.state !== 'hidden' && !buffs?.has(CLOAKING);
    set.held = !!buffs && (buffs.has(STUN) || buffs.has(SLEEP));
    // The cloth's shadow is drawn by every link object's RenderLinkObject (ZzzCharacter.cpp:8433-8446): the wing
    // slot and the Imp outside Chaos Castle, the held weapons anywhere; a body off the player rig has none.
    const look = e.charAppearance;
    if (!look || !wearer.rig) {
      set.castsShadow = false;
      return;
    }
    const hands = heldWeapons(e, mapIndex) ?? look;
    set.castsShadow =
      (!castle && (!!look.wings || petSpec(look.pet)?.kind === 'imp')) || linked(hands.leftHand) || linked(hands.rightHand);
  }

  return {
    update: (dt: number) => {
      cloth.update?.(world.mapIndex, dt);
      const castle = inChaosCastle(world.mapIndex);
      wearer.chaosCastle = castle;
      for (const e of characters) {
        const model = e.modelObject;
        const set = clothOf(model);
        if (!set) continue;
        const look = e.charAppearance;
        const rig = isPlayerBody(model);
        wearer.charClass = look.charClass;
        wearer.wing = look.wings;
        const before = wings.get(e);
        wearer.wingBefore = before === undefined ? look.wings : before;
        wings.set(e, look.wings);
        wearer.armor = look.armor;
        wearer.skin = rig ? skinPart(e.skin) : null;
        wearer.netId = e.netId ?? null;
        wearer.hero = !!e.localPlayer;
        wearer.guild = e.guild?.id ?? null;
        // A player-rig monster's own number; a player in a monster's body is that monster (CreateMonster).
        wearer.monster = rig ? (e.npcType ?? null) : (e.skin ?? null);
        wearer.rig = rig;
        step(e, model, set, castle, world.mapIndex);
      }
      for (const e of monsters) {
        if (e.charAppearance) continue;
        const model = e.modelObject;
        const set = clothOf(model);
        if (!set) continue;
        wearer.charClass = 0;
        wearer.wing = wearer.wingBefore = wearer.armor = null;
        wearer.skin = null;
        wearer.netId = e.netId ?? null;
        wearer.hero = false;
        wearer.guild = null;
        wearer.monster = e.npcType;
        wearer.rig = isPlayerBody(model);
        step(e, model, set, castle, world.mapIndex);
      }
    },
  };
}

export const ClothSystem: ISystemFactory = clothSystem;
