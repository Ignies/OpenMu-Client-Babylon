/** French text of the `balgass_entry` window. */

import type en from './en';

export default {
  'quest.werewolf.name': 'Garde loup-garou',
  'quest.werewolf.line1': '« Sais-tu seulement qui je suis ? Lugard m’a à la fois béni et maudit. Je peux t’aider si tu en es digne. »',
  'quest.werewolf.line2': 'Si vous avez réussi l’épreuve de l’apôtre Devin, le Garde loup-garou vous enverra, vous et les membres de votre groupe, à la caserne de Balgass.',
  'quest.werewolf.line3': 'Vous devez rester groupés pour entrer ensemble dans la caserne de Balgass.',
  'quest.werewolf.line4': 'Pour recevoir l’aide du Garde loup-garou, vous devez lui payer 3 000 000 Zen.',
  'quest.gatekeeper.name': 'Gardien de la porte',
  'quest.gatekeeper.line1': '« Hmm, qui es-tu ? Balgass t’a-t-il seulement autorisé ? »',
  'quest.gatekeeper.line2': 'Les 12 apôtres de Lugard vous aident en aveuglant le gardien sur la route du lieu de repos de Balgass.',
  'quest.gatekeeper.line3': 'La troisième mission de l’apôtre Devin vous permet d’entrer dans le lieu de repos.',
} satisfies Partial<Record<keyof typeof en, string>>;
