import { afterEach, describe, expect, it } from 'vitest';
import { FIDELITY_CLASSIC, FIDELITY_DEFAULT, setFidelityChoice } from '@/controllers/fidelity';
import { menuLabelStyle } from './labelFit';

const LONG = 'Seleccionar servidor de juego';

describe('menuLabelStyle', () => {
  afterEach(() => setFidelityChoice(FIDELITY_DEFAULT, {}));

  it('keeps every label on one line and shrinks a long one on Enhanced', () => {
    expect(menuLabelStyle('Option')).toEqual({ whiteSpace: 'nowrap', fontSize: undefined });
    expect(menuLabelStyle(LONG).fontSize).toBe('8.0px');
  });

  it('keeps the font on Classic: the original draws the label on one line at its size', () => {
    setFidelityChoice(FIDELITY_CLASSIC, {});
    expect(menuLabelStyle(LONG)).toEqual({ whiteSpace: 'nowrap', fontSize: undefined });
  });
});
