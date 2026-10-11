import { MuWindows } from '@/controllers/interface/windowManager';
/**
 * The 0.97d login window: the engraved `Logo/0Account.OZT` plate, drawn over
 * the ship scene.
 *
 * The plate is the layout. Its slots were measured off the 250x216 art (the
 * two engraved input wells at x 99, y 48 and y 70, exactly the size of
 * `0Text_Box.OZJ`; four raised 70x19 button beds that `0On_Botton.OZJ` fills;
 * a tab at the foot). The 0.97d client's own source is not in the reference
 * tree - only the Season 6 one, which draws a different window - so which
 * action sat on which bed is this client's choice, not a port.
 */
import { observer } from 'mobx-react-lite';
import { t } from '@/i18n';
import { Servers } from '@/modules/servers';
import { Session } from '@/modules/session';
import {
  MAX_PASSWORD_LENGTH,
  MAX_USERNAME_LENGTH,
} from '@/modules/servers/serverAccounts';
import { MuSpriteFrame } from '@/controllers/interface/components/mu_sprite';
import { MuButton } from '@/controllers/interface/components/mu_button';
import './style.less';

const PLATE = { file: 'Data/Logo/0Account.OZT', width: 250, height: 216 };

const FIELD = { file: 'Data/Logo/0Text_Box.OZJ', width: 124, height: 16 };

const BUTTON = { file: 'Data/Logo/0On_Botton.OZJ', width: 70, height: 19 };

const FIELD_X = 99;
const ACCOUNT_Y = 48;
const PASSWORD_Y = 70;

const LABEL_X = 30;

const BUTTONS = {
  connect: { x: 90, y: 95 },
  cancel: { x: 90, y: 118 },
  remember: { x: 52, y: 141 },
  options: { x: 128, y: 141 },
} as const;

/** The tab at the foot of the plate: the server the list picked. */
const SERVER_TAB = { x: 90, y: 180, width: 70, height: 19 };

const TEXT_COLOR = '#c8bfae';
const ACTIVE_COLOR = '#ffffff';

// 70x19 beds: the label has to live inside one.
const LABEL_STYLE = { fontSize: 9, whiteSpace: 'nowrap' } as const;

export const V097dLoginPage = observer(() => {
  const onLoginClicked = () => {
    if (Session.loginProcessing) return;

    if (!Session.canSubmitLogin) {
      Session.loginError = t('login.enterCredentials');
      return;
    }

    Session.loginError = undefined;
    Session.loginProcessing = true;

    Session.submitLogin();
  };

  return (
    <div className="v097d-login-page">
      <MuSpriteFrame
        file={PLATE.file}
        width={PLATE.width}
        height={PLATE.height}
        className="v097d-login-plate"
      >
        <form
          onSubmit={e => {
            e.preventDefault();
            onLoginClicked();
          }}
        >
          <span className="v097d-login-label" style={{ left: LABEL_X, top: ACCOUNT_Y }}>
            ID
          </span>
          <span
            className="v097d-login-label"
            style={{ left: LABEL_X, top: PASSWORD_Y }}
          >
            Pass
          </span>

          <MuSpriteFrame
            file={FIELD.file}
            width={FIELD.width}
            height={FIELD.height}
            style={{ position: 'absolute', left: FIELD_X, top: ACCOUNT_Y }}
          >
            <input
              className="v097d-login-input"
              type="text"
              autoFocus
              value={Session.username}
              onChange={e => {
                Session.username = e.target.value;
              }}
              maxLength={MAX_USERNAME_LENGTH}
            />
          </MuSpriteFrame>

          <MuSpriteFrame
            file={FIELD.file}
            width={FIELD.width}
            height={FIELD.height}
            style={{ position: 'absolute', left: FIELD_X, top: PASSWORD_Y }}
          >
            <input
              className="v097d-login-input"
              type="password"
              placeholder={Session.savedToken ? t('login.savedLogin') : undefined}
              value={Session.password}
              onChange={e => {
                Session.password = e.target.value;
              }}
              maxLength={MAX_PASSWORD_LENGTH}
            />
          </MuSpriteFrame>

          <MuButton
            file={BUTTON.file}
            width={BUTTON.width}
            height={BUTTON.height}
            frames={{ up: 0 }}
            label={t('common.ok')}
            labelStyle={LABEL_STYLE}
            color={TEXT_COLOR}
            activeColor={ACTIVE_COLOR}
            disabled={Session.loginProcessing}
            onClick={onLoginClicked}
            style={{
              position: 'absolute',
              left: BUTTONS.connect.x,
              top: BUTTONS.connect.y,
            }}
          />

          <MuButton
            file={BUTTON.file}
            width={BUTTON.width}
            height={BUTTON.height}
            frames={{ up: 0 }}
            label={t('common.cancel')}
            labelStyle={LABEL_STYLE}
            color={TEXT_COLOR}
            activeColor={ACTIVE_COLOR}
            onClick={() => {
              Session.username = '';
              Session.password = '';
            }}
            style={{
              position: 'absolute',
              left: BUTTONS.cancel.x,
              top: BUTTONS.cancel.y,
            }}
          />

          <MuButton
            file={BUTTON.file}
            width={BUTTON.width}
            height={BUTTON.height}
            frames={{ up: 0 }}
            label={Session.rememberLogin ? 'Save ID' : 'No save'}
            labelStyle={LABEL_STYLE}
            color={TEXT_COLOR}
            activeColor={ACTIVE_COLOR}
            onClick={() => (Session.rememberLogin = !Session.rememberLogin)}
            style={{
              position: 'absolute',
              left: BUTTONS.remember.x,
              top: BUTTONS.remember.y,
            }}
          />

          <MuButton
            file={BUTTON.file}
            width={BUTTON.width}
            height={BUTTON.height}
            frames={{ up: 0 }}
            label={t('options.title')}
            labelStyle={LABEL_STYLE}
            color={TEXT_COLOR}
            activeColor={ACTIVE_COLOR}
            onClick={() => (MuWindows.setOpen('options', true))}
            style={{
              position: 'absolute',
              left: BUTTONS.options.x,
              top: BUTTONS.options.y,
            }}
          />

          <button type="submit" className="v097d-login-submit" tabIndex={-1} />
        </form>

        {Servers.selectedServer && (
          <span
            className="v097d-login-server"
            style={{
              left: SERVER_TAB.x,
              top: SERVER_TAB.y,
              width: SERVER_TAB.width,
              height: SERVER_TAB.height,
            }}
          >
            {`${Servers.selectedServer.name} ${Servers.selectedServer.channel}`}
          </span>
        )}

        {!!Session.loginError && (
          <p className="v097d-login-error">{Session.loginError}</p>
        )}
      </MuSpriteFrame>
    </div>
  );
});
