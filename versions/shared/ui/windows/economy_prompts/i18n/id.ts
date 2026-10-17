/** id text of `versions/shared/ui/windows/economy_prompts`. */

import type en from './en';

export default {
  'prompt.storeZen': 'Simpan Zen',
  'prompt.takeZen': 'Ambil Zen',
  'prompt.unlockVault': 'Buka kunci gudang',
  'prompt.enterPin': 'Masukkan PIN gudang.',
  'prompt.setPin': 'Atur PIN gudang',
  'prompt.removePin': 'Hapus PIN gudang',
  'prompt.removePinHint': 'Menghapus PIN memerlukan kata sandi akunmu.',
  'prompt.offerZen': 'Tawarkan Zen',
  'prompt.setPrice': 'Atur harga',
  'prompt.askingPrice': 'Harga yang diminta.',
  'prompt.askingPriceFor': 'Harga yang diminta untuk {name}.',
  'prompt.buy': 'Beli',
  'prompt.itemCosts': 'Harga {name}: {price}.',
  'prompt.thisItem': 'Item ini',
  'prompt.itemGone': 'Item ini sudah tidak ada.',
  'prompt.buyHowMany': 'Berapa banyak {name}? {price} per buah.',
  'prompt.quantity': 'Jumlah',
  'prompt.carrying': 'Kamu membawa {amount}.',
  'prompt.vaultHolds': 'Gudang berisi {amount}.',
  'prompt.newPinHint': 'PIN baru memerlukan kata sandi akunmu.',
  'prompt.pin': 'PIN',
  'prompt.password': 'Kata sandi',
  'prompt.wantsToTrade': '{name} ingin bertukar denganmu.',
} satisfies Partial<Record<keyof typeof en, string>>;
