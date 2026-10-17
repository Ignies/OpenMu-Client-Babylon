/** id text of `versions/shared/ui/hud/bottom_bar`. */

import type en from './en';

export default {
  'bottomBar.itemShop': 'Toko Item',
  'bottomBar.characterInfo': 'Informasi Karakter',
  'bottomBar.inventory': 'Inventaris',
  'bottomBar.friendList': 'Daftar Teman',
  'bottomBar.noSkill': 'Tanpa skill (klik kanan = serang)',
  'bottomBar.emptySlot': '[{key}] kosong',
  'bottomBar.itemSlot': '{name} [{key}]',
  'bottomBar.skillHint': ' - klik: daftar skill, klik kanan: serangan biasa',
  'bottomBar.pickSkill': '[{key}] kosong - klik untuk memilih skill',
  'bottomBar.boundSlot': '{name} [{key}] - klik kanan untuk mengganti',
  'bottomBar.clearSlot': 'Kosongkan slot [{key}]',
  'bottomBar.pet.normal': 'Nor',
  'bottomBar.pet.random': 'Acak',
  'bottomBar.pet.owner': 'Tuan',
  'bottomBar.pet.target': 'Tgt',
  'bottomBar.pet.needTarget': 'Pilih sasaran untuk gagak terlebih dulu',
  'exp.title': 'Pengalaman',
} satisfies Partial<Record<keyof typeof en, string>>;
