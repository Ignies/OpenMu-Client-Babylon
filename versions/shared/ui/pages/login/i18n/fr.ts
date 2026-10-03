/** French text of the `login` page. */

import type en from './en';

export default {
  'login.enterCredentials': 'Saisissez votre compte et votre mot de passe',
  'login.createAccount': 'Inscription',
  'login.rememberMe': 'Se souvenir de moi ?',

  'register.id': 'ID',
  'register.password': 'Mot de passe',
  'register.confirm': 'Confirmer',
  'register.fillEveryField': 'Remplis tous les champs.',
  'register.idTooShort': 'L’ID doit faire au moins {min} caractères.',
  'register.idChars': 'L’ID ne peut contenir que des lettres et des chiffres.',
  'register.passwordTooShort': 'Le mot de passe doit faire au moins {min} caractères.',

  'register.passwordChars': 'Le mot de passe ne peut contenir que des lettres, des chiffres et des symboles simples.',
  'register.mismatch': 'Les mots de passe ne correspondent pas.',
  'register.unreachable': 'Impossible de joindre le serveur.',
  'register.failed': 'Échec de l’inscription ({status}).',
  'register.created': 'Compte créé. Tu peux te connecter.',
} satisfies Partial<Record<keyof typeof en, string>>;
