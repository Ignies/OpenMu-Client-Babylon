import { TEXT_COLOR } from './layout';

/** eBuff_SecretPotion1-5 by stat, `eBuffState` numbers (_enum.h): the ids the hero's buffs arrive with. */
const SECRET_POTION = { str: 50, agi: 51, vit: 52, ene: 53, cmd: 54 } as const;

/** The Halloween (35-39), Elite scroll (44-49) and Cherry Blossom (78-80) buffs that print a line magenta. */
const EVENT_BUFFS = {
  damage: [36, 46, 80], // NewUICharacterInfoWindow.cpp:774-787
  defense: [37, 45], // :1024-1031
  hp: [38, 48, 79], // :1129-1142
  mana: [39, 49, 78], // :1203-1216
  wizardry: [36, 47, 80], // :1363-1376
} as const;

export type StatKey = keyof typeof SECRET_POTION;

/** A stat row: orange under its secret potion, else blue while the items add to it (:463-475). */
export function statColour(stat: StatKey, added: number, buffs: readonly number[]): string | undefined {
  if (buffs.includes(SECRET_POTION[stat])) return TEXT_COLOR.secretPotion;
  return added ? TEXT_COLOR.buffed : undefined;
}

/** A detail line: magenta under one of its event buffs, else its own colour. */
export function eventColour(line: keyof typeof EVENT_BUFFS, buffs: readonly number[], base?: string): string | undefined {
  return EVENT_BUFFS[line].some(id => buffs.includes(id)) ? TEXT_COLOR.event : base;
}
