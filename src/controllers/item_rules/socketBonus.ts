import type { Item } from '../../ecs/world';
import { itemOptionTables, type ItemOptionTables } from '../assets/mu';
import { isSocketItem, socketBonusOf, socketsOf } from './itemOptions';

/** What a socket value reads: the hero's level plus master level, max life and max mana. */
export type SocketMaxima = { level: number; masterLevel?: number; maxLife?: number; maxMana?: number };

/** `CalcSocketOptionValue` (SocketSystem.cpp:141-180): 1 flat, 2 percent, 3 per level, 4 per max life, 5 per max mana. */
export function socketOptionValue(type: number, value: number, maxima: SocketMaxima): number {
  if (type === 1 || type === 2) return value;
  if (type === 3) return Math.trunc((maxima.level + (maxima.masterLevel ?? 0)) / value);
  if (type === 4) return Math.trunc((maxima.maxLife ?? 0) / value);
  if (type === 5) return Math.trunc((maxima.maxMana ?? 0) / value);
  return 0;
}

/** `SOCKET_OPTION_STATUS_BONUS`; `defenseRate` multiplies the block rate. */
export type SocketStatusBonus = {
  damageMin: number;
  damageMax: number;
  attackSpeed: number;
  defenseRate: number;
  defense: number;
  shieldDefense: number;
  skillDamage: number;
  attackRate: number;
  magicPower: number;
  str: number;
  agi: number;
  vit: number;
  ene: number;
};

type Field = Exclude<keyof SocketStatusBonus, 'defenseRate'>;

/** By `SOPT_*` (SocketSystem.h:33-69): the fields one seed raises. */
const SEED_FIELDS: Readonly<Record<number, readonly Field[]>> = {
  0: ['damageMin', 'damageMax'],
  1: ['attackSpeed'],
  2: ['damageMax'],
  3: ['damageMin'],
  4: ['damageMin', 'damageMax'],
  11: ['defense'],
  12: ['shieldDefense'],
  18: ['skillDamage'],
  19: ['attackRate'],
  34: ['str'],
  35: ['agi'],
  36: ['vit'],
  37: ['ene'],
};
const SOPT_DEFENCE_RATE_BONUS = 10;
/** `MAX_EQUIPMENT`: the worn slots; the bag follows them. */
const MAX_EQUIPMENT = 12;

/** By `SBOPT_*` (SocketSystem.h:77-82): the fields the mix bonus raises. */
const MIX_FIELDS: Readonly<Record<number, readonly Field[]>> = {
  0: ['damageMin', 'damageMax'],
  1: ['skillDamage'],
  2: ['damageMin', 'magicPower'],
  3: ['skillDamage'],
  4: ['defense'],
};

/** `CalcSocketStatusBonus` (SocketSystem.cpp:476-570) over every worn socket item. */
export function socketStatusBonus(worn: readonly (Item | null)[], maxima: SocketMaxima, tables: ItemOptionTables | null = itemOptionTables()): SocketStatusBonus {
  const bonus: SocketStatusBonus = {
    damageMin: 0, damageMax: 0, attackSpeed: 0, defenseRate: 1, defense: 0, shieldDefense: 0,
    skillDamage: 0, attackRate: 0, magicPower: 0, str: 0, agi: 0, vit: 0, ene: 0,
  };
  if (!tables) return bonus;
  for (const item of worn.slice(0, MAX_EQUIPMENT)) {
    if (!item || !isSocketItem(item.group, item.num)) continue;
    for (const socket of socketsOf(item)) {
      const info = socket && tables.sockets[0][socket.seed];
      if (!info) continue;
      const value = socketOptionValue(info.type, info.values[socket.level - 1] ?? 0, maxima);
      if (info.id === SOPT_DEFENCE_RATE_BONUS) bonus.defenseRate *= 1 + value * 0.01;
      for (const field of SEED_FIELDS[info.id] ?? []) bonus[field] += value;
    }
    const mix = socketBonusOf(item);
    const info = mix === null ? null : tables.sockets[1][mix];
    if (!info) continue;
    const value = socketOptionValue(info.type, info.values[0], maxima);
    for (const field of MIX_FIELDS[info.id] ?? []) bonus[field] += value;
  }
  return bonus;
}
