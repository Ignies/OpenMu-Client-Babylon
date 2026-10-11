// Answer checks. Each returns an error message, or undefined when the value is fine.

/** Characters a password may use: no quotes, `$`, `;`, `\` or spaces, which break env files, Compose or connection strings. */
const PASSWORD_CHARS = /^[A-Za-z0-9!@#%^&*()\-_+=[\]{}:,.?/~|<>]+$/;
export const PASSWORD_RULE = 'at least 12 characters, 3 of: lower, upper, digit, symbol; no quotes, $, ;, \\ or spaces';

export function password(value: string, login = ''): string | undefined {
  if (value.length < 12) return 'Use at least 12 characters.';
  if (!PASSWORD_CHARS.test(value)) return 'Quotes, $, ;, \\ and spaces are not allowed.';
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter(r => r.test(value)).length;
  if (classes < 3) return 'Mix at least 3 of: lower case, upper case, digits, symbols.';
  if (login && value.toLowerCase().includes(login.toLowerCase())) return 'The password may not contain the login name.';
}

export function login(value: string): string | undefined {
  if (!/^[A-Za-z0-9]{4,10}$/.test(value)) return 'Use 4 to 10 letters or digits.';
}

export function domain(value: string): string | undefined {
  if (!/^(?=.{4,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(value.toLowerCase())) {
    return 'Enter a domain like example.com (no https://, no play.).';
  }
  if (/^(play|ws|api|register|admin)\./i.test(value)) return 'Enter the bare domain; play., ws., api., register. and admin. are added for you.';
}

export function ipv4(value: string): string | undefined {
  const parts = value.split('.');
  if (parts.length !== 4 || !parts.every(p => /^\d{1,3}$/.test(p) && Number(p) <= 255)) return 'Enter an IPv4 address like 203.0.113.7.';
}

export function email(value: string): string | undefined {
  if (!/^[^\s@'"]+@[^\s@'"]+\.[^\s@'"]+$/.test(value)) return 'Enter an e-mail address (for certificate notices).';
}

/** Server list fields are split on `:` and wrapped in `[...]`. */
export function listField(value: string): string | undefined {
  if (!value.trim()) return 'This cannot be empty.';
  if (/[:[\]()'"$\\\n]/.test(value)) return 'Do not use : [ ] ( ) quotes, $ or \\.';
}

/** A random secret for service-to-service signing; never shown to anyone. */
export function newSecret(bytes = 32): string {
  const buf = crypto.getRandomValues(new Uint8Array(bytes));
  return Buffer.from(buf).toString('base64url');
}
