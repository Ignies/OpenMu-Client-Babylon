import { OperateBoxObject } from '@/controllers/actors/operateBoxObject';

/** 77: `CreateOperate` alone (GMBattleCastle.cpp:1045-1047), a click target the map still draws. */
export class DrawnOperateObject extends OperateBoxObject {
  Drawn = true;
}

/** 84: the same, and drawn with its shadow outside a siege (GMBattleCastle.cpp:650-677, :1219-1228). */
export class ShadowedOperateObject extends DrawnOperateObject {
  MapShadow = true;
}
