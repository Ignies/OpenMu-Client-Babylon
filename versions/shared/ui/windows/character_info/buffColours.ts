import { TEXT_COLOR } from './layout';

/** eBuff_SecretPotion1-5 by stat, `eBuffState` numbers (_enum.h): the ids the hero's buffs arrive with. */
const SECRET_POTION = { str: 50, agi: 51, vit: 52, ene: 53, cmd: 54 } as const;

/** The Halloween (35-39), Elite scroll (44-49) and Cherry Blossom (78-80) buffs that print a line magenta. */
const EVENT_BUFFS = {
  damage: [36, 46, 80], // NewUICharacterInfoWindow.cpp:774-787
  defense: [37, 45], // :1024-1031
  attackSpeed: [35, 44], // :1048-1056
  hp: [38, 48, 79], // :1129-1142
  mana: [39, 49, 78], // :1203-1216
  wizardry: [36, 47, 80], // :1363-1376
} as const;

/** The Rage Fighter's party buffs, eBuff_Hp_up_Ourforces and eBuff_Def_up_Ourforces (_enum.h:4019-4020). */
const HP_UP_OURFORCES = 130;
const DEF_UP_OURFORCES = 131;

export type StatKey = keyof typeof SECRET_POTION;

/** A stat row: orange under its secret potion, else blue while the items add to it (:463-475) or, vitality, under the party buff (:1096). */
export function statColour(stat: StatKey, added: number, buffs: readonly number[]): string | undefined {
  if (buffs.includes(SECRET_POTION[stat])) return TEXT_COLOR.secretPotion;
  return added || (stat === 'vit' && buffs.includes(HP_UP_OURFORCES)) ? TEXT_COLOR.buffed : undefined;
}

/** The defense line: blue under the party buff, set after the event magenta (:1024-1035). */
export function defenseColour(buffs: readonly number[]): string | undefined {
  return buffs.includes(DEF_UP_OURFORCES) ? TEXT_COLOR.buffed : eventColour('defense', buffs);
}

/** A detail line: magenta under one of its event buffs, else its own colour. */
export function eventColour(line: keyof typeof EVENT_BUFFS, buffs: readonly number[], base?: string): string | undefined {
  return EVENT_BUFFS[line].some(id => buffs.includes(id)) ? TEXT_COLOR.event : base;
}
