import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { t } from '../../../i18n';
import { registerApiUrl } from '../../../common/serverServices';
import {
  MAX_ACCOUNT_LENGTH,
  MAX_ACCOUNT_PASSWORD_LENGTH,
  MIN_ACCOUNT_LENGTH,
  MIN_ACCOUNT_PASSWORD_LENGTH,
  validateSignup,
  type SignupProblem,
} from '../../../common/registerRules';
import { MuSpriteFrame } from '../../components/muSprite';
import { MuButton } from '../../components/muButton';
import { TEXT_COLOR } from '../serversPage/layout';

/**
 * Account creation, in the login window's place.
 *
 * The same `login_back.OZT` frame, because a signup form is the login form
 * with one more row - and because swapping one window for another leaves the
 * logo, the scene and the music exactly where they were. That is the whole
 * point of it being here rather than on a page of its own: the player never
 * leaves the screen they waited for.
 *
 * Everything is absolutely positioned against the art, as the rest of MU's UI
 * is, and must never reflow.
 */

const WIN_WIDTH = 329;
const WIN_HEIGHT = 245;

const INPUT_WIDTH = 156;
const INPUT_HEIGHT = 23;
const INPUT_X = 109;
const LABEL_X = 30;

/**
 * The layout, against the frame art rather than against arithmetic. Only the
 * middle of `login_back.OZT` is flat: the top bar is the MU ONLINE plate with
 * a dragon's head reaching down at the right, and the bottom band is two more
 * of them. So the rows sit clear of both, the buttons take the bottom band the
 * way the login window's do - they are opaque sprites and cover it - and the
 * message goes between them, on a box of its own (see `login-signup-message`).
 */
const TITLE_Y = 60;
const FIRST_ROW_Y = 88;
const ROW_STEP = 24;

/** The label sits a few px below the input's top edge to look centred. */
const LABEL_OFFSET_Y = 7;

const TEXT_INSET_X = 6;
const TEXT_INSET_Y = 6;

const BUTTON_WIDTH = 54;
const BUTTON_HEIGHT = 30;
const BUTTON_Y = 196;
const OK_X = 150;
const CANCEL_X = 211;

const ROWS = [
  { key: 'username', label: 'register.id', type: 'text' },
  { key: 'password', label: 'register.password', type: 'password' },
  { key: 'confirm', label: 'register.confirm', type: 'password' },
] as const;

type Field = (typeof ROWS)[number]['key'];

const EMPTY: Record<Field, string> = {
  username: '',
  password: '',
  confirm: '',
};

const MAX_LENGTH: Record<Field, number> = {
  username: MAX_ACCOUNT_LENGTH,
  password: MAX_ACCOUNT_PASSWORD_LENGTH,
  confirm: MAX_ACCOUNT_PASSWORD_LENGTH,
};

/** The shared rules' reasons, said in the player's language. */
function problemText(problem: SignupProblem): string {
  switch (problem) {
    case 'empty':
      return t('register.fillEveryField');
    case 'idShort':
      return t('register.idTooShort', { min: MIN_ACCOUNT_LENGTH });
    case 'idChars':
      return t('register.idChars');
    case 'passwordShort':
      return t('register.passwordTooShort', {
        min: MIN_ACCOUNT_PASSWORD_LENGTH,
      });
    case 'mismatch':
      return t('register.mismatch');
  }
}

type RegisterWindowProps = {
  /** The account exists; the login window takes it from here. */
  onCreated: (username: string) => void;
  onCancel: () => void;
};

// `observer` for the language selector: every label here is a `t()`, and the
// login page's own render does not read one while this window is up.
export const RegisterWindow = observer(({ onCreated, onCancel }: RegisterWindowProps) => {
  const [values, setValues] = useState<Record<Field, string>>(EMPTY);
  const [error, setError] = useState<string>('');
  const [sending, setSending] = useState(false);

  const set = (field: Field, value: string) =>
    setValues(current => ({ ...current, [field]: value }));

  const submit = async () => {
    if (sending) return;

    const problem = validateSignup(values);

    if (problem) {
      setError(problemText(problem));
      return;
    }

    setError('');
    setSending(true);

    try {
      const response = await fetch(registerApiUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: values.username,
          password: values.password,
        }),
      });

      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        // The service's own words: it is the one that knows the ID is taken or
        // that this network has had its account for today, and it says so in
        // English because it has no idea who is asking.
        setError(body.error || t('register.failed', { status: response.status }));
        setSending(false);
        return;
      }

      onCreated(values.username);
    } catch {
      // Offline, DNS, CORS - none of which the player can act on beyond
      // trying again.
      setError(t('register.unreachable'));
      setSending(false);
    }
  };

  return (
    <MuSpriteFrame
      file="login_back.OZT"
      width={WIN_WIDTH}
      height={WIN_HEIGHT}
      className="login-win"
    >
      <span className="login-label login-signup-title" style={{ top: TITLE_Y }}>
        {t('login.createAccount')}
      </span>

      <form
        onSubmit={e => {
          e.preventDefault();
          submit();
        }}
      >
        {ROWS.map((row, i) => {
          const top = FIRST_ROW_Y + i * ROW_STEP;

          return (
            <div key={row.key}>
              <span
                className="login-label"
                style={{ left: LABEL_X, top: top + LABEL_OFFSET_Y }}
              >
                {t(row.label)}
              </span>

              <MuSpriteFrame
                file="login_me.OZT"
                width={INPUT_WIDTH}
                height={INPUT_HEIGHT}
                style={{ position: 'absolute', left: INPUT_X, top }}
              >
                <input
                  className="login-input"
                  type={row.type}
                  autoFocus={i === 0}
                  autoComplete="off"
                  value={values[row.key]}
                  onChange={e => set(row.key, e.target.value)}
                  maxLength={MAX_LENGTH[row.key]}
                  style={{
                    paddingLeft: TEXT_INSET_X,
                    paddingTop: TEXT_INSET_Y,
                  }}
                />
              </MuSpriteFrame>
            </div>
          );
        })}

        <MuButton
          file="message_ok_b_all.OZT"
          width={BUTTON_WIDTH}
          height={BUTTON_HEIGHT}
          frames={{ up: 0, active: 1, down: 2 }}
          color={TEXT_COLOR.brightGray}
          activeColor={TEXT_COLOR.white}
          disabled={sending}
          onClick={submit}
          style={{ position: 'absolute', left: OK_X, top: BUTTON_Y }}
        />
        <MuButton
          file="loding_cancel_b_all.OZT"
          width={BUTTON_WIDTH}
          height={BUTTON_HEIGHT}
          frames={{ up: 0, active: 1, down: 2 }}
          color={TEXT_COLOR.brightGray}
          activeColor={TEXT_COLOR.white}
          onClick={onCancel}
          style={{ position: 'absolute', left: CANCEL_X, top: BUTTON_Y }}
        />

        {}
        <button type="submit" className="login-submit" tabIndex={-1} />
      </form>

      {!!error && <p className="login-signup-message">{error}</p>}
    </MuSpriteFrame>
  );
});
