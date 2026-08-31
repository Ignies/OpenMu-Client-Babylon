import { uiClick } from '../../../libs/sfx';
import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { MuSpriteFrame } from '../../components/muSprite';
import { MuButton } from '../../components/muButton';
import { MuText } from '../../components/muText';
import { DECO, SPRITE as SERVERS_SPRITE, TEXT_COLOR } from '../serversPage/layout';
import { t } from '../../../i18n';
import {
  effective,
  isInsecureWsUrl,
  ServerConfig,
  type ServerProfile,
} from '../../../common/serverConfig';
import { ServerList } from '../../../common/serverList';
import {
  ADD_X,
  BTN_HEIGHT,
  BTN_WIDTH,
  CHECK_SIZE,
  CLOSE_HEIGHT,
  CLOSE_WIDTH,
  CONTENT_TOP,
  DELETE_X,
  FIELD_HEIGHT,
  FIELD_LABEL_H,
  FIELD_STEP,
  FIELD_TOP,
  FIELD_WIDTH,
  FIELD_X,
  LIST_BUTTONS_Y,
  LIST_MAX,
  LIST_ROW_HEIGHT,
  LIST_ROW_WIDTH,
  LIST_TOP,
  LIST_X,
  PAGE_ARROW,
  PAGE_ARROW_Y,
  PAGE_NEXT_X,
  PAGE_PREV_X,
  PORT_WIDTH,
  SETUP_ART_WIDTH,
  SETUP_BOTTOM_HEIGHT,
  SETUP_TITLE_Y,
  SETUP_TOP_HEIGHT,
  SETUP_WIN_WIDTH,
  SPRITE,
  setupMetrics,
} from './layout';

/**
 * Where the client connects, in MU's own settings chrome — the Option
 * window's frame, the server-list row art for the saved servers, and the login
 * window's sunken plate under every field.
 *
 * The ws proxy is a field of its own rather than something derived from the
 * server host because it is a different machine's job: a browser cannot open a
 * TCP socket, so `proxy/main.ts` — yours, or one hosted beside the server — is
 * what dials `csHost:csPort` and then the game server.
 */

type FieldProps = {
  label: string;
  value: string;
  width?: number;
  top: number;
  left?: number;
  disabled?: boolean;
  numeric?: boolean;
  placeholder?: string;
  onChange: (value: string) => void;
};

const Field = ({
  label,
  value,
  width = FIELD_WIDTH,
  top,
  left = FIELD_X,
  disabled,
  numeric,
  placeholder,
  onChange,
}: FieldProps) => (
  <>
    <span className="setup-label" style={{ left, top }}>
      {label}
    </span>
    <MuSpriteFrame
      file={SPRITE.input}
      width={width}
      height={FIELD_HEIGHT}
      style={{
        position: 'absolute',
        left,
        top: top + FIELD_LABEL_H,
        backgroundSize: '100% 100%',
      }}
    >
      <input
        className="setup-input"
        type={numeric ? 'number' : 'text'}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={e => onChange(e.target.value)}
      />
    </MuSpriteFrame>
  </>
);

