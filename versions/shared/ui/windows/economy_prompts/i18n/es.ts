/** Spanish text of the `economy_prompts` window. */

import type en from './en';

export default {
  'prompt.storeZen': 'Guardar Zen',
  'prompt.takeZen': 'Retirar Zen',
  'prompt.unlockVault': 'Desbloquear la bóveda',
  'prompt.enterPin': 'Escribe el PIN de la bóveda.',
  'prompt.setPin': 'Poner un PIN a la bóveda',
  'prompt.removePin': 'Quitar el PIN de la bóveda',
  'prompt.removePinHint': 'Para quitar el PIN hace falta tu contraseña.',
  'prompt.offerZen': 'Ofrecer Zen',
  'prompt.setPrice': 'Poner precio',
  'prompt.askingPrice': 'Precio de venta.',
  'prompt.askingPriceFor': 'Precio de venta de {name}.',
  'prompt.buy': 'Comprar',
  'prompt.itemCosts': '{name} cuesta {price}.',
  'prompt.thisItem': 'Este objeto',
  'prompt.itemGone': 'Este objeto ya no está.',
  'prompt.buyHowMany': '¿Qué cantidad de {name}? {price} por unidad.',
  'prompt.quantity': 'Cantidad',
  'prompt.carrying': 'Llevas encima {amount}.',
  'prompt.vaultHolds': 'La bóveda guarda {amount}.',
  'prompt.newPinHint': 'Un PIN nuevo necesita la contraseña de tu cuenta.',
  'prompt.pin': 'PIN',
  'prompt.password': 'Contraseña',
  'prompt.wantsToTrade': '{name} quiere comerciar contigo.',
} satisfies Partial<Record<keyof typeof en, string>>;
