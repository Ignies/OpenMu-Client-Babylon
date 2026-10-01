import { monsterFactoryFor } from '@versions/shared/monsters/generic_monster';
import {
  FALLBACK_MODEL_TYPE,
  FALLBACK_SCALE,
  MONSTER_HIDDEN_MESH,
  MONSTER_MODEL_TABLE,
} from './monsterModelTable';
import { ModelObject } from '../render/modelObject';
import { Balgass } from '@versions/shared/monsters/balgass';
import { BudgeDragon } from '@versions/shared/monsters/budge_dragon';
import { DeathGorgon } from '@versions/shared/monsters/death_gorgon';
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
} from '@versions/shared/monsters/golden_monsters';
import { Hound } from '@versions/shared/monsters/hound';
import { Kundun } from '@versions/shared/monsters/kundun';
import { Selupan } from '@versions/shared/monsters/selupan';
import {
  DeathBone,
  DeathKing,
  EliteSkeleton,
  SkeletonArcher,
  SkeletonWarrior,
} from '@versions/shared/monsters/skeleton_warrior';
import { Spider } from '@versions/shared/monsters/spider';
import { Baz } from '@versions/shared/npcs/baz';
import { ElfSoldier } from '@versions/shared/npcs/elf_soldier';
import { Girl } from '@versions/shared/npcs/girl';
import { GoldenArcher } from '@versions/shared/npcs/golden_archer';
import { Hanzo } from '@versions/shared/npcs/hanzo';
import { HiddenNpc } from '@versions/shared/npcs/hidden_npc';
import { Leo } from '@versions/shared/npcs/leo';
import { Lumen } from '@versions/shared/npcs/lumen';
import { Alex, Harold, Martin } from '@versions/shared/npcs/man';
import { Pasi } from '@versions/shared/npcs/pasi';
import { PlateNpc } from '@versions/shared/npcs/plate_npc';
import { Trainer } from '@versions/shared/npcs/trainer';
import { Zyro } from '@versions/shared/npcs/zyro';
import { npcFactoryFor } from '@versions/shared/npcs/generic_npc';
import { gearedNpcFactory } from '@versions/shared/npcs/geared_npc';
import { TRAP_MODEL_TABLE, trapFactoryFor } from '@versions/shared/npcs/trap_npc';
import { transformedNpcFactory } from '@versions/shared/npcs/transformed_npc';
import {
  GEARED_NPC_TABLE,
  TRANSFORMED_NPC_TABLE,
} from './playerNpcTables';
import { NPC_MODEL_TABLE } from './npcModelTable';
import { Archangel, ArchangelMessenger } from '@versions/shared/npcs/archangel';
import { CastleGate, StatueOfSaint } from '@versions/shared/monsters/blood_castle_gate';

export const ModelFactoryPerId: Record<number, typeof ModelObject> = {
  [226]: Trainer,
  [230]: Alex,
  // The Blood Castle archangels: bright pass, halo, feathers.
  [232]: Archangel,
  [233]: ArchangelMessenger,
  [240]: Baz,
  // 229 Marlon and the two town guards (247, 249) render through
  // GEARED_NPC_TABLE (playerNpcTables.ts): plate set plus a weapon.
  [248]: Martin,
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
  [568]: Zyro,

  [1]: Hound,
  [2]: BudgeDragon,
  [3]: Spider,
  [14]: SkeletonWarrior,
  [15]: SkeletonArcher,
  [16]: EliteSkeleton,
  [55]: DeathKing,
  [56]: DeathBone,
  // Death Gorgon burns; the fire is what the floor light comes from.
  [35]: DeathGorgon,
  [236]: GoldenArcher,

  // The golden invasion line; 44 (Golden Dragon) stays generic - the
  // original gives it no gold pass (ZzzCharacter.cpp:13549-13554).
  [43]: GoldenBudgeDragon,
  [53]: GoldenTitan,
  [54]: GoldenSoldier,
  [78]: GoldenGoblin,
  [79]: GoldenDerkon,
  [80]: GoldenLizardKing,
  [81]: GoldenVepar,
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

  // Blood Castle's two destructibles: the gate in the wall and the crystal
  // statue on the altar (ZzzCharacter.cpp:13407-13425).
  [131]: CastleGate,
  [132]: StatueOfSaint,
  [133]: StatueOfSaint,
  [134]: StatueOfSaint,

  [275]: Kundun,
  [349]: Balgass,
  [459]: Selupan,

  [34]: PlateNpc,

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

  // Before the monster table: a trap's model is the map's, not its own.
  if (TRAP_MODEL_TABLE[typeNumber]) return trapFactoryFor(typeNumber);

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
    TRAP_MODEL_TABLE[typeNumber] !== undefined ||
    MONSTER_MODEL_TABLE[typeNumber] !== undefined ||
    NPC_MODEL_TABLE[typeNumber] !== undefined ||
    GEARED_NPC_TABLE[typeNumber] !== undefined ||
    TRANSFORMED_NPC_TABLE[typeNumber] !== undefined
  );
}
