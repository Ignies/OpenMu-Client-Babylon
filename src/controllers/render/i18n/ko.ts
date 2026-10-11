/** Korean text of the `render` controller. */

import type en from './en';

export default {
  'options.linePlacement.inset': '안쪽',
  'options.linePlacement.centered': '가운데',
  'options.linePlacement.outset': '바깥쪽',
  'options.outlineMode.screen': '화면 공간',
  'options.outlineMode.hull': '반전 외곽',
  'options.outlineMode.both': '둘 다',
  'options.style.anime2': 'Anime 2.0',
  'options.quality.characters': '캐릭터',
  'options.style.classic': '클래식',
  'options.style.cel': '셀 셰이딩',
  'options.style.anime': 'Anime 1.0',
} satisfies Partial<Record<keyof typeof en, string>>;
