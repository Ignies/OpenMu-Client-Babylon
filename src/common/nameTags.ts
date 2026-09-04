import { GuildMemberRoleEnum } from './packets/ServerToClientPackets';
import { t, type TextKey } from '../i18n';

/**
 * The original's name/chat "balloons" (`CHAT`, ZzzInterface.cpp:703). A
 * character's name is never drawn permanently: `CreateChat(ID, L"", c)` is
 * called while the cursor is on an NPC or player (`CNewUINameWindow::
 * RenderName`, NewUINameWindow.cpp:108-131) and the entry lives for
 * `IDLifeTime` ticks - 100 on creation, then refreshed to 10 every frame the
 * cursor stays. Chat lines (`AddChat`) keep the balloon up for their own
 * lifetime. Everything below is data used by `NameTagSystem` and the
 * `NameTags` overlay.
 *
 * The English strings come from `Data/Local/Eng/Text_Eng_decrypted.bmd`,
 * which is the one text table in this Data copy that is readable.
 */

/** `FPS_ANIMATION_FACTOR` is 1 per 25-fps frame: lifetimes are in ticks. */
export const TICKS_PER_SECOND = 25;

/** `CreateChat`: first hover creates the entry for 100 ticks... */
export const ID_LIFE_CREATE = 100;
/** ...and every later hover refreshes it to 10 (ZzzInterface.cpp:1114/1141). */
export const ID_LIFE_REFRESH = 10;

/** `AddChat` flag 0: speech bubbles (ObjectMessage) last `len * 2 + 160` ticks. */
export function bubbleLifetime(text: string): number {
  return text.length * 2 + 160;
}
/** `AddChat` flag 1: player chat lasts 1000 ticks. */
export const CHAT_LIFETIME = 1000;
/** Lines of 20+ characters are split in two (`CutText`). */
export const CUT_TEXT_LENGTH = 20;

/**
 * `CutText` (ZzzInterface.cpp:605): split at the last space before the
 * middle, else the first after it, else keep everything on the first line.
 * Returns `[top, bottom]`.
 */
export function cutText(text: string): [string, string] {
  const half = Math.floor(text.length / 2);
  let at = text.lastIndexOf(' ', half);
  if (at === -1) at = text.indexOf(' ', half);
  if (at === -1) return [text, ''];
  return [text.slice(0, at), text.slice(at + 1)];
}

/** `SetPlayerColor` (ZzzInterface.cpp:772): the name's text colour by PK byte. */
export const PK_TEXT_COLOURS: Record<number, string> = {
  0: 'rgb(150, 255, 240)', // npc
  1: 'rgb(100, 120, 255)', // PVP_HERO2
  2: 'rgb(140, 180, 255)', // PVP_HERO1
  3: 'rgb(200, 220, 255)', // PVP_NEUTRAL
  4: 'rgb(255, 150, 60)', // PVP_CAUTION
  5: 'rgb(255, 80, 30)', // PVP_MURDERER1
};
export const PK_MURDERER2_COLOUR = 'rgb(255, 0, 0)';

/** `PVP_*` of the original, the values the HeroState byte carries. */
export const PVP_NEUTRAL = 3;
export const PVP_CAUTION = 4;
export const PVP_MURDERER1 = 5;
export const PVP_MURDERER2 = 6;

export function pkTextColour(pk: number): string {
  return PK_TEXT_COLOURS[pk] ?? PK_MURDERER2_COLOUR;
}

const pkState = (name: string, state: TextKey) =>
  t('nameTag.pkState', { name, state: t(state) });

const guildRole = (name: string, role: TextKey) =>
  t('nameTag.guildRole', { name, role: t(role) });

const union = (name: string, word: TextKey) =>
  t('nameTag.union', { name, word: t(word) });

/**
 * `ReceivePK` (WSclient.cpp:6609): a hero-state change is announced in the
 * system log as "<name> : <state>", GlobalText 487-491 ("Hero", "Commoner",
 * "Outlaw Warning", "1st/2nd Stage Outlaw"). State 0 (New) prints nothing;
 * `error` mirrors the original's TYPE_SYSTEM/TYPE_ERROR split.
 */
