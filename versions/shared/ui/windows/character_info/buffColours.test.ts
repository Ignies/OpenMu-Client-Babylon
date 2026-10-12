import { describe, expect, it } from 'vitest';
import { eventColour, statColour } from './buffColours';
import { TEXT_COLOR } from './layout';

// NewUICharacterInfoWindow.cpp:463-475, :810-821, :1092-1105, :1170-1181, :1506-1520.
describe('the stat rows under a secret potion', () => {
  it('turn orange (255, 120, 0) under their own potion, over the blue of the items', () => {
    expect(TEXT_COLOR.secretPotion).toBe('#ff7800');
    expect(statColour('str', 10, [50])).toBe(TEXT_COLOR.secretPotion);
    expect(statColour('agi', 0, [51])).toBe(TEXT_COLOR.secretPotion);
    expect(statColour('vit', 0, [52])).toBe(TEXT_COLOR.secretPotion);
    expect(statColour('ene', 0, [53])).toBe(TEXT_COLOR.secretPotion);
    expect(statColour('cmd', 0, [54])).toBe(TEXT_COLOR.secretPotion);
  });

  it("keep the items' blue or the plain yellow otherwise", () => {
    expect(statColour('str', 10, [51])).toBe(TEXT_COLOR.buffed);
    expect(statColour('str', 0, [])).toBeUndefined();
  });
});

// The Halloween, Elite scroll and Cherry Blossom buffs print their line magenta (255, 0, 240).
describe('the detail lines under an event buff', () => {
  it('turn magenta under the buffs the original names for each line', () => {
    expect(TEXT_COLOR.event).toBe('#ff00f0');
    for (const id of [36, 46, 80]) expect(eventColour('damage', [id], TEXT_COLOR.buffed)).toBe(TEXT_COLOR.event);
    for (const id of [37, 45]) expect(eventColour('defense', [id])).toBe(TEXT_COLOR.event);
    for (const id of [38, 48, 79]) expect(eventColour('hp', [id])).toBe(TEXT_COLOR.event);
    for (const id of [39, 49, 78]) expect(eventColour('mana', [id])).toBe(TEXT_COLOR.event);
    for (const id of [36, 47, 80]) expect(eventColour('wizardry', [id])).toBe(TEXT_COLOR.event);
    for (const id of [35, 44]) expect(eventColour('attackSpeed', [id])).toBe(TEXT_COLOR.event);
  });

  it("keep the line's own colour under another line's buff", () => {
    expect(eventColour('damage', [47], TEXT_COLOR.buffed)).toBe(TEXT_COLOR.buffed);
    expect(eventColour('wizardry', [46])).toBeUndefined();
  });
});
