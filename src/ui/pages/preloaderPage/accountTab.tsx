import { uiClick } from '../../../libs/sfx';
import { observer } from 'mobx-react-lite';
import { MuSpriteFrame } from '../../components/muSprite';
import { MuButton } from '../../components/muButton';
import { MuText } from '../../components/muText';
import { TEXT_COLOR } from '../serversPage/layout';
import { t } from '../../../i18n';
import { MAX_PASSWORD_LENGTH, MAX_USERNAME_LENGTH } from '../../../consts';
import { ServerConfig, type ServerProfile } from '../../../common/serverConfig';
import { ServerAccounts } from '../../../common/serverAccounts';
import { Field } from './frame';
import {
  ACCOUNT_ROWS,
  ADD_X,
  BTN_HEIGHT,
  BTN_WIDTH,
  CHECK_SIZE,
  CONTENT_TOP,
  DELETE_X,
  FIELD_STEP,
  FIELD_TOP,
  FIELD_X,
  LIST_ROW_HEIGHT,
  LIST_ROW_WIDTH,
  LIST_X,
  SPRITE,
  accountMetrics,
} from './layout';

/**
 * The accounts this player uses on the chosen world, saved against that world.
 *
 * One client plays every world, so one saved login was always wrong: the name
 * that works on one server means nothing on another, and the pre-rework client
 * handed whatever it had to whichever world was entered next. And one per world
 * is the same mistake a size smaller - a main and a mule on the same server is
 * ordinary, so this is a list. The row in gold is the one the login window will
 * be holding when Enter opens it.
 *
 * The note at the bottom is not decoration. These fields go to this browser's
 * localStorage in plain text, which is what the client has always done with the
 * one account it kept - saying so is the only honest way to offer the box.
 */

export const AccountTab = observer(({ world }: { world: ServerProfile }) => {
  const metrics = accountMetrics();
  const rows = ServerAccounts.list(world.id);
  const account = ServerAccounts.of(world.id);
  const activeId = ServerAccounts.activeId(world.id);

  // Nothing to save against: the URL profile is gone next launch, and the
  // placeholder world is not a world at all.
  const readOnly = ServerConfig.lockedByUrl || ServerConfig.isEmpty;
  // A world with no account yet has empty fields and nothing to type into:
  // Add is the way in, exactly as it is on the setup tab.
  const editable = !readOnly && !!account.id;

  const set = (patch: Parameters<typeof ServerAccounts.update>[2]) =>
    ServerAccounts.update(world.id, account.id, patch);

  const toggleRemember = () => {
    if (editable) set({ remember: !account.remember });
  };

  return (
    <>
      <span className="setup-label" style={{ left: LIST_X, top: CONTENT_TOP }}>
        {t('account.list', {
          world: world.name.trim() || t('server.unnamed'),
        })}
      </span>

      {/* The empty slots are drawn as well, so the column reads as a list
          rather than a button or two floating over stone. */}
      {Array.from({ length: ACCOUNT_ROWS }, (_, i) => (
        <MuSpriteFrame
          key={`slot-${i}`}
          file={SPRITE.menuButton}
          width={LIST_ROW_WIDTH}
          height={LIST_ROW_HEIGHT}
          style={{
            position: 'absolute',
            left: LIST_X,
            top: metrics.listTop + LIST_ROW_HEIGHT * i,
            opacity: 0.45,
          }}
        />
      ))}

      {rows.slice(0, ACCOUNT_ROWS).map((row, i) => (
        <MuButton
          key={row.id}
          file={SPRITE.menuButton}
          width={LIST_ROW_WIDTH}
          height={LIST_ROW_HEIGHT}
          frames={{ up: 0, active: 1, down: 2 }}
          color={
            row.id === activeId ? TEXT_COLOR.brightYellow : TEXT_COLOR.brightGray
          }
          activeColor={TEXT_COLOR.white}
          label={row.username || t('account.unnamed')}
          onClick={() => ServerAccounts.select(world.id, row.id)}
          style={{
            position: 'absolute',
            left: LIST_X,
            top: metrics.listTop + LIST_ROW_HEIGHT * i,
          }}
          labelStyle={{ fontSize: 11 }}
        >
          {/* No password kept on this row: the name is remembered and the
              secret is typed each time, which is what the box below means. */}
          {!row.remember && (
            <span className="setup-row-tag">{t('account.notKept')}</span>
          )}
        </MuButton>
      ))}

      <MuButton
        file={SPRITE.button}
        width={BTN_WIDTH}
        height={BTN_HEIGHT}
        frames={{ up: 0, active: 1, down: 2 }}
        color={TEXT_COLOR.brightGray}
        activeColor={TEXT_COLOR.white}
        label={t('server.add')}
        disabled={readOnly || !ServerAccounts.canAdd(world.id)}
        onClick={() => ServerAccounts.add(world.id)}
        style={{ position: 'absolute', left: ADD_X, top: metrics.buttonsY }}
        labelStyle={{ fontSize: 11 }}
      />
      <MuButton
        file={SPRITE.button}
        width={BTN_WIDTH}
        height={BTN_HEIGHT}
        frames={{ up: 0, active: 1, down: 2 }}
        color={TEXT_COLOR.brightGray}
        activeColor={TEXT_COLOR.white}
        label={t('server.delete')}
        disabled={!editable}
        onClick={() => ServerAccounts.forget(world.id, account.id)}
        style={{ position: 'absolute', left: DELETE_X, top: metrics.buttonsY }}
        labelStyle={{ fontSize: 11 }}
      />

      <Field
        label={t('login.id')}
        value={account.username}
        top={FIELD_TOP}
        disabled={!editable}
        maxLength={MAX_USERNAME_LENGTH}
        placeholder={editable ? '' : t('account.addFirst')}
        onChange={username => set({ username })}
      />
      <Field
        label={t('login.password')}
        value={account.password}
        top={FIELD_TOP + FIELD_STEP}
        disabled={!editable || !account.remember}
        password
        maxLength={MAX_PASSWORD_LENGTH}
        onChange={password => set({ password })}
      />

      {/* A row exists because the player put it there, so this is about the
          secret rather than the row: off keeps the name and forgets the
          password. Delete is how a row goes away. */}
      <MuSpriteFrame
        file={SPRITE.check}
        y={account.remember ? CHECK_SIZE : 0}
        width={CHECK_SIZE}
        height={CHECK_SIZE}
        style={{
          position: 'absolute',
          left: FIELD_X,
          top: metrics.checkY,
          cursor: editable ? 'pointer' : 'default',
          pointerEvents: editable ? 'auto' : 'none',
          opacity: editable ? 1 : 0.5,
        }}
        onClick={uiClick(toggleRemember)}
      />
      <span
        className="setup-label setup-check-label"
        style={{
          left: FIELD_X + CHECK_SIZE + 6,
          top: metrics.checkY + 2,
          color: editable ? undefined : '#a0a0a0',
        }}
        onClick={uiClick(toggleRemember)}
      >
        {t('account.keepPassword')}
      </span>

      <MuText
        className="setup-line"
        color={TEXT_COLOR.brightGray}
        style={{ top: metrics.noteY }}
        text={readOnly ? t('account.cannotSave') : t('account.storedLocally')}
      />
      <MuText
        className="setup-line"
        color={TEXT_COLOR.yellow}
        style={{ top: metrics.noteY + 13 }}
        text={
          rows.length
            ? t('account.entersAs', {
                name: account.username || t('account.unnamed'),
              })
            : t('account.needSignup')
        }
      />
    </>
  );
});