export function heroStateMessage(
  name: string,
  state: number
): { text: string; error: boolean } | null {
  switch (state) {
    case 1:
    case 2:
      return { text: pkState(name, 'pk.hero'), error: false };
    case PVP_NEUTRAL:
      return { text: pkState(name, 'pk.commoner'), error: true };
    case PVP_CAUTION:
      return { text: pkState(name, 'pk.outlawWarning'), error: false };
    case PVP_MURDERER1:
      return { text: pkState(name, 'pk.outlaw1'), error: true };
    case PVP_MURDERER2:
      return { text: pkState(name, 'pk.outlaw2'), error: true };
    default:
      return null;
  }
}

/**
 * OpenMU has no self-defense packet: `SelfDefensePlugIn.cs` announces begin
 * and end only through a blue ServerMessage built from `PlayerMessage.resx`.
 * Parsed here so the client can keep the state for its 60s default lifetime.
 */
export const SELF_DEFENSE_MS = 60_000;

/**
 * The reference client has no self-defense display; the official client marks
 * the aggressor's name violet to the victim while the state runs.
 */
export const SELF_DEFENSE_COLOUR = 'rgb(255, 110, 255)';

export function parseSelfDefense(
  text: string
): { active: boolean; attacker: string; defender: string } | null {
  let m = /^Self defense is initiated by (.+)'s attack to (.+)!$/.exec(text);
  if (m) return { active: true, attacker: m[1], defender: m[2] };
  m = /^Self defense of (.+) against (.+) diminishes\.$/.exec(text);
  if (m) return { active: false, defender: m[1], attacker: m[2] };
  return null;
}

/** `c->Owner == Hero` (ZzzInterface.cpp:883). */
export const HERO_BG = 'rgba(60, 100, 0, 0.59)';
export const HERO_TEXT = 'rgb(200, 255, 0)';

/**
 * `GR_*` (ZzzCharacter.cpp:12161). The original reads the relationship byte
 * out of its guild-viewport packet; OpenMU's `AssignCharacterToGuild` carries
 * only the guild id and the role, so we derive it from what we do know - the
 * hero's own guild id, the alliance name in `GuildInformation`, the rival
 * name in `GuildList` and the guild we are at war with.
 */
export enum GuildRelation {
  None = 0,
  Union = 1,
  Rival = 2,
}

/**
 * `GetGuildRelationShipTextColor` / `BGColor` (ZzzCharacter.cpp:12161).
 * `SetBgColor(DWORD)` unpacks `r | g << 8 | b << 16 | a << 24`.
 */
export const RELATION_NONE = {
  text: 'rgb(230, 230, 255)',
  bg: 'rgba(10, 30, 50, 0.59)',
};
export const RELATION_RIVAL = {
  text: 'rgb(255, 30, 0)',
  bg: 'rgba(0, 0, 0, 0.59)',
};
/** Same guild / union (GR_UNION and everything that is not rival). */
export const RELATION_UNION = {
  text: 'rgb(200, 255, 0)',
  bg: 'rgba(20, 50, 80, 0.59)',
};

export function relationStyle(relation: GuildRelation): {
  text: string;
  bg: string;
} {
  if (relation === GuildRelation.Rival) return RELATION_RIVAL;
  if (relation === GuildRelation.Union) return RELATION_UNION;
  return RELATION_NONE;
}

/**
 * `bGmMode` (ZzzInterface.cpp:875): a GM's balloon is dark grey, the guild and
 * union lines are pale cyan, the name is drawn bold in a brighter cyan and the
 * chat lines turn gold.
 */
export const GM_BG = 'rgba(30, 30, 30, 0.78)';
export const GM_GUILD_TEXT = 'rgb(200, 255, 255)';
export const GM_NAME_TEXT = 'rgb(100, 250, 250)';
export const GM_CHAT_TEXT = 'rgb(250, 200, 50)';

/** Chat line background by `GuildColor` (`GuildTeam`, WSclient.cpp:221). */
export const CHAT_BG: Record<number, string> = {
  0: 'rgba(10, 30, 50, 0.59)',
  1: 'rgba(30, 50, 0, 0.59)',
};
export const CHAT_BG_OTHER = 'rgba(50, 0, 0, 0.59)';
export const CHAT_TEXT = 'rgb(230, 220, 200)';
/** Ticks left below which a chat line drops to half alpha. */
export const CHAT_FADE_TICKS = 10;

/**
 * `RenderBoolean`, the four-way `GuildColor` branch: 0 nobody in particular,
 * 1 a guild mate, a GM gets the dark grey box and anyone left (the guild we
 * are at war with, team 2) the dark red one.
 */
