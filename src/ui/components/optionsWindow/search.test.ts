import { describe, expect, it } from 'vitest';
import { matchesQuery, normaliseText } from './search';

describe('normaliseText', () => {
  it('folds case and accents', () => {
    expect(normaliseText('Vídeo Cámara')).toBe('video camara');
  });

  it('turns punctuation into single spaces', () => {
    expect(normaliseText('  Ctrl-click,  moves   items ')).toBe('ctrl click moves items');
  });

  it('keeps letters from other scripts', () => {
    expect(normaliseText('Громкость')).toBe('громкость');
  });
});

describe('matchesQuery', () => {
  it('needs every word, in any order and any of the texts', () => {
    expect(matchesQuery('water anim', ['Animated water'])).toBe(true);
    expect(matchesQuery('water shadows', ['Animated water', 'Shadows'])).toBe(true);
    expect(matchesQuery('water fire', ['Animated water'])).toBe(false);
  });

  it('matches without the accents the player did not type', () => {
    expect(matchesQuery('camara', ['Control de cámara'])).toBe(true);
    expect(matchesQuery('cámara', ['Control de camara'])).toBe(true);
  });

  it('matches nothing for an empty query', () => {
    expect(matchesQuery('   ', ['Anything'])).toBe(false);
  });

  it('finds a value written with a percent sign', () => {
    expect(matchesQuery('100%', ['Render scale 100%'])).toBe(true);
  });
});
