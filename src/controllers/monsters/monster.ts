/** The original client's monster table row (`Monster.txt`), without the number and name. */
export type MonsterStats = {
  Rate: number;
  Level: number;
  HP: number;
  MP: number;
  MinDmg: number;
  MaxDmg: number;
  Def: number;
  MagDef: number;
  AttackSuccess: number;
  Move: number;
  AttType: number;
  Range: number;
  View: number;
  MoveSpeed: number;
  AttSpeed: number;
  Regen: number;
  Attri: number;
  ItemR: number;
  MoneyR: number;
  MaxI: number;
  ResWind: number;
  ResPois: number;
  ResIce: number;
  ResWater: number;
  ResFire: number;
};

/**
 * One monster or NPC type (the number the server sends in `AddNpcsToScope`). See monsters/readme.md.
 * `stats` is the original table's row, absent for types that table does not have.
 */
export type MonsterDef = {
  Numb: number;
  Name: string;
  /** Maximum health, from the server's own definitions (the protocol never sends it). */
  maxHealth?: number;
  /**
   * How it is drawn (`Setting_Monster`, ZzzCharacter.cpp): the monster model (`Monster/Monster<type+1>.glb`),
   * `Object.Scale`, and `Object.HiddenMesh` for types that share a model and hide a mesh.
   */
  model?: { type: number; scale: number; hiddenMesh?: number };
  /** `c->SubType` the original creates this type with (9: Kalima's large centurions, Kundun's candidates). */
  subType?: number;
  stats?: MonsterStats;
};

/** What `get` returns: the table row as it always was, number and name included. */
export type MonsterRow = MonsterStats & { Numb: number; Name: string };

/** A monster file's default export. */
export function defineMonster(monster: MonsterDef): MonsterDef {
  return monster;
}
