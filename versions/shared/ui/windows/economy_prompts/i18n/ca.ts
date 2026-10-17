/** ca text of `versions/shared/ui/windows/economy_prompts`. */

import type en from './en';

export default {
  'prompt.storeZen': 'Desa Zen',
  'prompt.takeZen': 'Retira Zen',
  'prompt.unlockVault': 'Desbloqueja el magatzem',
  'prompt.enterPin': 'Introdueix el PIN del magatzem.',
  'prompt.setPin': 'Posa un PIN al magatzem',
  'prompt.removePin': 'Treu el PIN del magatzem',
  'prompt.removePinHint': 'Per treure el PIN cal la contrasenya del compte.',
  'prompt.offerZen': 'Ofereix Zen',
  'prompt.setPrice': 'Posa un preu',
  'prompt.askingPrice': 'Preu de venda.',
  'prompt.askingPriceFor': 'Preu de venda per a {name}.',
  'prompt.buy': 'Compra',
  'prompt.itemCosts': '{name} costa {price}.',
  'prompt.thisItem': 'Aquest objecte',
  'prompt.itemGone': 'Aquest objecte ja no hi és.',
  'prompt.buyHowMany': '{name}: quantes unitats? {price} cadascuna.',
  'prompt.quantity': 'Quantitat',
  'prompt.carrying': 'Portes {amount}.',
  'prompt.vaultHolds': 'El magatzem conté {amount}.',
  'prompt.newPinHint': 'Un PIN nou requereix la contrasenya del compte.',
  'prompt.pin': 'PIN',
  'prompt.password': 'Contrasenya',
  'prompt.wantsToTrade': 'El jugador {name} vol fer un intercanvi amb tu.',
  'prompt.bundle': 'Agrupa',
  'prompt.bundleAsk': 'Vols agrupar {count} {name} en un paquet?',
  'prompt.unbundle': 'Desfés el paquet',
  'prompt.unbundleAsk': 'Vols desfer el paquet de {count} {name}?',
} satisfies Partial<Record<keyof typeof en, string>>;
