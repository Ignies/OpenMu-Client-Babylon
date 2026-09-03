import { textTable, type TextKey } from '../i18n';
import { CharacterClassNumber } from '../common/types';

/**
 * Pure data shared by the event entries: the original's `GlobalText` lines
 * (read out of `Data/Local/Eng/Text_Eng_decrypted.bmd`, index in the comment)
 * and the tiny `%d` / `%s` formatter the C++ `mu_swprintf` calls reduce to.
 * No state lives here.
 */

/** `mu_swprintf`: `%d`, `%s`, `%lu` and `%%` in order of appearance. */
export function formatText(template: string, ...args: (string | number)[]): string {
  let i = 0;
  return template.replace(/%(%|l?[dsu])/g, (_m, spec: string) => {
    if (spec === '%') return '%';
    const arg = args[i++];
    return arg === undefined ? '' : String(arg);
  });
}

/**
 * The event windows' lines, live: every field is a getter over `t()`, so the
 * shape and every call site are unchanged and the text follows Options →
 * Language. The comments keep the original `GlobalText` indices.
 */
export const EVENT_TEXT = textTable({
  /** GlobalText[39] / [56] / [57]. */
  devilSquare: 'event.devilSquare',
  bloodCastle: 'event.bloodCastle',
  chaosCastle: 'event.chaosCastle',
  /** GlobalText[1146] / [1147]: the names the `%s` messages take. */
  bloodCastleZone: 'event.bloodCastle',
  chaosCastleZone: 'event.chaosCastle',
  /** GlobalText[423]. */
  shortOfZen: 'event.shortOfZen',
  /** GlobalText[1002]. */
  close: 'common.close',

  // ---- Devil Square (NewUIEnterDevilSquare.cpp) ---------------------------
  /** GlobalText[645] / [1778]. */
  squareButton: 'event.squareButton',
  squareButtonMaster: 'event.squareButtonMaster',
  /** GlobalText[640..642]: the 30 s countdown line, `%d` seconds left. */
  devilEnterStart: 'event.devilEnterStart',
  devilEnterClose: 'event.devilEnterClose',
  devilClose: 'event.devilClose',
  /** GlobalText[643] / [644]: `ReceiveEventZoneOpenTime`, Value 1. */
  devilOpenNow: 'event.devilOpenNow',
  devilOpensIn: 'event.devilOpensIn',
  /** GlobalText[677..679], [686], [687]: `ReceiveMoveToDevilSquareResult`. */
  devilBringInvitation: 'event.devilBringInvitation',
  devilTooLate: 'event.devilTooLate',
  devilFull: 'event.devilFull',
  levelTooHigh: 'event.levelTooHigh',
  levelTooLow: 'event.levelTooLow',
  /** GlobalText[2043]. */
  killersRestricted: 'event.killersRestricted',
  /** GlobalText[647] / [648]. */
  congratulations: 'event.congratulations',
  braveryProven: 'event.braveryProven',

  // ---- Blood Castle (NewUIBloodCastleEnter.cpp, NewUIBloodCastleTime.cpp) -
  /** GlobalText[846] / [832]. */
  archangelMessenger: 'event.archangelMessenger',
  bloodCastleIntro: 'event.bloodCastleIntro',
  /** GlobalText[847] / [1779]. */
  castleButton: 'event.castleButton',
  castleButtonMaster: 'event.castleButtonMaster',
  /** GlobalText[850..854], [867]: `ReceiveMoveToEventMatchResult`. */
  enterNow: 'event.enterNow',
  enterAfterMinutes: 'event.enterAfterMinutes',
  timePassed: 'event.timePassed',
  capacityReached: 'event.capacityReached',
  cloakLevelWrong: 'event.cloakLevelWrong',
  timesPerDay: 'event.timesPerDay',
  /** GlobalText[824..828]: the 30 s countdown line, `%s` zone, `%d` seconds. */
  zoneClosing: 'event.zoneClosing',
  zoneInfiltration: 'event.zoneInfiltration',
  zoneEventEnds: 'event.zoneEventEnds',
  zoneShutsDown: 'event.zoneShutsDown',
  zonePenetration: 'event.zonePenetration',
  /** GlobalText[864..866]: the timer frame. */
  monsterCount: 'event.monsterCount',
  timeLeft: 'event.timeLeft',
  skeletonCount: 'event.skeletonCount',
  /** GlobalText[857..863]: the result box. */
  bcQuestDone: 'event.bcQuestDone',
  bcCongrats: 'event.bcCongrats',
  bcQuestFailed: 'event.bcQuestFailed',
  bcUnfortunately: 'event.bcUnfortunately',
  rewardedExp: 'event.rewardedExp',
  rewardedZen: 'event.rewardedZen',
  bloodCastlePoint: 'event.bloodCastlePoint',
  // OpenMU answers a Chaos Castle with the Blood Castle score packet (B16): the
  // same six lines, worded for the castle the hero is standing in.
  ccQuestDone: 'event.ccQuestDone',
  ccQuestFailed: 'event.ccQuestFailed',
  chaosCastlePoint: 'event.chaosCastlePoint',

  // ---- Chaos Castle (CSChaosCastle.cpp, NewUIChaosCastleTime.cpp) ---------
  /** GlobalText[1151..1153], [1156], [1161..1164]. */
  ccSpiritPurified: 'event.ccSpiritPurified',
  ccTheQuest: 'event.ccTheQuest',
  ccTryAgain: 'event.ccTryAgain',
  ccEntered: 'event.ccEntered',
  characterCount: 'event.characterCount',
  monsterKills: 'event.monsterKills',
  playerKills: 'event.playerKills',
  /**
   * GlobalText[1164]: the hour prefix `WSclient.cpp:8234` puts in front of
   * GlobalText[851] ("After %d minutes you may enter %s.") when the Chaos
   * Castle opens in an hour or more. The original prints it even for
   * `Hour == 0` ("when 0 After 30 minutes ..."); we drop it under an hour.
   */
  whenHour: 'event.whenHour',

  // ---- Doppelganger (NewUIDoppelGangerWindow.cpp) -------------------------
  /** GlobalText[2756..2762], [1593], [2164]. */
  lugard: 'event.lugard',
  dgIntro1: 'event.dgIntro1',
  dgIntro2: 'event.dgIntro2',
  dgIntro3: 'event.dgIntro3',
  dgMirror: 'event.dgMirror',
  dgEntryTime: 'event.dgEntryTime',
  dgEnterNow: 'event.dgEnterNow',
  dgEnterAfter: 'event.dgEnterAfter',
  enter: 'event.enter',
});