export const ServerSettings = observer(({ onClose }: { onClose: () => void }) => {
  const [page, setPage] = useState(0);

  const profile: ServerProfile = ServerConfig.active;
  const locked = ServerConfig.lockedByUrl;
  const listed = ServerConfig.activeIsListed;
  const readOnly = ServerConfig.readOnly;
  const live = effective(profile);
  const insecure = isInsecureWsUrl(live.wsUrl);

  const metrics = setupMetrics();

  // Saved servers only: the published list belongs to the Worlds screen, and a
  // row here is something the player can edit or delete.
  const rows = locked ? [profile] : ServerConfig.profiles;
  const pages = Math.max(1, Math.ceil(rows.length / LIST_MAX));
  const current = Math.min(page, pages - 1);
  const visible = rows.slice(current * LIST_MAX, current * LIST_MAX + LIST_MAX);

  const set = (patch: Partial<ServerProfile>) =>
    ServerConfig.update(profile.id, patch);

  // One line under the fields, in order of what the player most needs to know:
  // why the fields are locked, why the proxy will not connect, what this
  // server says about itself, and otherwise where the address comes from.
  const note = locked
    ? { text: t('server.lockedByUrl'), color: TEXT_COLOR.yellow }
    : insecure
      ? { text: t('server.insecure'), color: '#ff6a6a' }
      : listed
        ? {
            // The world's own blurb belongs to the Worlds screen; here the
            // only thing worth saying is that this is not a row you can edit.
            text: t('server.listedHint'),
            color: TEXT_COLOR.yellow,
          }
        : ServerList.state === 'error'
          ? { text: t('server.listOffline'), color: TEXT_COLOR.yellow }
          : { text: t('server.proxyHint'), color: TEXT_COLOR.brightGray };

  return (
    <div
      className="setup-win"
      style={{ width: SETUP_WIN_WIDTH, height: metrics.height }}
    >
      {/* The Option window's frame: stone fill, side rails, mirrored bands. */}
      <MuSpriteFrame
        file={SPRITE.optionFill}
        width={SETUP_WIN_WIDTH - 6}
        height={metrics.height - 6}
        style={{
          position: 'absolute',
          left: 3,
          top: 3,
          backgroundRepeat: 'repeat',
        }}
      />
      <MuSpriteFrame
        file={SPRITE.optionRailLeft}
        width={5}
        height={metrics.height - SETUP_TOP_HEIGHT - SETUP_BOTTOM_HEIGHT}
        style={{
          position: 'absolute',
          left: 0,
          top: SETUP_TOP_HEIGHT,
          backgroundRepeat: 'repeat-y',
        }}
      />
      <MuSpriteFrame
        file={SPRITE.optionRailRight}
        width={5}
        height={metrics.height - SETUP_TOP_HEIGHT - SETUP_BOTTOM_HEIGHT}
        style={{
          position: 'absolute',
          right: 0,
          top: SETUP_TOP_HEIGHT,
          backgroundRepeat: 'repeat-y',
        }}
      />
      {[false, true].map(mirrored => (
        <MuSpriteFrame
          key={`top-${mirrored}`}
          file={SPRITE.optionTop}
          width={SETUP_ART_WIDTH}
          height={SETUP_TOP_HEIGHT}
          style={{
            position: 'absolute',
            left: mirrored ? SETUP_ART_WIDTH : 0,
            top: 0,
            ...(mirrored && { transform: 'scaleX(-1)' }),
          }}
        />
      ))}
      {[false, true].map(mirrored => (
        <MuSpriteFrame
          key={`bottom-${mirrored}`}
          file={SPRITE.optionBottom}
          width={SETUP_ART_WIDTH}
          height={SETUP_BOTTOM_HEIGHT}
          style={{
            position: 'absolute',
            left: mirrored ? SETUP_ART_WIDTH : 0,
            bottom: 0,
            ...(mirrored && { transform: 'scaleX(-1)' }),
          }}
        />
      ))}

      <div className="setup-title" style={{ top: SETUP_TITLE_Y }}>
        {t('server.title')}
      </div>

      {/* The servers: what the player saved, then what the published list
          carries. The selected one is named in gold, as the original marks the
          chosen row of a list. */}
      <span className="setup-label" style={{ left: LIST_X, top: CONTENT_TOP }}>
        {t('server.list')}
        {pages > 1 && ` ${current + 1}/${pages}`}
      </span>

      {/* Paging, in the server-list screen's own arrows — only once there is
          more than a page to turn. */}
      {pages > 1 &&
        (
          [
            { key: 'prev', rect: DECO.arrowLeft, x: PAGE_PREV_X, step: -1 },
            { key: 'next', rect: DECO.arrowRight, x: PAGE_NEXT_X, step: 1 },
          ] as const
        ).map(arrow => (
          <MuSpriteFrame
            key={arrow.key}
            file={SERVERS_SPRITE.deco}
            {...arrow.rect}
            style={{
              position: 'absolute',
              left: arrow.x,
              top: PAGE_ARROW_Y,
              width: PAGE_ARROW.width,
              height: PAGE_ARROW.height,
              cursor: 'pointer',
              pointerEvents: 'auto',
            }}
            onClick={uiClick(() =>
              setPage((current + arrow.step + pages) % pages)
            )}
          />
        ))}

      {/* The empty slots are drawn as well, so the column reads as a list
          rather than a button or two floating over stone. */}
      {Array.from({ length: LIST_MAX }, (_, i) => (
        <MuSpriteFrame
          key={`slot-${i}`}
          file={SPRITE.menuButton}
          width={LIST_ROW_WIDTH}
          height={LIST_ROW_HEIGHT}
          style={{
            position: 'absolute',
            left: LIST_X,
            top: LIST_TOP + LIST_ROW_HEIGHT * i,
            opacity: 0.45,
          }}
        />
      ))}

      {visible.map((p, i) => {
        const selected = p.id === profile.id;

        return (
          <MuButton
            key={p.id}
            file={SPRITE.menuButton}
            width={LIST_ROW_WIDTH}
            height={LIST_ROW_HEIGHT}
            frames={{ up: 0, active: 1, down: 2 }}
            color={selected ? TEXT_COLOR.brightYellow : TEXT_COLOR.brightGray}
            activeColor={TEXT_COLOR.white}
            label={p.name.trim() || t('server.unnamed')}
            onClick={() => ServerConfig.select(p.id)}
            style={{
              position: 'absolute',
              left: LIST_X,
              top: LIST_TOP + LIST_ROW_HEIGHT * i,
            }}
            labelStyle={{ fontSize: 11 }}
          >
            {/* A published row wears its language tag on the right, which is
                also what tells it apart from a saved one. */}
            {p.language && (
              <span className="setup-row-tag">{p.language.toUpperCase()}</span>
            )}
          </MuButton>
        );
      })}


      <MuButton
        file={SPRITE.button}
        width={BTN_WIDTH}
        height={BTN_HEIGHT}
        frames={{ up: 0, active: 1, down: 2 }}
        color={TEXT_COLOR.brightGray}
        activeColor={TEXT_COLOR.white}
        disabled={locked}
        // On a published server this is how you take a copy you can edit; on a
        // saved one it is a new blank server.
        label={listed ? t('server.copy') : t('server.add')}
        onClick={() =>
          ServerConfig.add(listed ? {} : { name: t('server.newServer') })
        }
        style={{ position: 'absolute', left: ADD_X, top: LIST_BUTTONS_Y }}
        labelStyle={{ fontSize: 11 }}
      />
      <MuButton
        file={SPRITE.button}
        width={BTN_WIDTH}
        height={BTN_HEIGHT}
        frames={{ up: 0, active: 1, down: 2 }}
        color={TEXT_COLOR.brightGray}
        activeColor={TEXT_COLOR.white}
        disabled={readOnly || ServerConfig.profiles.length < 2}
        label={t('server.delete')}
        onClick={() => ServerConfig.remove(ServerConfig.activeId)}
        style={{ position: 'absolute', left: DELETE_X, top: LIST_BUTTONS_Y }}
        labelStyle={{ fontSize: 11 }}
      />

      {/* The selected server's fields. */}
      <Field
        label={t('server.name')}
        value={profile.name}
        top={FIELD_TOP}
        disabled={readOnly}
        onChange={name => set({ name })}
      />
      <Field
        label={t('server.connectServer')}
        value={profile.csHost}
        top={FIELD_TOP + FIELD_STEP}
        disabled={readOnly}
        placeholder="play.example.com"
        onChange={csHost => set({ csHost })}
      />
      <Field
        label={t('server.port')}
        value={profile.csPort ? String(profile.csPort) : ''}
        width={PORT_WIDTH}
        top={FIELD_TOP + FIELD_STEP * 2}
        disabled={readOnly}
        numeric
        placeholder="44405"
        onChange={port => set({ csPort: Number(port) })}
      />
      <Field
        label={t('server.proxy')}
        value={profile.wsUrl}
        top={FIELD_TOP + FIELD_STEP * 3}
        disabled={readOnly}
        placeholder="ws://localhost:3000"
        onChange={wsUrl => set({ wsUrl })}
      />
      {/* `auto` vs `csHost`: one checkbox, because the second option is just
          "do not". The retry that makes `auto` safe lives in the store. */}
      <>
          <MuSpriteFrame
            file={SPRITE.check}
            y={profile.gsAddress === 'auto' ? CHECK_SIZE : 0}
            width={CHECK_SIZE}
            height={CHECK_SIZE}
            style={{
              position: 'absolute',
              left: metrics.checkX,
              top: metrics.checkY,
              cursor: readOnly ? 'default' : 'pointer',
              pointerEvents: readOnly ? 'none' : 'auto',
              opacity: readOnly ? 0.5 : 1,
            }}
            onClick={uiClick(() =>
              set({ gsAddress: profile.gsAddress === 'auto' ? 'csHost' : 'auto' })
            )}
          />
          <span
            className="setup-label setup-check-label"
            style={{
              left: metrics.checkX + CHECK_SIZE + 6,
              top: metrics.checkY + 2,
              color: readOnly ? '#a0a0a0' : undefined,
            }}
            onClick={uiClick(() => {
              if (!readOnly) {
                set({
                  gsAddress: profile.gsAddress === 'auto' ? 'csHost' : 'auto',
                });
              }
            })}
          >
            {t('server.trustAddress')}
          </span>
      </>

      {/* What will actually be dialled, and why it might not work. */}
      <MuText
        face="fix"
        className="setup-line"
        color={TEXT_COLOR.brightYellow}
        style={{ top: metrics.previewY }}
        text={`${live.wsUrl}  →  ${live.csHost}:${live.csPort}`}
      />
      <MuText
        className="setup-line"
        color={note.color}
        style={{ top: metrics.noteY }}
        text={note.text}
      />

      <MuButton
        file={SPRITE.button}
        width={CLOSE_WIDTH}
        height={CLOSE_HEIGHT}
        frames={{ up: 0, active: 1, down: 2 }}
        color={TEXT_COLOR.brightGray}
        activeColor={TEXT_COLOR.white}
        label={t('common.close')}
        onClick={onClose}
        style={{
          position: 'absolute',
          left: (SETUP_WIN_WIDTH - CLOSE_WIDTH) / 2,
          top: metrics.closeY,
        }}
        labelStyle={{ fontSize: 11 }}
      />
    </div>
  );
});
