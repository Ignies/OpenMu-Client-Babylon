/** Bulgarian text of the `economy_prompts` window. */

import type en from './en';

export default {
  'prompt.storeZen': 'Внеси Zen',
  'prompt.takeZen': 'Изтегли Zen',
  'prompt.unlockVault': 'Отключи трезора',
  'prompt.enterPin': 'Въведи ПИН на трезора.',
  'prompt.setPin': 'Задай ПИН на трезора',
  'prompt.removePin': 'Премахни ПИН на трезора',
  'prompt.removePinHint': 'Премахването на ПИН иска паролата на акаунта.',
  'prompt.offerZen': 'Предложи Zen',
  'prompt.setPrice': 'Задай цена',
  'prompt.askingPrice': 'Исканата цена.',
  'prompt.askingPriceFor': 'Исканата цена за {name}.',
  'prompt.buy': 'Купи',
  'prompt.itemCosts': '{name} струва {price}.',
  'prompt.thisItem': 'Този предмет',
  'prompt.itemGone': 'Този предмет вече го няма.',
  'prompt.buyHowMany': 'Колко {name}? По {price}.',
  'prompt.quantity': 'Количество',
  'prompt.carrying': 'Носиш {amount}.',
  'prompt.vaultHolds': 'В трезора има {amount}.',
  'prompt.newPinHint': 'Нов ПИН изисква паролата на акаунта ти.',
  'prompt.pin': 'PIN',
  'prompt.password': 'Парола',
  'prompt.wantsToTrade': '{name} иска да търгува с теб.',
} satisfies Partial<Record<keyof typeof en, string>>;
