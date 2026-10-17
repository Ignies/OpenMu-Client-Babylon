/** id text of `versions/shared/ui`. */

import type en from './en';

export default {
  'servers.loading': 'Memuat daftar server...',
  'servers.serverName': 'Server {number}',
  'login.id': 'ID',
  'login.password': 'Kata sandi',
  'options.title': 'Pengaturan',
  'options.texturePack': 'Tekstur model',
  'options.texturePack.original': 'Asli',
  'options.texturePackHint': 'Tekstur model beresolusi lebih tinggi, diterapkan tanpa memuat ulang',
  'session.toLevel': 'Menuju level',
  'bottomBar.pet.normalTip': 'Bawaan: gagak tetap di dekatmu',
  'bottomBar.pet.randomTip': 'Acak: menyerang apa saja di dekatnya',
  'bottomBar.pet.ownerTip': 'Tuan: menyerang yang kamu serang',
  'bottomBar.pet.targetTip': 'Target: menyerang sasaranmu saat ini',
  'skills.title': 'Skill',
  'skills.empty': 'Belum ada skill yang dipelajari',
  'chatRoom.leave': 'Keluar',
  'command.trade': 'Tukar',
  'command.purchase': 'Beli',
  'command.party': 'Party',
  'command.whisper': 'Bisik',
  'command.follow': 'Ikuti',
  'command.battle': 'Tarung',
  'warp.title': 'Jendela Teleportasi',
  'instrument.putAway': 'Simpan',
  'prompt.trade': 'Tukar',
} satisfies Partial<Record<keyof typeof en, string>>;
