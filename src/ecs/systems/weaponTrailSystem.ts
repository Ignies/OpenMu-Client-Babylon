import { Vector3 } from '../../libs/babylon/exports';
import type { ISystemFactory } from '../world';
import { effects } from '../../effects';
import { boneLocalPos } from '../../effects/core';
import { weaponBlurFor, type WeaponBlurRow } from '../../common/weaponBlur';
import { heldWeapons } from '../../common/chaosCastleUnit';
import {
  isPlayerAttackAction,
  isPlayerSkillAction,
} from '../../common/playerActionMapper';
import { PVP_MURDERER2, PVP_NEUTRAL } from '../../common/nameTags';
import { tierIndex } from '../../common/lightingQuality';
import { lighting } from '../../lighting';

/** The first lighting tier that draws the improved looks (common/skillVisuals.ts). */
const ENHANCED_TIER = 1;
const swingTmp = new Vector3();

/**
 * `CreateWeaponBlur` (ZzzCharacter.cpp:3656, called from MoveCharacterVisual
 * :5212 every tick): while a character is in a swing clip and past its third
 * key, the two ends of the blade are sampled from the weapon's hand bone and
 * drawn as one strip. Here the sampling is the `blur` primitive's; this
 * system is the **consumer** that notices a clip (re)start (`actionSerial`,
 * the way CombatSfxSystem does for sounds), looks the swing up in
 * `common/weaponBlur.ts` and spawns the trail once the clip reaches the
 * start key. The trail ends itself when the clip does or is replaced.
 *
 * Per frame: one integer compare per character, one `actionFrame()` for a
 * character whose swing has not yet reached its start key. No allocation
 * outside the spawn itself (once per swing).
 */

type Swing = {
  serial: number;
  row: WeaponBlurRow | null;
  spawned: boolean;
};

export const WeaponTrailSystem: ISystemFactory = world => {
  const query = world.with('modelObject', 'transform', 'playerAnimation');
  const swings = new WeakMap<object, Swing>();

  return {
    update: () => {
      for (const e of query) {
        const model = e.modelObject;
        let swing = swings.get(model);
        if (!swing) {
          swing = { serial: model.actionSerial, row: null, spawned: true };
          swings.set(model, swing);
          continue; // the pose it was first seen in is not a swing start
        }
        const serial = model.actionSerial;
        if (swing.serial !== serial) {
          swing.serial = serial;
          swing.spawned = false;
          const action = model.CurrentAction;
          swing.row =
            isPlayerAttackAction(action) || isPlayerSkillAction(action)
              ? weaponBlurFor(heldWeapons(e, world.mapIndex), action, (e.heroState ?? PVP_NEUTRAL) >= PVP_MURDERER2)
              : null;
        }
        const row = swing.row;
        if (!row || swing.spawned) continue;
        if (!model.Ready || model.OutOfView || !model.gltf?.skeleton) continue;
        if (model.actionFrame() < row.startKey) continue;

        swing.spawned = true;
        const hiltLocal = new Vector3(0, -row.hilt, 0);
        const tipLocal = new Vector3(0, -row.tip, 0);
        const entity = e;
        const bone = row.bone;
        const endKey = row.endKey;
        effects.spawn('blur', world.scene, Vector3.Zero(), {
          follow: out => boneLocalPos(entity, bone, tipLocal, out),
          base: out => boneLocalPos(entity, bone, hiltLocal, out),
          texture: row.texture,
          colour: row.colour,
          blend: row.blend,
          tickHistory: true,
          seconds: model.getActionDuration(model.CurrentAction) || undefined,
          until: () =>
            model.actionSerial !== serial ||
            model.ActionIterationWasFinished ||
            model.actionFrame() > endKey,
        });
        // Graded tiers: a bright trail's blade tip carries a soft light through the swing.
        if (row.blend === 'add' && tierIndex() >= ENHANCED_TIER) {
          lighting.skillSpot(world.scene, 0, row.colour[1] < 0.5 ? 'swingRed' : 'swing', out => {
            const p = boneLocalPos(entity, bone, tipLocal, swingTmp);
            out.x = p.x;
            out.y = p.y;
            out.z = p.z;
          });
        }
      }
    },
  };
};
