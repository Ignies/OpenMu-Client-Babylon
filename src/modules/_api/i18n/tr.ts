/** tr text of `src/modules/_api`. */

import type en from './en';

export default {
  'moduleStream.dropped': 'Bu dünya okunamayan bir modül listeliyor ({id}): atlandı',
  'moduleStream.api':
    '{id} modülü {range} modül API\'si istiyor, bu istemci {have} sunuyor: atlandı',
  'moduleStream.download': '{id} modülü indirilemedi: atlandı',
  'moduleStream.hash': '{id} modülü karma değeriyle eşleşmiyor: atlandı',
  'moduleStream.core': '{id} modülü çekirdek modül olduğunu iddia ediyor: reddedildi',
  'moduleStream.builtIn': '{id} modülü yerleşik bir modülle aynı adı taşıyor: reddedildi',
  'moduleStream.declined': '{id} modülüne izin verilmedi: atlandı',
  'moduleStream.failed': '{id} modülü başlatılamadı: kaldırıldı',
} satisfies Partial<Record<keyof typeof en, string>>;
