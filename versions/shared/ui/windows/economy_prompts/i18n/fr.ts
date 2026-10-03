/** French text of the `economy_prompts` window. */

import type en from './en';

export default {
  'prompt.storeZen': 'Déposer du Zen',
  'prompt.store': 'Déposer',
  'prompt.takeZen': 'Retirer du Zen',
  'prompt.take': 'Retirer',
  'prompt.unlockVault': 'Déverrouiller le coffre',
  'prompt.enterPin': 'Saisissez le code du coffre.',
  'prompt.unlock': 'Déverrouiller',
  'prompt.setPin': 'Définir un code',
  'prompt.setPinButton': 'Définir',
  'prompt.removePin': 'Supprimer le code du coffre',
  'prompt.removePinHint':
    'La suppression du code demande le mot de passe du compte.',
  'prompt.remove': 'Supprimer',
  'prompt.offerZen': 'Proposer du Zen',
  'prompt.offer': 'Proposer',
  'prompt.setPrice': 'Fixer un prix',
  'prompt.askingPrice': 'Prix demandé.',
  'prompt.askingPriceFor': 'Prix demandé pour {name}.',
  'prompt.set': 'Fixer',
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
  'prompt.accept': 'Accepter',
  'prompt.refuse': 'Refuser',
  'prompt.wantsToTrade': '{name} veut échanger avec vous.',
} satisfies Partial<Record<keyof typeof en, string>>;
