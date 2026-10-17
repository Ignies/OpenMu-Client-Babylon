/** tr text of `src/app`. */

import type en from './en';

export default {
  'notify.wsError': 'WebSocket bağlantı hatası',
  'notify.connectionLost': 'Sunucu bağlantısı koptu',
  'notify.serverListLost': 'Sunucu listesi bağlantısı koptu',
  'notify.helperStarted': 'MU Helper başlatıldı',
  'notify.helperStopped': 'MU Helper durduruldu',
  'notify.helperSafeZone': 'MU Helper güvenli bölgede başlatılamaz',
  'notify.helperCost': 'MU Helper {total} Zen harcadı',
  'notify.zenCap': 'En fazla 2.000.000.000 Zen taşıyabilirsin',
  'notify.cannotSell': 'Bu eşya satılamaz',
  'notify.merchantRefuses': 'Tüccar bu eşyayı istemiyor',
  'notify.learnedSkill': 'Yeni yetenek öğrendin: {name}',
  'notify.storageOpen': 'Depo açıkken eşya kullanamazsın',
  'notify.upgradeNeedsServer': 'Yükseltme için sunucu gerekli',
  'notify.noAnswerRestored': 'Sunucu yanıt vermedi: eşya geri yüklendi',
  'notify.cannotBuy': 'Bu eşyayı satın alamazsın',
  'notify.updateAvailable':
    'Yeni bir sürüm çıktı: sunucu listesine döndüğünde sayfa yeniden yüklenecek.',
} satisfies Partial<Record<keyof typeof en, string>>;
