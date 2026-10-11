import { ShadowCasterObject } from '../shared/objectVariants';

/**
 * Blood Castle 28/29, the two statue types: drawn, then shadowed with `HiddenMesh = 2`
 * (`RenderObject`, ZzzObject.cpp:1041-1057).
 */
export class BloodCastleStatueObject extends ShadowCasterObject {
  ShadowHiddenMesh = 2;
}
