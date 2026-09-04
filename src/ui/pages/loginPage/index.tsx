import { t } from '../../../i18n';
import { uiClick } from '../../../libs/sfx';
import './style.less';
import { observer } from 'mobx-react-lite';
import { Store, UIState } from '../../../store';
import { MAX_PASSWORD_LENGTH, MAX_USERNAME_LENGTH } from '../../../consts';
import { registerUrl } from '../../../common/serverServices';
import { MuSpriteFrame } from '../../components/muSprite';
import { MuText } from '../../components/muText';
import { MuLogo } from '../../components/muLogo';
import { MuButton } from '../../components/muButton';
import { TEXT_COLOR } from '../serversPage/layout';

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
 * The signup link, on the checkbox row and left of it. That band is the only
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

export const LoginPage = observer(() => {
  // The world being logged into, not the build: a client plays any world, and
  // each one has its own signup page.
  const signup = registerUrl();

  const onLoginClicked = () => {
    if (Store.loginProcessing) return;

    if (!Store.username || !Store.password) {
      Store.loginError = t('login.enterCredentials');
      return;
    }

    Store.loginError = undefined;
    Store.loginProcessing = true;

    Store.loginRequest(Store.username, Store.password);
  };

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
        {Store.selectedServer && (
          <MuText
            face="fix"
            className="login-server-line"
            style={{ left: SERVER_LINE.x, top: SERVER_LINE.y }}
            text={`${Store.selectedServer.name} Ch. ${Store.selectedServer.channel}`}
          />
        )}
        <form
          onSubmit={e => {
            e.preventDefault();
            onLoginClicked();
          }}
        >
          <span className="login-label" style={{ left: LABEL_X, top: 113 }}>
            ID
          </span>
          <span className="login-label" style={{ left: LABEL_X, top: 139 }}>
            Password
          </span>

          <MuSpriteFrame
            file="login_me.OZT"
            width={INPUT_WIDTH}
            height={INPUT_HEIGHT}
            style={{ position: 'absolute', left: INPUT_X, top: ACCOUNT_Y }}
          >
            <input
              className="login-input"
              type="text"
              autoFocus
              value={Store.username}
              onChange={e => {
                Store.username = e.target.value;
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
            <input
              className="login-input"
              type="password"
              value={Store.password}
              onChange={e => {
                Store.password = e.target.value;
              }}
              maxLength={MAX_PASSWORD_LENGTH}
              style={{ paddingLeft: TEXT_INSET_X, paddingTop: TEXT_INSET_Y }}
            />
          </MuSpriteFrame>

          {}
          <MuSpriteFrame
            file="op2_ch.OZT"
            y={Store.rememberLogin ? CHECK_SIZE : 0}
            width={CHECK_SIZE}
            height={CHECK_SIZE}
            style={{
              position: 'absolute',
              left: CHECK_X,
              top: CHECK_Y,
              cursor: 'pointer',
              pointerEvents: 'auto',
            }}
            onClick={uiClick(() => (Store.rememberLogin = !Store.rememberLogin))}
          />
          <span
            className="login-label login-remember"
            style={{ left: 130, top: 159 }}
            onClick={uiClick(() => (Store.rememberLogin = !Store.rememberLogin))}
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
            disabled={Store.loginProcessing}
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
            onClick={() => {
              Store.username = '';
              Store.password = '';
            }}
            style={{ position: 'absolute', left: CANCEL_X, top: BUTTON_Y }}
          />

          {/* Only when there is a page to send them to. A new tab, not this
              one: leaving would drop the connection and cost the player the
              scene they just waited for. */}
          {!!signup && (
            <a
              className="login-register"
              href={signup}
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

        {!!Store.loginError && (
          <p className="login-error">{Store.loginError}</p>
        )}
      </MuSpriteFrame>
    </div>
  );
});
