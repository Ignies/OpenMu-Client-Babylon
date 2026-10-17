/** id text of `src/app`. */

import type en from './en';

export default {
  'notify.wsError': 'Kesalahan koneksi WebSocket',
  'notify.connectionLost': 'Koneksi ke server terputus',
  'notify.serverListLost': 'Koneksi ke daftar server terputus',
  'notify.helperStarted': 'MU Helper dimulai',
  'notify.helperStopped': 'MU Helper dihentikan',
  'notify.helperSafeZone': 'MU Helper tidak dapat dimulai di zona aman',
  'notify.helperCost': 'MU Helper telah memakai {total} Zen',
  'notify.zenCap': 'Kamu tidak dapat membawa lebih dari 2.000.000.000 Zen',
  'notify.cannotSell': 'Item ini tidak dapat dijual',
  'notify.merchantRefuses': 'Pedagang tidak menginginkan item itu',
  'notify.learnedSkill': 'Kamu telah mempelajari {name}',
  'notify.storageOpen': 'Kamu tidak dapat memakai item saat gudang terbuka',
  'notify.upgradeNeedsServer': 'Peningkatan memerlukan server',
  'notify.noAnswerRestored': 'Server tidak menjawab: item dikembalikan',
  'notify.cannotBuy': 'Kamu tidak dapat membeli item itu',
  'notify.updateAvailable':
    'Versi baru telah tersedia: halaman akan dimuat ulang begitu kamu kembali ke daftar server.',
} satisfies Partial<Record<keyof typeof en, string>>;
