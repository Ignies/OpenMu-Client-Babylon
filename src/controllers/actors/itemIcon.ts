import { Quaternion, type Scene } from '../render/babylon/exports';
import type { Item, World } from '../../ecs/world';
import { ModelObject } from '../render/modelObject';
import { angleMatrixQuaternion } from '../render/renderAngles';
import { iconShots, type IconShotJob } from '../render/iconShot';
import { loadGLTF } from '../assets/modelLoader';
import { ITEM_ICON_SCALE, ITEM_ICON_SCALE_DEFAULT, type LiveItemIconSource } from '../interface/item_icons';
import { ItemsDatabase } from '@versions/shared/items/itemsDatabase';

/**
 * A bag item's icon drawn from its model the way `RenderItem3D` draws it (ZzzInventory.cpp:9707):
 * the item's squares seen by the original's item camera, the model posed and scaled in them.
 * See actors/readme.md.
 */

/** `INVENTORY_SQUARE_WIDTH` (NewUIInventoryCtrl.h:36): one bag square, in the original's 640 x 480 pixels. */
const SQUARE = 20;
/** Picture pixels per bag square: twice the original's, for a sharp icon on today's screens. */
const PX_PER_SQUARE = 40;
/** `Position = MousePosition + 0.1 (Target - MousePosition)` with Target at RENDER_ITEMVIEW_FAR (ZzzInventory.cpp:7662). */
const DEPTH = 200;
/** World units a bag pixel covers at that depth: a 1 degree view over 480 pixels (NewUI3DRenderMng.cpp:165). */
export const ITEM_ICON_UNITS_PER_PIXEL = (DEPTH * Math.tan(((1 / 2) * Math.PI) / 180)) / (480 / 2);

const DEG = Math.PI / 180;
/** Metres per MU unit: the models and the scene are in metres. */
const M = 1 / 100;

/** The original's pose for a bag item that no branch of RenderObjectScreen names (ZzzInventory.cpp:8322-8325, 10046-10050). */
const DEFAULT_ANGLE = [270, -10, 0] as const;
const DEFAULT_ANCHOR = [0.5, 0.6] as const;

/** The shot of `item`'s icon, or null when it has no model (Gladiator's Glory, 13/95). */
export function itemIconJob(scene: Scene, item: Item): IconShotJob | null {
  const def = ItemsDatabase.getItem(item.group, item.num);
  if (!def?.szModelName.endsWith('.glb')) return null;
  const file = def.szModelFolder + def.szModelName;
  const key = `${item.group}_${item.num}`;
  const width = (def.X || 1) * SQUARE;
  const height = (def.Y || 1) * SQUARE;
  const unit = ITEM_ICON_UNITS_PER_PIXEL * M;
  const scale = ITEM_ICON_SCALE[key] ?? ITEM_ICON_SCALE_DEFAULT;

  return {
    key: `${key}_${item.lvl ?? 0}${item.isExcellent ? '_e' : ''}${item.isAncient ? '_a' : ''}`,
    view: {
      width: (def.X || 1) * PX_PER_SQUARE,
      height: (def.Y || 1) * PX_PER_SQUARE,
      left: 0,
      right: width * unit,
      bottom: -height * unit,
      top: 0,
    },
    build: async root => {
      const object = new ModelObject(scene, root);
      object.FrozenPose = true;
      object.CastsShadow = false;
      try {
        object.load(await loadGLTF(file, { scene } as World));
      } catch (error) {
        object.dispose();
        throw error;
      }
      // MU eye space (x right, y up, the item 200 units out) on the root's Babylon x, z, y.
      const node = object.node;
      node.position.set(DEFAULT_ANCHOR[0] * width * unit, -DEPTH * M, -DEFAULT_ANCHOR[1] * height * unit);
      node.rotationQuaternion = angleMatrixQuaternion(DEFAULT_ANGLE[0] * DEG, DEFAULT_ANGLE[1] * DEG, DEFAULT_ANGLE[2] * DEG, new Quaternion());
      node.scaling.setAll(scale);
      return object;
    },
  };
}

/** What fills the interface's live-icon slot: the scene's shot queue, one picture per look. */
export function liveItemIconSource(scene: Scene): LiveItemIconSource {
  return async item => {
    const job = itemIconJob(scene, item);
    return job ? iconShots(scene).shoot(job) : null;
  };
}
