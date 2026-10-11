/** Portuguese text of the `login` page. */

import type en from './en';

export default {
  'login.enterCredentials': 'Digite sua conta e sua senha',
  'login.createAccount': 'Criar conta',
  'login.rememberMe': 'Lembrar de mim?',

  'register.id': 'ID',
  'register.password': 'Senha',
  'register.confirm': 'Confirmar',
  'register.fillEveryField': 'Preencha todos os campos.',
  'register.idTooShort': 'O ID deve ter pelo menos {min} caracteres.',
  'register.idChars': 'O ID só pode ter letras e números.',
  'register.passwordTooShort': 'A senha deve ter pelo menos {min} caracteres.',

  'register.passwordChars': 'A senha só pode ter letras, números e símbolos básicos.',
  'register.mismatch': 'As senhas não coincidem.',
  'register.unreachable': 'Não foi possível contatar o servidor.',
  'register.failed': 'Não foi possível criar a conta ({status}).',
  'register.created': 'Conta criada. Já pode entrar.',
  'login.savedLogin': 'Login salvo',
} satisfies Partial<Record<keyof typeof en, string>>;
