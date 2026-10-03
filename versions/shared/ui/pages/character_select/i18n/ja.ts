/** Japanese text of the `character_select` page. */

import type en from './en';

export default {
  'characters.loading': 'キャラクターを読み込んでいます...',
  'characters.select': 'キャラクターを選んでください',
  'characters.hint.select': '選択',
  'characters.hint.zoomIn': 'ズームイン',
  'characters.hint.zoomOut': 'ズームアウト',
  'class.desc.darkWizard':
    '魔法使いの王国、アルカの末裔。体力には劣るが莫大な力を持ち、攻撃魔法を自在に操る。',
  'class.desc.darkKnight':
    '騎士の王国、ロレンシアの末裔。強大な腕力と剣技で、ほとんどの近接武器を扱える。',
  'class.desc.elf':
    'エルフの王国、ノリアの末裔。弓矢の達人であり、さまざまな魔法も操る。',
  'class.desc.summoner':
    '強靭な精神と優れた洞察力が最強の呪いの魔法を生む。異界の召喚士を引き寄せ、有害な呪術で立ち向かう。',
  'class.desc.rageFighter':
    'カルタン王立騎士団の正統な後継者であり、優れた体力を持つ武術家。補助的な祝福でパーティーも支える。',
  'class.desc.magicGladiator':
    'ダークナイトとダークウィザードの特徴を併せ持つ複合職。近接戦闘に長け、魔法も自在に扱う。',
  'class.desc.darkLord':
    '軍勢を率い、ダークスピリットとダークホースを操るカリスマ的なキャラクター。',
} satisfies Partial<Record<keyof typeof en, string>>;
