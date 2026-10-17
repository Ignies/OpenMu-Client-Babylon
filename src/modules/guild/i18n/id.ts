/** id text of `src/modules/guild`. */

import type en from './en';

export default {
  'guild.memberLeft': '{name} keluar dari guild.',
  'guild.youLeft': 'Kamu keluar dari guild.',
  'guild.disbanded': 'Guild telah dibubarkan.',
  'guild.memberRemoved': 'Anggota telah dikeluarkan dari guild.',
  'guild.onlyMasterRemoves': 'Hanya Ketua Guild yang dapat mengeluarkan anggota.',
  'guild.wrongPassword': 'Kata sandi yang kamu masukkan salah.',
  'guild.created': 'Guild telah dibuat.',
  'guild.nameTaken': 'Nama guild itu sudah dipakai.',
  'guild.createFailed': 'Guild tidak dapat dibuat.',
  'guild.joinRefused': 'Ketua Guild menolak permintaanmu.',
  'guild.joined': 'Kamu bergabung dengan guild.',
  'guild.isFull': 'Guild sudah penuh.',
  'guild.masterUnavailable': 'Ketua Guild tidak tersedia.',
  'guild.masterBusy': 'Ketua Guild sedang sibuk. Coba lagi nanti.',
  'guild.needLevel6': 'Kamu harus minimal level 6 untuk bergabung dengan guild.',
} satisfies Partial<Record<keyof typeof en, string>>;