/** GlobalText[670..675]: the six lines under the Devil Square title. */
export const DEVIL_SQUARE_INTRO_KEYS: readonly TextKey[] = [
  'event.devilIntro1',
  'event.devilIntro2',
  'event.devilIntro3',
  'event.devilIntro4',
  'event.devilIntro5',
  'event.devilIntro6',
];

/** GlobalText[680..685]: the rank table headers. */
export const RANK_HEADERS = textTable({
  rank: 'event.rank.rank',
  character: 'event.rank.character',
  point: 'event.rank.point',
  exp: 'event.rank.exp',
  reward: 'event.rank.reward',
  myInfo: 'event.rank.myInfo',
});

// ---- Entry windows (NewUIEnterDevilSquare.cpp / NewUIBloodCastleEnter.cpp) -

/** One row of `m_i*LimitLevel`: inclusive level range of a grade. */
export type LevelRange = readonly [min: number, max: number];

/**
 * The two rows of `m_iDevilSquareLimitLevel`: row 0 for every class, row 1
 * (`iLimitLVIndex = 1`) for Knights, Dark Lords and Rage Fighters. Six squares
 * plus the master square, which has no level range.
 */
export const DEVIL_SQUARE_LEVELS: readonly (readonly LevelRange[])[] = [
  [[15, 130], [131, 180], [181, 230], [231, 280], [281, 330], [331, 400]],
  [[15, 110], [111, 160], [161, 210], [211, 260], [261, 310], [311, 400]],
];

/** `m_iBloodCastleLimitLevel`, same two rows; seven castles plus master. */
export const BLOOD_CASTLE_LEVELS: readonly (readonly LevelRange[])[] = [
  [[15, 80], [81, 130], [131, 180], [181, 230], [231, 280], [281, 330], [331, 400]],
  [[10, 60], [61, 110], [111, 160], [161, 210], [211, 260], [261, 310], [311, 400]],
];

/** One enter button of an entry window (`m_BtnEnter[i]`). */
export type EntryButton = { readonly label: string; readonly enabled: boolean };

/**
 * `CheckLimitLV` + `OpenningProcess`: every button of the window, with the
 * one grade the hero's level falls into unlocked — or the master button
 * when the hero is a master class, whatever the level. Returns the buttons
 * and the unlocked index (-1 when no grade fits).
 */
export function entryButtons(
  table: readonly (readonly LevelRange[])[],
  row: number,
  level: number,
  master: boolean,
  labelFormat: string,
  masterFormat: string,
  masterNumber: number
): { buttons: EntryButton[]; active: number } {
  const ranges = table[row] ?? table[0]!;
  let active = -1;

  if (master) {
    active = ranges.length;
  } else {
    active = ranges.findIndex(([min, max]) => level >= min && level <= max);
  }

  const buttons: EntryButton[] = ranges.map(([min, max], i) => ({
    label: formatText(labelFormat, i + 1, min, max),
    enabled: i === active,
  }));
  buttons.push({
    label: formatText(masterFormat, masterNumber),
    enabled: active === ranges.length,
  });

  return { buttons, active };
}

/** Ticket items (`ITEM_DEVILS_INVITATION`, `ITEM_INVISIBILITY_CLOAK`, `ITEM_HELPER+29`). */
export const TICKETS = {
  devilInvitation: { group: 14, num: 19 },
  invisibilityCloak: { group: 13, num: 18 },
  armorOfGuardsman: { group: 13, num: 29 },
} as const;

/** `SendMiniGameOpeningStateRequest` first byte: which event a ticket asks about. */
export const OPENING_STATE_GAME = { devilSquare: 1, bloodCastle: 2, chaosCastle: 4 } as const;

/** `gCharacterManager.IsMasterLevel(Class)`: the third-class characters. */
const MASTER_CLASSES: ReadonlySet<CharacterClassNumber> = new Set([
  CharacterClassNumber.GrandMaster,
  CharacterClassNumber.BladeMaster,
  CharacterClassNumber.HighElf,
  CharacterClassNumber.DuelMaster,
  CharacterClassNumber.LordEmperor,
  CharacterClassNumber.DimensionMaster,
  CharacterClassNumber.FistMaster,
]);

export function isMasterClass(cls: CharacterClassNumber): boolean {
  return MASTER_CLASSES.has(cls);
}
