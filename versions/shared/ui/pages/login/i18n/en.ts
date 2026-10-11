/** English text of the `login` page. See src/i18n/readme.md. */

const en = {
  'login.enterCredentials': 'Enter your account name and password',
  'login.createAccount': 'Create account',
  'login.rememberMe': 'Remember me?',

  // The register window, which takes the login window's place on the same
  // screen. Its rows are the login window's, plus the confirmation a password
  // needs when it is being set rather than typed back.
  'register.id': 'ID',
  'register.password': 'Password',
  'register.confirm': 'Confirm',
  'register.fillEveryField': 'Please fill in every field.',
  'register.idTooShort': 'ID must be at least {min} characters.',
  'register.idChars': 'ID may contain only letters and numbers.',
  'register.passwordTooShort': 'Password must be at least {min} characters.',
  'register.passwordChars':
    'Password may contain only letters, numbers and basic symbols.',
  'register.mismatch': 'Passwords do not match.',
  'register.unreachable': 'Could not reach the server.',
  'register.failed': 'Registration failed ({status}).',
  'register.created': 'Account created. You can log in now.',
  /** The password field's placeholder when the saved login will be sent instead. Short: the field is narrow. */
  'login.savedLogin': 'Saved login',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'versions/shared/ui/pages/login': typeof en;
  }
}
