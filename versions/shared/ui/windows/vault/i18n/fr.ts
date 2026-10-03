/** French text of the `vault` window. */

import type en from './en';

export default {
  'vault.depositJewels': 'Joyaux',
  'vault.depositJewelsHint': 'Envoyer tous les joyaux de l’inventaire au coffre',

  'vault.title': 'Coffre',
  'vault.unlocked': 'Déverrouillé',
  'vault.locked': 'Verrouillé',
  'vault.fee': 'Frais',
  'vault.deposit': 'Déposer du Zen',
  'vault.withdraw': 'Retirer du Zen',
  'vault.pin': 'Code du coffre',
} satisfies Partial<Record<keyof typeof en, string>>;
