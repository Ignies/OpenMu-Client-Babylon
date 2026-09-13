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

/** The line a condition draws, or null for an empty slot. */
export function objectiveText(objective: QuestObjective): string | null {
  const name = objective.name;
  const progress = objectiveProgress(objective);

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
