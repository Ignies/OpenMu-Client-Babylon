import { useState } from 'react';
import { MuSpriteFrame } from './muSprite';
import { MuButton } from './muButton';

/**
 * Account registration, drawn with the game's own interface art so it reads as
 * part of MU rather than a web form bolted onto it.
 *
 * The window is `login_back.OZT` — the same frame the client's login screen
 * uses — because a register box is the login box with two more rows. MU's UI is
 * authored at fixed pixel sizes, so everything here is absolutely positioned
 * against the art and must never reflow.
 *
 * The coordinates below were derived from the client's login window
 * (`ui/pages/loginPage`, inputs at y=106/131) and re-spaced to fit three rows.
 * They are a starting point: nudge them against the actual art rather than
 * trusting the arithmetic.
 */

const WIN_WIDTH = 329;
const WIN_HEIGHT = 245;

const INPUT_WIDTH = 156;
const INPUT_HEIGHT = 23;
const INPUT_X = 109;
const LABEL_X = 22;

/** First row, then one row every `ROW_STEP` px. */
const FIRST_ROW_Y = 100;
const ROW_STEP = 24;

/** The label sits a few px below the input's top edge to look centred. */
const LABEL_OFFSET_Y = 7;

const TEXT_INSET_X = 6;
const TEXT_INSET_Y = 6;

const BUTTON_WIDTH = 54;
const BUTTON_HEIGHT = 30;
const BUTTON_Y = 192;
const OK_X = 150;
const CANCEL_X = 211;

/** `data."Account"."LoginName"` is `varchar(10)`; the client caps the same. */
const MAX_USERNAME_LENGTH = 10;
const MAX_PASSWORD_LENGTH = 10;
const MIN_USERNAME_LENGTH = 4;
const MIN_PASSWORD_LENGTH = 4;

/** Where the account actually gets created. See `register/server/main.ts`. */
const API = import.meta.env.VITE_REGISTER_API || '/api/register';

/** MU account names are ASCII; the server rejects anything else anyway. */
const USERNAME_RE = /^[A-Za-z0-9]+$/;

/**
 * The login window's two rows, plus the confirmation a password needs when it
 * is being set rather than typed back. No e-mail: nothing sends one, and a
 * field the server stores as the empty string is a field that asks for a
 * stranger's address for nothing.
 */
const ROWS = [
  { key: 'username', label: 'ID', type: 'text' },
  { key: 'password', label: 'Password', type: 'password' },
  { key: 'confirm', label: 'Confirm', type: 'password' },
] as const;

type Field = (typeof ROWS)[number]['key'];

type Status =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'error'; message: string }
  | { kind: 'done' };

const EMPTY: Record<Field, string> = {
  username: '',
  password: '',
  confirm: '',
};

/**
 * Everything the form can reject without asking the server. The server
 * re-checks all of it — this exists so a typo costs a render, not a round
 * trip.
 */
function validate(values: Record<Field, string>): string | null {
  const { username, password, confirm } = values;

  if (!username || !password || !confirm) {
    return 'Please fill in every field.';
  }

  if (username.length < MIN_USERNAME_LENGTH) {
    return `ID must be at least ${MIN_USERNAME_LENGTH} characters.`;
  }

  if (!USERNAME_RE.test(username)) {
    return 'ID may contain only letters and numbers.';
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }

  if (password !== confirm) return 'Passwords do not match.';

  return null;
}

export const RegisterPage = () => {
  const [values, setValues] = useState<Record<Field, string>>(EMPTY);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  const set = (field: Field, value: string) =>
    setValues(current => ({ ...current, [field]: value }));

  const submit = async () => {
    if (status.kind === 'sending') return;

    const problem = validate(values);

    if (problem) {
      setStatus({ kind: 'error', message: problem });
      return;
    }

    setStatus({ kind: 'sending' });

    try {
      const response = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: values.username,
          password: values.password,
        }),
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus({
          kind: 'error',
          message: body.error || `Registration failed (${response.status}).`,
        });
        return;
      }

      setStatus({ kind: 'done' });
      setValues(EMPTY);
    } catch {
      // Offline, DNS, CORS — none of which the player can act on beyond
      // trying again.
      setStatus({ kind: 'error', message: 'Could not reach the server.' });
    }
  };

  return (
    <div className="register-page">
      <MuSpriteFrame
        file="login_back.OZT"
        width={WIN_WIDTH}
        height={WIN_HEIGHT}
        className="register-win"
      >
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
                  className="register-label"
                  style={{ left: LABEL_X, top: top + LABEL_OFFSET_Y }}
                >
                  {row.label}
                </span>

                <MuSpriteFrame
                  file="login_me.OZT"
                  width={INPUT_WIDTH}
                  height={INPUT_HEIGHT}
                  style={{ position: 'absolute', left: INPUT_X, top }}
                >
                  <input
                    className="register-input"
                    type={row.type}
                    autoFocus={i === 0}
                    autoComplete="off"
                    value={values[row.key]}
                    onChange={e => set(row.key, e.target.value)}
                    maxLength={
                      row.key === 'username'
                        ? MAX_USERNAME_LENGTH
                        : MAX_PASSWORD_LENGTH
                    }
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
            disabled={status.kind === 'sending'}
            onClick={submit}
            style={{ position: 'absolute', left: OK_X, top: BUTTON_Y }}
          />
          <MuButton
            file="loding_cancel_b_all.OZT"
            width={BUTTON_WIDTH}
            height={BUTTON_HEIGHT}
            frames={{ up: 0, active: 1, down: 2 }}
            onClick={() => {
              setValues(EMPTY);
              setStatus({ kind: 'idle' });
            }}
            style={{ position: 'absolute', left: CANCEL_X, top: BUTTON_Y }}
          />

          {/* Enter submits; the visible OK button is a sprite, not a submit. */}
          <button type="submit" className="register-submit" tabIndex={-1} />
        </form>

        {status.kind === 'error' && (
          <p className="register-message register-error">{status.message}</p>
        )}
        {status.kind === 'done' && (
          <p className="register-message register-ok">
            Account created. You can log in now.
          </p>
        )}
      </MuSpriteFrame>
    </div>
  );
};
