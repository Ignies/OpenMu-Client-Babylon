import { cloth } from '../../controllers/cloth';
import { cloaksFor, type CloakWearer } from '../../controllers/actors/cloaks';
import { heldWeapons } from '../../controllers/actors';
import { inChaosCastle } from '../../controllers/actors/locomotion';
import { isPlayerBody } from '../../controllers/actors/playerObject';
import { characterSkinParts } from '../../controllers/actors/transformedBody';
import { isBook, isSwordformGloves } from '../../controllers/actors/weaponClass';
import { petSpec } from '@/controllers/pets';
import type { ISystemFactory, Item, World } from '../world';

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

/**
 * Every character's physics cloths, each frame: the wearers' content builds and draws them on the body's
 * set (`cloaksFor`), and the cloth clock moves on. A cloaked or unseen body moves none (the original
 * only steps a rendered character's cloth); stun and sleep hold them (`Move2(0, 5)`, ZzzCharacter.cpp:9963-9968).
 */
function clothSystem(world: World) {
  const query = world.with('charAppearance', 'modelObject');
  const wearer: CloakWearer = { charClass: 0, wing: null, armor: null, skin: null, chaosCastle: false, netId: null, hero: false, guild: null };

  return {
    update: (dt: number) => {
      cloth.update?.(world.mapIndex, dt);
      const castle = inChaosCastle(world.mapIndex);
      for (const e of query) {
        const model = e.modelObject;
        // A body worn as a whole monster is no MODEL_PLAYER: no cloak (:9164-9171).
        if (!isPlayerBody(model)) continue;
        const look = e.charAppearance;
        wearer.charClass = look.charClass;
        wearer.wing = look.wings;
        wearer.armor = look.armor;
        wearer.skin = skinPart(e.skin);
        wearer.chaosCastle = castle;
        wearer.netId = e.netId ?? null;
        wearer.hero = !!e.localPlayer;
        wearer.guild = e.guild?.id ?? null;
        const set = model.Cloth;
        set.undraw();
        set.setLight(cloaksFor(wearer, set));
        if (!set.built) continue;
        const buffs = e.buffs;
        set.shown = model.Ready && !model.OutOfView && e.visibility?.state !== 'hidden' && !buffs?.has(CLOAKING);
        set.held = !!buffs && (buffs.has(STUN) || buffs.has(SLEEP));
        // The cloth's shadow is drawn by every link object's RenderLinkObject (ZzzCharacter.cpp:8433-8446):
        // the wing slot and the Imp outside Chaos Castle, the held weapons anywhere.
        const hands = heldWeapons(e, world.mapIndex) ?? look;
        set.castsShadow =
          (!castle && (!!look.wings || petSpec(look.pet)?.kind === 'imp')) || linked(hands.leftHand) || linked(hands.rightHand);
      }
    },
  };
}

export const ClothSystem: ISystemFactory = clothSystem;
