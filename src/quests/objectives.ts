/**
 * One condition of a quest as a record, and the single line it draws.
 *
 * `CQuestMng::GetRequestRewardText` (QuestMng.cpp) builds that line inside
 * the window that shows it; here it is a pure function of the record so the
 * quest log window and the HUD tracker print the same words for the same
 * condition, and so it can be tested without a packet.
 *
 * The names are resolved by whoever builds the record (`questLog.ts` for the
 * Season 6 quests, `legacyQuests.ts` for the Scroll of Emperor chain), out of
 * the same databases the windows read.
 */
import { t } from '../i18n';
import { ConditionTypeEnum } from '../common/packets/ServerToClientPackets';

/** A condition of a running quest: what to do and how far along it is. */
export type QuestObjective = {
  /** `ConditionTypeEnum`, as the `QuestProgress` / `QuestState` packet carries it. */
  type: number;
  /** `RequirementId`: the monster type, skill number or NPC type. */
  id: number;
  /** `RequiredCount`. */
  required: number;
  /** `CurrentCount`. */
  current: number;
  /** The monster or item the condition names, through the language pack; empty when it names none. */
  name: string;
};

/** Whether this condition is satisfied. */
export function objectiveDone(objective: QuestObjective): boolean {
  return objective.current >= objective.required;
}

/** `x / y`, clamped at the target the way the original prints it. */
export function objectiveProgress(objective: QuestObjective): string {
  return `${Math.min(objective.current, objective.required)} / ${objective.required}`;
}

/** Conditions whose line carries no `x / y` count. */
const UNCOUNTED: ReadonlySet<number> = new Set([
  ConditionTypeEnum.None,
  ConditionTypeEnum.Level,
  ConditionTypeEnum.Money,
  ConditionTypeEnum.Skill,
  ConditionTypeEnum.ClientAction,
  ConditionTypeEnum.RequestBuff,
  ConditionTypeEnum.BloodCastleGate,
  ConditionTypeEnum.WinBloodCastle,
  ConditionTypeEnum.WinChaosCastle,
  ConditionTypeEnum.WinDevilSquare,
  ConditionTypeEnum.WinIllusionTemple,
  ConditionTypeEnum.NpcTalk,
]);

/** Whether the condition's line has a count in it. */
export function objectiveCounted(objective: QuestObjective): boolean {
  return !UNCOUNTED.has(objective.type);
}

/**
 * The line a condition draws, or null for an empty slot. Pass `progress` as
 * '' to leave the count out, for a reader that prints it on its own line.
 */
export function objectiveText(
  objective: QuestObjective,
  progress = objectiveProgress(objective)
): string | null {
  return conditionLine(objective, progress)?.trim() ?? null;
}

function conditionLine(objective: QuestObjective, progress: string): string | null {
  const name = objective.name;

  switch (objective.type) {
    case ConditionTypeEnum.None:
      return null;
    case ConditionTypeEnum.MonsterKills:
      return t('quest.req.hunt', { name, progress });
    case ConditionTypeEnum.Item:
      return t('quest.req.bring', { name, progress });
    case ConditionTypeEnum.Level:
      return t('quest.req.level', { level: objective.required });
    case ConditionTypeEnum.Money:
      return t('quest.req.money', { amount: objective.required.toLocaleString() });
    case ConditionTypeEnum.Skill:
      return t('quest.req.skill', { id: objective.id });
    case ConditionTypeEnum.ClientAction:
      return t('quest.req.tutorial');
    case ConditionTypeEnum.RequestBuff:
      return t('quest.req.buff');
    case ConditionTypeEnum.EventMapPlayerKills:
    case ConditionTypeEnum.EventMapMonsterKills:
      return t('quest.req.eventKills', { progress });
    case ConditionTypeEnum.BloodCastleGate:
      return t('quest.req.bloodCastleGate');
    case ConditionTypeEnum.WinBloodCastle:
      return t('quest.req.bloodCastle');
    case ConditionTypeEnum.WinChaosCastle:
      return t('quest.req.chaosCastle');
    case ConditionTypeEnum.WinDevilSquare:
      return t('quest.req.devilSquare');
    case ConditionTypeEnum.WinIllusionTemple:
      return t('quest.req.illusionTemple');
    case ConditionTypeEnum.DevilSquarePoints:
      return t('quest.req.devilSquarePoints', { progress });
    case ConditionTypeEnum.PvpPoints:
      return t('quest.req.pvpPoints', { progress });
    case ConditionTypeEnum.NpcTalk:
      return t('quest.req.talk', { name });
    default:
      return t('quest.req.other', { type: objective.type, progress });
  }
}
