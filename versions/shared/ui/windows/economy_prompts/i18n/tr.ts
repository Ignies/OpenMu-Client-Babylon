/** tr text of `versions/shared/ui/windows/economy_prompts`. */

import type en from './en';

export default {
  'prompt.storeZen': 'Zen Yatır',
  'prompt.takeZen': 'Zen Çek',
  'prompt.unlockVault': 'Depo kilidini aç',
  'prompt.enterPin': 'Depo şifresini gir.',
  'prompt.setPin': 'Depo şifresi belirle',
  'prompt.removePin': 'Depo şifresini kaldır',
  'prompt.removePinHint': 'Depo şifresini kaldırmak için hesap şifren gerekir.',
  'prompt.offerZen': 'Zen Teklif Et',
  'prompt.setPrice': 'Fiyat belirle',
  'prompt.askingPrice': 'İstenen fiyat.',
  'prompt.askingPriceFor': '{name} için istenen fiyat.',
  'prompt.buy': 'Satın al',
  'prompt.itemCosts': '{name} için fiyat: {price}.',
  'prompt.thisItem': 'Bu eşya',
  'prompt.itemGone': 'Bu eşya artık yok.',
  'prompt.buyHowMany': 'Kaç adet {name}? Tanesi {price}.',
  'prompt.quantity': 'Miktar',
  'prompt.carrying': 'Üzerinde {amount} var.',
  'prompt.vaultHolds': 'Depoda {amount} var.',
  'prompt.newPinHint': 'Yeni depo şifresi için hesap şifren gerekir.',
  'prompt.pin': 'PIN',
  'prompt.password': 'Hesap şifresi',
  'prompt.wantsToTrade': '{name} adlı oyuncu seninle takas yapmak istiyor.',
} satisfies Partial<Record<keyof typeof en, string>>;
