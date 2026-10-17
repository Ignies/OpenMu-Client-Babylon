/** uk text of `versions/shared/ui/windows/economy_prompts`. */

import type en from './en';

export default {
  'prompt.storeZen': 'Покласти Zen',
  'prompt.takeZen': 'Забрати Zen',
  'prompt.unlockVault': 'Відімкнути сховище',
  'prompt.enterPin': 'Введіть PIN сховища.',
  'prompt.setPin': 'Встановити PIN сховища',
  'prompt.removePin': 'Прибрати PIN сховища',
  'prompt.removePinHint': 'Щоб прибрати PIN, потрібен пароль акаунта.',
  'prompt.offerZen': 'Запропонувати Zen',
  'prompt.setPrice': 'Призначити ціну',
  'prompt.askingPrice': 'Ціна продажу.',
  'prompt.askingPriceFor': '{name}: ціна продажу.',
  'prompt.buy': 'Купити',
  'prompt.itemCosts': '{name} - ціна: {price}.',
  'prompt.thisItem': 'Цей предмет',
  'prompt.itemGone': 'Цього предмета вже немає.',
  'prompt.buyHowMany': '{name}: скільки купити? По {price} за штуку.',
  'prompt.quantity': 'Кількість',
  'prompt.carrying': 'У вас із собою {amount}.',
  'prompt.vaultHolds': 'У сховищі {amount}.',
  'prompt.newPinHint': 'Для нового PIN потрібен пароль акаунта.',
  'prompt.pin': 'PIN',
  'prompt.password': 'Пароль',
  'prompt.wantsToTrade': 'Гравець {name} хоче обмінятися з вами.',
  'prompt.bundle': 'Зв’язати',
  'prompt.bundleAsk': 'Зв’язати {name} у в’язку (штук: {count})?',
  'prompt.unbundle': 'Розв’язати',
  'prompt.unbundleAsk': 'Розв’язати в’язку {name} (штук: {count})?',
} satisfies Partial<Record<keyof typeof en, string>>;
