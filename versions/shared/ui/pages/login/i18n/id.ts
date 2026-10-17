/** id text of `versions/shared/ui/pages/login`. */

import type en from './en';

export default {
  'login.enterCredentials': 'Masukkan nama akun dan kata sandimu',
  'login.createAccount': 'Buat akun',
  'login.rememberMe': 'Ingat akun?',
  'register.id': 'ID',
  'register.password': 'Kata sandi',
  'register.confirm': 'Konfirmasi',
  'register.fillEveryField': 'Silakan isi semua kolom.',
  'register.idTooShort': 'ID minimal {min} karakter.',
  'register.idChars': 'ID hanya boleh berisi huruf dan angka.',
  'register.passwordTooShort': 'Kata sandi minimal {min} karakter.',
  'register.passwordChars': 'Kata sandi hanya boleh berisi huruf, angka, dan simbol dasar.',
  'register.mismatch': 'Kata sandi tidak cocok.',
  'register.unreachable': 'Tidak dapat menghubungi server.',
  'register.failed': 'Pendaftaran gagal ({status}).',
  'register.created': 'Akun berhasil dibuat. Sekarang kamu bisa masuk.',
  'login.savedLogin': 'Login tersimpan',
} satisfies Partial<Record<keyof typeof en, string>>;
