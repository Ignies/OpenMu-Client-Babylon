import { ENUM_WORLD } from '../../common';
import {
  MODEL_FURNITURE01,
  MODEL_POSE_BOX,
  MODEL_TREE01,
} from '../../common/objects/enum';

export type RestKind = 'sit' | 'pose' | 'healing';

export interface RestObject {
  kind: RestKind;
  useObjectAngle: boolean;
}

const sit = (useObjectAngle: boolean): RestObject => ({
  kind: 'sit',
  useObjectAngle,
});
const pose = (useObjectAngle: boolean): RestObject => ({
  kind: 'pose',
  useObjectAngle,
});
const healing = (useObjectAngle: boolean): RestObject => ({
  kind: 'healing',
  useObjectAngle,
});

const REST_OBJECTS: Partial<
  Record<ENUM_WORLD, Record<number, RestObject>>
> = {
  [ENUM_WORLD.WD_0LORENCIA]: {
    [MODEL_POSE_BOX]: pose(true),
    [MODEL_TREE01 + 6]: sit(false),
    [MODEL_FURNITURE01 + 5]: sit(true),
    [MODEL_FURNITURE01 + 6]: sit(false),
  },
  [ENUM_WORLD.WD_1DUNGEON]: {
    59: sit(false),
    60: pose(true),
  },
  [ENUM_WORLD.WD_2DEVIAS]: {
    22: sit(true),
    25: sit(true),
    40: sit(true),
    45: sit(false),
    55: sit(true),
    73: sit(false),
    91: pose(true),
  },
  [ENUM_WORLD.WD_3NORIA]: {
    8: sit(false),
    38: healing(true),
  },
  [ENUM_WORLD.WD_7ATLANSE]: {
    39: pose(true),
  },
  [ENUM_WORLD.WD_8TARKAN]: {
    78: sit(false),
  },
  [ENUM_WORLD.WD_30BATTLECASTLE]: {
    84: sit(true),
  },
  [ENUM_WORLD.WD_38KANTURU_2ND]: {
    3: sit(false),
  },
  [ENUM_WORLD.WD_51ELBELAND]: {
    103: sit(true),
  },
  [ENUM_WORLD.WD_79UNITEDMARKETPLACE]: {
    67: pose(true),
  },
};

export function findRestObject(
  map: ENUM_WORLD,
  objectType: number
): RestObject | undefined {
  return REST_OBJECTS[map]?.[objectType];
}
