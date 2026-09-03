import { monsterFactoryFor } from './monsters/genericMonster';
import {
  FALLBACK_MODEL_TYPE,
  FALLBACK_SCALE,
  MONSTER_HIDDEN_MESH,
  MONSTER_MODEL_TABLE,
} from './monsters/monsterModelTable';
import { ModelObject } from './modelObject';
import { Balgass } from './monsters/balgass';
import { BudgeDragon } from './monsters/budgeDragon';
import {
  GoldenBudgeDragon,
  GoldenCrust,
  GoldenDarkKnight,
  GoldenDerkon,
  GoldenDevil,
  GoldenGoblin,
  GoldenIronKnight,
  GoldenLizardKing,
  GoldenNapin,
  GoldenRabbit,
  GoldenSatyros,
  GoldenSoldier,
  GoldenStoneGolem,
  GoldenTantallos,
  GoldenTitan,
  GoldenTwinTail,
  GoldenVepar,
  GoldenWheel,
  GreatGoldenDragon,
} from './monsters/goldenMonsters';
import { Hound } from './monsters/hound';
import { Kundun } from './monsters/kundun';
import { Selupan } from './monsters/selupan';
import {
  DeathBone,
  DeathKing,
  EliteSkeleton,
  SkeletonArcher,
  SkeletonWarrior,
} from './monsters/skeletonWarrior';
import { Spider } from './monsters/spider';
import { Baz } from './npcs/baz';
import { BerdyshGuard } from './npcs/berdyshGuard';
import { CrossbowGuard } from './npcs/crossbowGuard';
import { ElfSoldier } from './npcs/elfSoldier';
import { Girl } from './npcs/girl';
import { GoldenArcher } from './npcs/goldenArcher';
import { Hanzo } from './npcs/hanzo';
import { HiddenNpc } from './npcs/hiddenNpc';
import { Leo } from './npcs/leo';
import { Lumen } from './npcs/lumen';
import { Alex, Harold, Martin } from './npcs/man';
import { Pasi } from './npcs/pasi';
import { PlateNpc } from './npcs/plateNpc';
import { Trainer } from './npcs/trainer';
import { Zyro } from './npcs/zyro';
import { npcFactoryFor } from './npcs/genericNpc';
import { gearedNpcFactory } from './npcs/gearedNpc';
import { transformedNpcFactory } from './npcs/transformedNpc';
import {
  GEARED_NPC_TABLE,
  TRANSFORMED_NPC_TABLE,
} from './npcs/playerNpcTables';
import { NPC_MODEL_TABLE } from './npcs/npcModelTable';

export const ModelFactoryPerId: Record<number, typeof ModelObject> = {
  [226]: Trainer,
  [230]: Alex,
  [240]: Baz,
  [247]: CrossbowGuard,
  [248]: Martin,
  [249]: BerdyshGuard,
  [250]: Harold,
  [251]: Hanzo,
  [253]: Girl,
  [254]: Pasi,
  [255]: Lumen,
  [257]: ElfSoldier,
  // Luke (258), Leo (371) and Ellen (414) are one case in the original
  // (ZzzCharacter.cpp:14327-14340): a player rig in the plate set.
  [258]: PlateNpc,
  [371]: Leo,
  [414]: PlateNpc,
  // 375 Chaos Card Master renders through GEARED_NPC_TABLE (playerNpcTables.ts).
  [543]: ElfSoldier,
  [568]: Zyro,

  [1]: Hound,
  [2]: BudgeDragon,
  [3]: Spider,
  [14]: SkeletonWarrior,
  [15]: SkeletonArcher,
  [16]: EliteSkeleton,
  [55]: DeathKing,
  [56]: DeathBone,
  [236]: GoldenArcher,

  // The golden invasion line; 44 (Golden Dragon) stays generic - the
  // original gives it no gold pass (ZzzCharacter.cpp:13549-13554).
  [43]: GoldenBudgeDragon,
  [53]: GoldenTitan,
  [54]: GoldenSoldier,
  [78]: GoldenGoblin,
  [79]: GoldenDerkon,
  [80]: GoldenVepar,
  [81]: GoldenLizardKing,
  [82]: GoldenTantallos,
  [83]: GoldenWheel,
  [493]: GoldenDarkKnight,
  [494]: GoldenDevil,
  [495]: GoldenStoneGolem,
  [496]: GoldenCrust,
  [497]: GoldenSatyros,
  [498]: GoldenTwinTail,
  [499]: GoldenIronKnight,
  [500]: GoldenNapin,
  [501]: GreatGoldenDragon,
  [502]: GoldenRabbit,

  [275]: Kundun,
  [349]: Balgass,
  [459]: Selupan,

  [34]: PlateNpc,
  [229]: PlateNpc,

  // The Crywolf altars are spawned but never drawn outside the event.
  [205]: HiddenNpc,
  [206]: HiddenNpc,
  [207]: HiddenNpc,
  [208]: HiddenNpc,
  [209]: HiddenNpc,
};

export function resolveModelFactory(typeNumber: number): typeof ModelObject {
  const explicit = ModelFactoryPerId[typeNumber];
  if (explicit) return explicit;

  const monster = MONSTER_MODEL_TABLE[typeNumber];
  if (monster) {
    return monsterFactoryFor(
      monster[0],
      monster[1],
      MONSTER_HIDDEN_MESH[typeNumber] ?? -1
    );
  }

  const npc = NPC_MODEL_TABLE[typeNumber];
  if (npc) return npcFactoryFor(npc[0], npc[1]);

  const gear = GEARED_NPC_TABLE[typeNumber];
  if (gear) return gearedNpcFactory(gear);

  const transformed = TRANSFORMED_NPC_TABLE[typeNumber];
  if (transformed) return transformedNpcFactory(...transformed);

  return monsterFactoryFor(FALLBACK_MODEL_TYPE, FALLBACK_SCALE);
}

export function isKnownObjectType(typeNumber: number): boolean {
  return (
    ModelFactoryPerId[typeNumber] !== undefined ||
    MONSTER_MODEL_TABLE[typeNumber] !== undefined ||
    NPC_MODEL_TABLE[typeNumber] !== undefined ||
    GEARED_NPC_TABLE[typeNumber] !== undefined ||
    TRANSFORMED_NPC_TABLE[typeNumber] !== undefined
  );
}
