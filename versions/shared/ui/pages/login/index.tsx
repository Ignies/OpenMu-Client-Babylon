import { MuWindows } from '@/controllers/interface/windowManager';
import { useEffect, useRef, useState } from 'react';
import { t } from '@/i18n';
import { playUiSound, uiClick } from '@/controllers/sound/sfx';
import './style.less';
import { observer } from 'mobx-react-lite';
import { Servers } from '@/modules/servers';
import { Session } from '@/modules/session';
import { MsgBox } from '@/controllers/interface';
import { MAX_PASSWORD_LENGTH, MAX_USERNAME_LENGTH } from '@/modules/servers/serverAccounts';
import { registerApiUrl, registerUrl } from '@/modules/servers/serverServices';
import { MuSpriteFrame } from '@/controllers/interface/components/mu_sprite';
import { MuText, TEXT_COLOR } from '@/controllers/interface/components/mu_text';
import { MuLogo } from '@/controllers/interface/components/mu_logo';
import { MuButton } from '@/controllers/interface/components/mu_button';
import { RegisterWindow } from './registerWindow';

const WIN_WIDTH = 329;
const WIN_HEIGHT = 245;

const INPUT_WIDTH = 156;
const INPUT_HEIGHT = 23;
const INPUT_X = 109;
const ACCOUNT_Y = 106;
const PASSWORD_Y = 131;

const TEXT_INSET_X = 6;
const TEXT_INSET_Y = 6;

const BUTTON_WIDTH = 54;
const BUTTON_HEIGHT = 30;
const BUTTON_Y = 178;
const OK_X = 150;
const CANCEL_X = 211;

const CHECK_SIZE = 16;
const CHECK_X = 109;
const CHECK_Y = 156;

const LABEL_X = 30;

/**
 * The signup text, on the checkbox row and left of it. That band is the only
 * flat art left in the window - the frame's dragons take both bottom corners,
 * so the space beside the buttons is not the empty half it looks like - and
 * text rather than a button keeps it what it is: the way out of this window,
 * not another thing to press before logging in.
 *
 * It leaves about 85px before the checkbox, which is what caps how long the
 * translations of it may be.
 */
const REGISTER = { x: 22, y: CHECK_Y + 3 };

/** `CLoginWin::Render`: the server line in `g_hFixFont` at (111, 80). */
const SERVER_LINE = { x: 111, y: 80 };

const onCancelClicked = () => Session.cancelLogin();

