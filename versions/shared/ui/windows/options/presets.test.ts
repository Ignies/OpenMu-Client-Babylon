import { afterEach, describe, expect, it } from 'vitest';
import { GameOptions, defaultGameOption, setGameOption, type GameOptions as GameOptionsType } from '@/controllers/settings';
import { RENDER_SCALE_STEPS } from '@/controllers/render/renderScale';
import { TIER_PRESETS, TIER_PRESET_LABEL_KEYS, activeTierPreset, applyTierPreset } from './presets';

const TOUCHED = [...new Set(TIER_PRESETS.flatMap(p => Object.keys(p)))] as (keyof GameOptionsType)[];

afterEach(() => {
  for (const key of TOUCHED) setGameOption(key, defaultGameOption(key) as never);
  setGameOption('lowPresetApplied', false);
});

describe('the quality presets', () => {
  it('put Low in front of the three tiers', () => {
    expect(TIER_PRESET_LABEL_KEYS).toEqual([
      'options.quality.low',
      'options.quality.classic',
      'options.quality.enhanced',
      'options.quality.ultra',
    ]);
  });

  it('Low turns off what can be turned off and draws at 75%', () => {
    applyTierPreset(TIER_PRESETS[0]);
    expect(activeTierPreset()).toBe(0);
    expect(GameOptions.lightingQuality).toBe(0);
    expect(GameOptions.shadows).toBe(false);
    expect(GameOptions.dynamicLights).toBe(false);
    expect(GameOptions.postProcessing).toBe(false);
    expect(GameOptions.weatherEffects).toBe(false);
    expect(GameOptions.monsterEffects).toBe(false);
    expect(GameOptions.otherSkillEffects).toBe(false);
    expect(GameOptions.otherPlayerAnimations).toBe(false);
    expect(GameOptions.npcAnimations).toBe(false);
    expect(RENDER_SCALE_STEPS[GameOptions.renderScale]).toBe(0.75);
  });

  it('leaving Low gives what only Low touches its default back', () => {
    applyTierPreset(TIER_PRESETS[0]);
    applyTierPreset(TIER_PRESETS[1]);
    expect(activeTierPreset()).toBe(1);
    expect(GameOptions.shadows).toBe(defaultGameOption('shadows'));
    expect(GameOptions.renderScale).toBe(defaultGameOption('renderScale'));
    expect(GameOptions.otherSkillEffects).toBe(true);
  });

  it('leaving Low after a tweak still gives back what Low left, and keeps the tweak', () => {
    applyTierPreset(TIER_PRESETS[0]);
    setGameOption('renderScale', 0);
    expect(activeTierPreset()).toBe(-1);
    applyTierPreset(TIER_PRESETS[1]);
    expect(GameOptions.effectLevel).toBe(defaultGameOption('effectLevel'));
    expect(GameOptions.itemEffects).toBe(defaultGameOption('itemEffects'));
    expect(GameOptions.otherGearEffects).toBe(true);
    expect(GameOptions.renderScale).toBe(0);
  });

  it('a tier preset from anywhere else leaves the player own checks alone', () => {
    setGameOption('shadows', false);
    applyTierPreset(TIER_PRESETS[2]);
    expect(activeTierPreset()).toBe(2);
    expect(GameOptions.shadows).toBe(false);
  });
});
