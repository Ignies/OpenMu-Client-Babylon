/** French text of the `economy_prompts` window. */

import type en from './en';

export default {
  'prompt.storeZen': 'Déposer du Zen',
  'prompt.takeZen': 'Retirer du Zen',
  'prompt.unlockVault': 'Déverrouiller le coffre',
  'prompt.enterPin': 'Saisissez le code du coffre.',
  'prompt.setPin': 'Définir un code',
  'prompt.removePin': 'Supprimer le code du coffre',
  'prompt.removePinHint':
    'La suppression du code demande le mot de passe du compte.',
  'prompt.offerZen': 'Proposer du Zen',
  'prompt.setPrice': 'Fixer un prix',
  'prompt.askingPrice': 'Prix demandé.',
  'prompt.askingPriceFor': 'Prix demandé pour {name}.',
  'prompt.buy': 'Acheter',
  'prompt.itemCosts': '{name} coûte {price}.',
  'prompt.thisItem': 'Cet objet',
  'prompt.itemGone': 'Cet objet n’est plus là.',
  'prompt.buyHowMany': "Combien de {name} ? {price} l'unité.",
  'prompt.quantity': 'Quantité',
  'prompt.carrying': 'Vous portez {amount}.',
  'prompt.vaultHolds': 'Le coffre contient {amount}.',
  'prompt.newPinHint': 'Un nouveau code demande le mot de passe du compte.',
  'prompt.pin': 'Code',
  'prompt.password': 'Mot de passe',
  'prompt.wantsToTrade': '{name} veut échanger avec vous.',
} satisfies Partial<Record<keyof typeof en, string>>;
