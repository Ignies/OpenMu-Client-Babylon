/** hi text of `src/controllers/render`. */

import type en from './en';

export default {
  'options.linePlacement.inset': 'अंदर',
  'options.linePlacement.centered': 'बीच में',
  'options.linePlacement.outset': 'बाहर',
  'options.outlineMode.screen': 'स्क्रीन-स्पेस',
  'options.outlineMode.hull': 'उलटा खोल',
  'options.outlineMode.both': 'दोनों',
  'options.style.anime2': 'Anime 2.0',
  'options.quality.characters': 'किरदार',
  'options.style.classic': 'क्लासिक',
  'options.style.cel': 'सेल-शेडेड',
  'options.style.anime': 'Anime 1.0',
} satisfies Partial<Record<keyof typeof en, string>>;