export const LoginPage = observer(() => {
  const [registering, setRegistering] = useState(false);
  /** "Account created" - shown where the login error would be, in green. */
  const [notice, setNotice] = useState('');

  // The world being logged into, not the build: a client plays any world, and
  // each one has its own signup service.
  const signupApi = registerApiUrl();
  // Only for a build that named a page but no endpoint. Then this window
  // cannot create the account itself and links out, as it always did.
  const signupPage = signupApi ? '' : registerUrl();

  const openRegister = () => {
    setNotice('');
    Session.loginError = undefined;
    setRegistering(true);
  };

  const onLoginClicked = () => {
    if (Session.loginProcessing) return;

    setNotice('');

    if (!Session.canSubmitLogin) {
      Session.loginError = t('login.enterCredentials');
      return;
    }

    Session.loginError = undefined;
    Session.loginProcessing = true;

    Session.submitLogin();
  };

  const form = useRef<HTMLFormElement>(null);

  // Enter and Escape are OK and Cancel wherever the focus is, click included
  // (LoginWin.cpp:207-219): a click on the checkbox or the art leaves it on
  // the body, outside the form.
  useEffect(() => {
    if (registering) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' && e.key !== 'Escape') return;
      if (e.isComposing || e.keyCode === 229) return;
      if (MsgBox.msgWin || MuWindows.isOpen('options')) return;
      // A focused link keeps its own Enter.
      if (e.target instanceof HTMLAnchorElement) return;

      // Also stops the form's implicit submit, which would log in twice.
      e.preventDefault();
      // Once per press (CInput::IsKeyDown), not once per auto-repeat.
      if (e.repeat) return;

      if (e.key === 'Escape') {
        playUiSound('click');
        onCancelClicked();
      } else if (!Session.loginProcessing) {
        playUiSound('click');
        // Through the form, so a password manager still sees a login submitted.
        form.current?.requestSubmit();
      }
    };

    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [registering]);

  // One window swapped for another: the logo, the scene behind it and the
  // music are outside this and never notice.
  if (registering) {
    return (
      <div className="login-page">
        <MuLogo />

        <RegisterWindow
          onCreated={username => {
            Session.username = username;
            Session.password = '';
            Session.loginError = undefined;
            setNotice(t('register.created'));
            setRegistering(false);
          }}
          onCancel={() => setRegistering(false)}
        />
      </div>
    );
  }

  return (
    <div className="login-page">
      <MuLogo />

      <MuSpriteFrame
        file="login_back.OZT"
        width={WIN_WIDTH}
        height={WIN_HEIGHT}
        className="login-win"
      >
        {/* GlobalText 460: "%s Server %d" - the server picked on the list. */}
        {Servers.selectedServer && (
          <MuText
            face="fix"
            className="login-server-line"
            style={{ left: SERVER_LINE.x, top: SERVER_LINE.y }}
            text={
              Servers.selectedServer.channelName
                ? `${Servers.selectedServer.name} - ${Servers.selectedServer.channelName}`
                : `${Servers.selectedServer.name} Ch. ${Servers.selectedServer.channel}`
            }
          />
        )}
        <form
          ref={form}
          onSubmit={e => {
            e.preventDefault();
            onLoginClicked();
          }}
        >
          <span className="login-label" style={{ left: LABEL_X, top: 113 }}>
            {t('login.id')}
          </span>
          <span className="login-label" style={{ left: LABEL_X, top: 139 }}>
            {t('login.password')}
          </span>

          <MuSpriteFrame
            file="login_me.OZT"
            width={INPUT_WIDTH}
            height={INPUT_HEIGHT}
            style={{ position: 'absolute', left: INPUT_X, top: ACCOUNT_Y }}
          >
            {/* An ID is already there after a signup, or after "remember me":
                the field still to fill is the password. */}
            <input
              className="login-input"
              type="text"
              autoFocus={!Session.username}
              value={Session.username}
              onChange={e => {
                Session.username = e.target.value;
              }}
              maxLength={MAX_USERNAME_LENGTH}
              style={{ paddingLeft: TEXT_INSET_X, paddingTop: TEXT_INSET_Y }}
            />
          </MuSpriteFrame>

          <MuSpriteFrame
            file="login_me.OZT"
            width={INPUT_WIDTH}
            height={INPUT_HEIGHT}
            style={{ position: 'absolute', left: INPUT_X, top: PASSWORD_Y }}
          >
            {/* Empty with a saved login: OK sends the login token instead (improvement loginTokens). */}
            <input
              className="login-input"
              type="password"
              autoFocus={!!Session.username}
              placeholder={Session.savedToken ? t('login.savedLogin') : undefined}
              value={Session.password}
              onChange={e => {
                Session.password = e.target.value;
              }}
              maxLength={MAX_PASSWORD_LENGTH}
              style={{ paddingLeft: TEXT_INSET_X, paddingTop: TEXT_INSET_Y }}
            />
          </MuSpriteFrame>

          {}
          <MuSpriteFrame
            file="op2_ch.OZT"
            y={Session.rememberLogin ? CHECK_SIZE : 0}
            width={CHECK_SIZE}
            height={CHECK_SIZE}
            style={{
              position: 'absolute',
              left: CHECK_X,
              top: CHECK_Y,
              cursor: 'pointer',
              pointerEvents: 'auto',
            }}
            onClick={uiClick(() => (Session.rememberLogin = !Session.rememberLogin))}
          />
          <span
            className="login-label login-remember"
            style={{ left: 130, top: 159 }}
            onClick={uiClick(() => (Session.rememberLogin = !Session.rememberLogin))}
          >
            {t('login.rememberMe')}
          </span>

          <MuButton
            file="message_ok_b_all.OZT"
            width={BUTTON_WIDTH}
            height={BUTTON_HEIGHT}
            frames={{ up: 0, active: 1, down: 2 }}
            color={TEXT_COLOR.brightGray}
            activeColor={TEXT_COLOR.white}
            disabled={Session.loginProcessing}
            onClick={onLoginClicked}
            style={{ position: 'absolute', left: OK_X, top: BUTTON_Y }}
          />
          <MuButton
            file="loding_cancel_b_all.OZT"
            width={BUTTON_WIDTH}
            height={BUTTON_HEIGHT}
            frames={{ up: 0, active: 1, down: 2 }}
            color={TEXT_COLOR.brightGray}
            activeColor={TEXT_COLOR.white}
            onClick={onCancelClicked}
            style={{ position: 'absolute', left: CANCEL_X, top: BUTTON_Y }}
          />

          {/* Swaps this window for the register one. Nothing navigates: the
              scene behind stays where it is, which is the point. */}
          {!!signupApi && (
            <span
              className="login-register"
              style={{ left: REGISTER.x, top: REGISTER.y }}
              onClick={uiClick(openRegister)}
            >
              {t('login.createAccount')}
            </span>
          )}

          {/* A build that knows a signup page but no endpoint. A new tab, not
              this one: leaving would cost the scene the player waited for. */}
          {!!signupPage && (
            <a
              className="login-register"
              href={signupPage}
              target="_blank"
              rel="noopener noreferrer"
              style={{ left: REGISTER.x, top: REGISTER.y }}
              onClick={uiClick()}
            >
              {t('login.createAccount')}
            </a>
          )}

          {}
          <button type="submit" className="login-submit" tabIndex={-1} />
        </form>

        {!!Session.loginError && (
          <p className="login-error">{Session.loginError}</p>
        )}

        {!Session.loginError && !!notice && <p className="login-notice">{notice}</p>}
      </MuSpriteFrame>
    </div>
  );
});
