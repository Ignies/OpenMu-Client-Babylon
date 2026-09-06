/**
 * What a signup has to look like before anyone bothers the database.
 *
 * Three places ask the question: the login window's register form, the
 * standalone page (`register/src`), and the service itself
 * (`register/server/main.ts`), which re-checks all of it because anything can
 * POST to it. The two forms share this file so a rule tightened for one is not
 * quietly looser in the other.
 *
 * It answers with a *reason*, never a sentence: the client renders it through
 * `t()` and the standalone page through its own English, and neither wants a
 * string the other chose. Engine-free, like `rateLimit.ts` beside it - nothing
 * here may drag Babylon or a store into a server process.
 */

/** `data."Account"."LoginName"` is `varchar(10)`; longer would truncate. */
export const MAX_ACCOUNT_LENGTH = 10;
export const MIN_ACCOUNT_LENGTH = 4;
export const MAX_ACCOUNT_PASSWORD_LENGTH = 10;
export const MIN_ACCOUNT_PASSWORD_LENGTH = 4;

/** MU account names are ASCII; the server rejects anything else anyway. */
const ACCOUNT_RE = /^[A-Za-z0-9]+$/;

export type SignupProblem =
  | 'empty'
  | 'idShort'
  | 'idChars'
  | 'passwordShort'
  | 'mismatch';

export type Signup = {
  username: string;
  password: string;
  confirm: string;
};

/** The first thing wrong with this signup, or null when nothing is. */
export function validateSignup(signup: Signup): SignupProblem | null {
  const { username, password, confirm } = signup;

  if (!username || !password || !confirm) return 'empty';
  if (username.length < MIN_ACCOUNT_LENGTH) return 'idShort';
  if (!ACCOUNT_RE.test(username)) return 'idChars';
  if (password.length < MIN_ACCOUNT_PASSWORD_LENGTH) return 'passwordShort';
  if (password !== confirm) return 'mismatch';

  return null;
}
