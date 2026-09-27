import { observer } from 'mobx-react-lite';
import { uiClick } from '../../../libs/sfx';
import { t } from '../../../i18n';
import {
  effective,
  isInsecureWsUrl,
  ServerConfig,
  type ServerProfile,
} from '../../../common/serverConfig';
import { ServerList } from '../../../common/serverList';
import { Button, Icon, TextField, Toggle } from './controls';

/**
 * Where the client connects: the servers this player saved, and the selected
 * one's fields.
 *
 * The ws proxy is its own field rather than something derived from the host
 * because it is another machine's job: a browser cannot open a TCP socket, so
 * `proxy/main.ts` - yours, or one hosted beside the server - dials `csHost`.
 */
export const SetupView = observer(() => {
  const profile: ServerProfile = ServerConfig.active;
  const locked = ServerConfig.lockedByUrl;
  const listed = ServerConfig.activeIsListed;
  const readOnly = ServerConfig.readOnly;
  const live = effective(profile);
  const insecure = isInsecureWsUrl(live.wsUrl);

  // Saved servers only: the published list belongs to the worlds tab.
  const rows = locked ? [profile] : ServerConfig.profiles;

  const set = (patch: Partial<ServerProfile>) => ServerConfig.update(profile.id, patch);

  // What the player most needs to know first: why the fields are locked, why
  // the proxy will not connect, and otherwise where the address comes from.
  const note = locked
    ? { text: t('server.lockedByUrl'), tone: 'warn' }
    : insecure
      ? { text: t('server.insecure'), tone: 'bad' }
      : listed
        ? { text: t('server.listedHint'), tone: 'warn' }
        : ServerList.state === 'error'
          ? { text: t('server.listOffline'), tone: 'warn' }
          : { text: t('server.proxyHint'), tone: '' };

  return (
    <div className="ws-split scrollable">
      <div className="ws-split-list">
        <h3 className="ws-subhead">{t('server.list')}</h3>

        <div className="ws-rows ws-rows-scroll scrollable">
          {rows.map(p => (
            <button
              type="button"
              key={p.id}
              className={`ws-row${p.id === profile.id ? ' is-on' : ''}`}
              onClick={uiClick(() => ServerConfig.select(p.id))}
            >
              <Icon name="server" />
              <span className="ws-row-name">{p.name.trim() || t('server.unnamed')}</span>
              {p.language && <span className="ws-tag">{p.language.toUpperCase()}</span>}
            </button>
          ))}
        </div>

        <div className="ws-row-actions">
          {/* On a published world this takes a copy to edit; on a saved one it
              is a new blank server. */}
          <Button
            icon="plus"
            small
            disabled={locked}
            onClick={() => ServerConfig.add(listed ? {} : { name: t('server.newServer') })}
          >
            {listed ? t('server.copy') : t('server.add')}
          </Button>
          <Button
            variant="ghost"
            small
            disabled={readOnly || ServerConfig.profiles.length < 2}
            onClick={() => ServerConfig.remove(ServerConfig.activeId)}
          >
            {t('server.delete')}
          </Button>
        </div>
      </div>

      <div className="ws-split-form scrollable">
        <div className="ws-form ws-form-grid">
          <TextField
            label={t('server.name')}
            value={profile.name}
            disabled={readOnly}
            onChange={name => set({ name })}
          />
          <div className="ws-form-pair">
            <TextField
              label={t('server.connectServer')}
              value={profile.csHost}
              disabled={readOnly}
              mono
              placeholder="play.example.com"
              onChange={csHost => set({ csHost })}
            />
            <TextField
              label={t('server.port')}
              value={profile.csPort ? String(profile.csPort) : ''}
              disabled={readOnly}
              numeric
              mono
              placeholder="44405"
              onChange={port => set({ csPort: Number(port) })}
            />
          </div>
          <TextField
            label={t('server.proxy')}
            value={profile.wsUrl}
            disabled={readOnly}
            mono
            placeholder="ws://localhost:3000"
            onChange={wsUrl => set({ wsUrl })}
          />
          {/* `auto` against `csHost`: the retry that makes `auto` safe lives in the store. */}
          <Toggle
            checked={profile.gsAddress === 'auto'}
            disabled={readOnly}
            label={t('server.trustAddress')}
            onChange={on => set({ gsAddress: on ? 'auto' : 'csHost' })}
          />
        </div>

        <div className="ws-route ws-mono">
          {live.wsUrl}
          <Icon name="chevron" />
          {live.csHost}:{live.csPort}
        </div>
        <p className={`ws-note${note.tone ? ` is-${note.tone}` : ''}`}>{note.text}</p>
      </div>
    </div>
  );
});
