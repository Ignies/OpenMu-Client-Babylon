/** id text of `src/modules/_api`. */

import type en from './en';

export default {
  'moduleStream.dropped': 'Dunia ini mencantumkan modul yang tidak dapat dibaca ({id}): dilewati',
  'moduleStream.api':
    'Modul {id} memerlukan API modul {range}, klien ini menyediakan {have}: dilewati',
  'moduleStream.download': 'Modul {id} tidak dapat diunduh: dilewati',
  'moduleStream.hash': 'Modul {id} tidak cocok dengan hash-nya: dilewati',
  'moduleStream.core': 'Modul {id} mengaku sebagai modul inti: ditolak',
  'moduleStream.builtIn': 'Modul {id} memakai nama modul bawaan: ditolak',
  'moduleStream.declined': 'Modul {id} tidak diizinkan: dilewati',
  'moduleStream.failed': 'Modul {id} gagal dijalankan: dilepas',
} satisfies Partial<Record<keyof typeof en, string>>;
