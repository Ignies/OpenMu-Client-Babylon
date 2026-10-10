import { describe, expect, it } from 'vitest';
import { stageMarginLeft, tipPlace } from './layout';

// The stage scales from its top-left corner: centring it takes half the scaled width.
describe('stageMarginLeft', () => {
  it('centres the sheet at any scale', () => {
    expect(stageMarginLeft(1)).toBe(-320);
    expect(stageMarginLeft(2)).toBe(-640);
  });
});

// RenderTipTextList(CalcX + 8, CalcY + 33, ...) (NewUIMasterLevel.cpp:795-801), drawn inside the
// node, which already stands at (CalcX, CalcY).
describe('tipPlace', () => {
  it('puts the tip under the icon, relative to its node', () => {
    expect(tipPlace(200)).toEqual({ left: 8, top: 33, up: false });
  });

  it('turns it upward past y 300', () => {
    expect(tipPlace(301)).toEqual({ left: 8, top: 0, up: true });
  });
});