export function chatLineBg(guildTeam: number, isGm: boolean): string {
  if (guildTeam === 0) return CHAT_BG[0];
  if (guildTeam === 1) return CHAT_BG[1];
  if (isGm) return GM_BG;
  return CHAT_BG_OTHER;
}

/**
 * `AddGuildName` (ZzzInterface.cpp:1065): `[Guild] role`, with GlobalText
 * 1300 "Master" / 1301 "Assist. M." / 1302 "Battle M." and 1330 "Members"
 * for a plain member.
 */
export function guildLine(name: string, role: GuildMemberRoleEnum): string {
  switch (role) {
    case GuildMemberRoleEnum.GuildMaster:
      return guildRole(name, 'guild.role.master');
    case GuildMemberRoleEnum.AssistantMaster:
      return guildRole(name, 'guild.role.assistant');
    case GuildMemberRoleEnum.BattleMaster:
      return guildRole(name, 'guild.role.battleMaster');
    case GuildMemberRoleEnum.NormalMember:
      return guildRole(name, 'guild.role.member');
    default:
      return t('nameTag.guildPlain', { name });
  }
}

/**
 * `AddGuildName` (ZzzInterface.cpp:1039): `<Alliance> word`, where the word is
 * GlobalText 1295 "Alliance" / 1296 "Alliance master" for a friendly union
 * and 1297 "Oppose" / 1298 "Opposing master" / 1299 "Opposing alliance
 * master" for a hostile one. A guild with no relationship prints the bare
 * `<Alliance>`.
 */
export function unionLine(
  allianceName: string,
  relation: GuildRelation,
  isGuildMaster: boolean
): string {
  if (relation === GuildRelation.Union) {
    return union(allianceName, isGuildMaster ? 'guild.allianceMaster' : 'guild.alliance');
  }
  if (relation === GuildRelation.Rival) {
    return union(allianceName, isGuildMaster ? 'guild.opposingMaster' : 'guild.oppose');
  }
  return t('nameTag.unionPlain', { name: allianceName });
}

/** GlobalText 1104: the prefix in front of a personal-store title. */
export const SHOP_TITLE_PREFIX = '[Store] ';

/**
 * `GetShopTitleSummary` (PersonalShopTitleImp.cpp:164): a title longer than
 * 14 characters is cut to 12 and gets `..`. The original counts lead bytes so
 * it never splits a multi-byte character; JS strings are already code points.
 */
export function shopTitleSummary(title: string): string {
  return title.length > 14 ? `${title.slice(0, 12)}..` : title;
}

/**
 * `GetShopTextColor` / `GetShopText2Color` / `GetShopBGColor`
 * (PersonalShopTitleImp.cpp:187-243). "Highlight" is the mouse-over state of
 * the title itself, which we do not have a hit box for, so only the plain
 * colours are ported.
 */
export function shopTitleColours(
  pk: number,
  relation: GuildRelation
): { prefix: string; title: string; bg: string } {
  const hostile = relation === GuildRelation.Rival || pk >= PVP_MURDERER2;
  if (hostile) {
    return {
      prefix: 'rgb(240, 20, 0)',
      title: 'rgb(240, 20, 0)',
      bg: 'rgba(108, 57, 41, 0.5)',
    };
  }
  if (pk === PVP_CAUTION) {
    return {
      prefix: 'rgb(230, 180, 0)',
      title: 'rgb(230, 180, 0)',
      bg: 'rgba(108, 57, 41, 0.5)',
    };
  }
  if (pk === PVP_MURDERER1) {
    return {
      prefix: 'rgb(230, 110, 0)',
      title: 'rgb(230, 110, 0)',
      bg: 'rgba(108, 57, 41, 0.5)',
    };
  }
  return {
    // (255 << 24) + (0 << 16) + (230 << 8) + (230) → r 230, g 230, b 0.
    prefix: 'rgb(230, 230, 0)',
    // (255 << 24) + (0 << 16) + (150 << 8) + (250) → r 250, g 150, b 0.
    title: 'rgb(250, 150, 0)',
    // (128 << 24) + (41 << 16) + (57 << 8) + (108) → r 108, g 57, b 41.
    bg: 'rgba(108, 57, 41, 0.5)',
  };
}
