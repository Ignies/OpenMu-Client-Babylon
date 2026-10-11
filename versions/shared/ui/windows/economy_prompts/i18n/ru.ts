/** Russian text of the `economy_prompts` window. */

import type en from './en';

export default {
  'prompt.storeZen': 'Положить Zen',
  'prompt.takeZen': 'Забрать Zen',
  'prompt.unlockVault': 'Открыть хранилище',
  'prompt.enterPin': 'Введите PIN хранилища.',
  'prompt.setPin': 'Задать PIN хранилища',
  'prompt.removePin': 'Убрать PIN хранилища',
  'prompt.removePinHint': 'Для снятия PIN нужен пароль аккаунта.',
  'prompt.offerZen': 'Предложить Zen',
  'prompt.setPrice': 'Назначить цену',
  'prompt.askingPrice': 'Запрашиваемая цена.',
  'prompt.askingPriceFor': 'Запрашиваемая цена за {name}.',
  'prompt.buy': 'Купить',
  'prompt.itemCosts': '{name} стоит {price}.',
  'prompt.thisItem': 'Этот предмет',
  'prompt.itemGone': 'Этого предмета больше нет.',
  'prompt.buyHowMany': 'Сколько {name}? По {price}.',
  'prompt.quantity': 'Количество',
  'prompt.carrying': 'При вас {amount}.',
  'prompt.vaultHolds': 'В хранилище {amount}.',
  'prompt.newPinHint': 'Для нового PIN нужен пароль аккаунта.',
  'prompt.pin': 'PIN',
  'prompt.password': 'Пароль',
  'prompt.wantsToTrade': '{name} хочет обменяться с вами.',
} satisfies Partial<Record<keyof typeof en, string>>;
