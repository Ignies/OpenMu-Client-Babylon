import { Quaternion, type Scene } from '../render/babylon/exports';
import type { Item } from '../../ecs/world';
import { angleMatrixQuaternion } from '../render/renderAngles';
import { iconShots, type IconShotJob } from '../render/iconShot';
import { loadItemModel } from './itemModel';
import { isTwoHanded } from './weaponClass';
import { itemVisualTier } from '../item_fx/itemVisualTier';
import {
  ITEM_ICON_SCALE,
  ITEM_ICON_SCALE_DEFAULT,
  itemIconPose,
  type LiveItemIconSource,
  type LiveItemSpinSource,
} from '../interface/item_icons';
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
/** `if (1 == Select) ObjectSelect.Angle[1] = WorldTime * 0.45f` (ZzzInventory.cpp:8856-8859): degrees a millisecond. */
const HOVER_SPIN = 0.45;

/** The shot of `item`'s icon, or null when it has no model (Gladiator's Glory, 13/95). */
export function itemIconJob(scene: Scene, item: Item): IconShotJob | null {
  const def = ItemsDatabase.getItem(item.group, item.num);
  if (!def?.szModelName.endsWith('.glb')) return null;
  const key = `${item.group}_${item.num}`;
  const pose = itemIconPose(item.group, item.num, item.lvl ?? 0, isTwoHanded(item));
  const file = pose.model?.file ?? def.szModelFolder + def.szModelName;
  const scale = pose.model?.scale ?? ITEM_ICON_SCALE[key] ?? ITEM_ICON_SCALE_DEFAULT;
  const width = (def.X || 1) * SQUARE;
  const height = (def.Y || 1) * SQUARE;
  const unit = ITEM_ICON_UNITS_PER_PIXEL * M;
  const { angle, offset, anchor } = pose;
  let turned: Quaternion | null = null;

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
      const object = await loadItemModel(scene, root, item.group, item.num, file, pose.bodyHeight * M);
      // MU eye space (x right, y up, the item 200 units out) on the root's Babylon x, z, y: the
      // anchor in the squares (RenderItem3D), then RenderObjectScreen's offset.
      const node = object.node;
      node.position.set(anchor[0] * width * unit + offset[0] * M, (offset[2] - DEPTH) * M, -anchor[1] * height * unit + offset[1] * M);
      node.rotationQuaternion = angleMatrixQuaternion(angle[0] * DEG, angle[1] * DEG, angle[2] * DEG, new Quaternion());
      turned = node.rotationQuaternion;
      node.scaling.setAll(scale);
      // Drawn at its level and options, as worn (RenderPartObject, ZzzInventory.cpp:9699).
      const tier = itemVisualTier(item);
      for (const mesh of object.getMeshes(true)) {
        mesh.metadata ??= {};
        mesh.metadata.itemTier = tier.active ? tier : null;
        mesh.metadata.itemLvl = tier.level;
        mesh.metadata.isExcellent = tier.isExcellent;
      }
      return object;
    },
    // The hovered item: its second angle replaced by the clock, the others kept.
    turn: ms => {
      if (turned) angleMatrixQuaternion(angle[0] * DEG, ((ms * HOVER_SPIN) % 360) * DEG, angle[2] * DEG, turned);
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

/** What fills the interface's spin slot: the hovered item turned on its canvas every frame. */
export function liveItemSpinSource(scene: Scene): LiveItemSpinSource {
  return (item, canvas, ready) => {
    const job = itemIconJob(scene, item);
    const context = job && canvas.getContext('2d');
    if (!job || !context) return () => {};
    const { width, height } = job.view;
    canvas.width = width;
    canvas.height = height;
    let image: ImageData | null = null;
    return iconShots(scene).spin(job, pixels => {
      // The spin hands the same buffer every frame: one ImageData over it.
      if (!image) {
        image = new ImageData(pixels, width, height);
        ready();
      }
      context.putImageData(image, 0, 0);
    });
  };
}
