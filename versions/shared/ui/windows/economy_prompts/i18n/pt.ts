/** Portuguese text of the `economy_prompts` window. */

import type en from './en';

export default {
  'prompt.storeZen': 'Guardar Zen',
  'prompt.takeZen': 'Retirar Zen',
  'prompt.unlockVault': 'Destrancar o baú',
  'prompt.enterPin': 'Digite o PIN do baú.',
  'prompt.setPin': 'Definir um PIN',
  'prompt.removePin': 'Remover o PIN do baú',
  'prompt.removePinHint': 'Remover o PIN exige a senha da sua conta.',
  'prompt.offerZen': 'Oferecer Zen',
  'prompt.setPrice': 'Definir um preço',
  'prompt.askingPrice': 'Preço pedido.',
  'prompt.askingPriceFor': 'Preço pedido por {name}.',
  'prompt.buy': 'Comprar',
  'prompt.itemCosts': '{name} custa {price}.',
  'prompt.thisItem': 'Este item',
  'prompt.itemGone': 'Este item não está mais aí.',
  'prompt.buyHowMany': 'Que quantidade de {name}? {price} por unidade.',
  'prompt.quantity': 'Quantidade',
  'prompt.carrying': 'Você está carregando {amount}.',
  'prompt.vaultHolds': 'O baú guarda {amount}.',
  'prompt.newPinHint': 'Um novo PIN exige a senha da sua conta.',
  'prompt.pin': 'PIN',
  'prompt.password': 'Senha',
  'prompt.wantsToTrade': '{name} quer negociar com você.',
  'prompt.bundle': 'Agrupar',
  'prompt.bundleAsk': 'Deseja agrupar {count} {name}?',
  'prompt.unbundle': 'Separar',
  'prompt.unbundleAsk': 'Deseja separar o pacote de {count} {name}?',
} satisfies Partial<Record<keyof typeof en, string>>;
