import { beforeAll, describe, expect, it } from 'vitest';
import { i18n } from '../i18n';
import { ConditionTypeEnum } from '../common/packets/ServerToClientPackets';
import {
  objectiveCounted,
  objectiveDone,
  objectiveProgress,
  objectiveText,
  type QuestObjective,
} from './objectives';

beforeAll(() => i18n.setLanguage('en'));

const objective = (over: Partial<QuestObjective> = {}): QuestObjective => ({
  type: ConditionTypeEnum.MonsterKills,
  id: 3,
  required: 10,
  current: 7,
  name: 'Budge Dragon',
  ...over,
});

describe('quest objectives', () => {
  it('prints a kill count out of its target', () => {
    expect(objectiveText(objective())).toBe('Hunt Budge Dragon  7 / 10');
  });

  it('prints an item to bring the same way', () => {
    const line = objectiveText(
      objective({ type: ConditionTypeEnum.Item, required: 1, current: 0, name: 'Scroll of Emperor' })
    );
    expect(line).toBe('Bring Scroll of Emperor  0 / 1');
  });

  it('leaves the count out for a reader that prints it apart', () => {
    expect(objectiveText(objective(), '')).toBe('Hunt Budge Dragon');
    expect(objectiveCounted(objective())).toBe(true);
    expect(objectiveCounted(objective({ type: ConditionTypeEnum.Level }))).toBe(false);
  });

  it('never counts past the target', () => {
    expect(objectiveProgress(objective({ current: 14 }))).toBe('10 / 10');
  });

  it('is done only once the target is reached', () => {
    expect(objectiveDone(objective({ current: 9 }))).toBe(false);
    expect(objectiveDone(objective({ current: 10 }))).toBe(true);
    expect(objectiveDone(objective({ current: 12 }))).toBe(true);
  });

  it('drops an empty slot', () => {
    expect(objectiveText(objective({ type: ConditionTypeEnum.None }))).toBeNull();
  });

  it('leaves the countless conditions without a count', () => {
    expect(objectiveText(objective({ type: ConditionTypeEnum.Level, required: 50 }))).toBe('Reach level 50');
    // The amount is grouped by the machine's locale, which the runner's is too.
    expect(objectiveText(objective({ type: ConditionTypeEnum.Money, required: 1000 }))).toBe(
      `${(1000).toLocaleString()} Zen`
    );
    expect(objectiveText(objective({ type: ConditionTypeEnum.NpcTalk, name: 'Sebina the Priest' }))).toBe(
      'Talk to Sebina the Priest'
    );
  });

  it('falls back to the condition number it does not know', () => {
    expect(objectiveText(objective({ type: 999, current: 2, required: 4 }))).toBe('Condition 999  2 / 4');
  });
});
