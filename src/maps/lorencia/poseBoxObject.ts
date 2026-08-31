import { LeanBoxObject } from '../../common/operateBoxObject';

/**
 * Lorencia's "lean on the wall" trigger (MODEL_POSE_BOX, type 133). Clicking
 * it walks to its tile and plays PLAYER_POSE1 facing the box's angle
 * (ZzzInterface.cpp:7662-7679, 3856-3863).
 *
 * Everything but the file name is the shared lean-box recipe. Lorencia is the
 * one map whose Object folder uses names instead of `ObjectNN`, hence the
 * override.
 */
export class PoseBoxObject extends LeanBoxObject {
  protected modelName(): string {
    return 'PoseBox01.glb';
  }
}
