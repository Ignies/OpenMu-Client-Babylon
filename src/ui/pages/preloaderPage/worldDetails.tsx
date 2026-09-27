import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { uiClick } from '../../../libs/sfx';
import { t } from '../../../i18n';
import { MAX_PASSWORD_LENGTH, MAX_USERNAME_LENGTH } from '../../../consts';
import {
  displayAddress,
  effective,
  playableHere,
  ServerConfig,
  type ServerProfile,
} from '../../../common/serverConfig';
import { ServerAccounts } from '../../../common/serverAccounts';
import { ServerProbe } from '../../../common/serverProbe';
import { Button, Icon, TextField, Toggle } from './controls';
import { Banner, REACH_TEXT } from './banner';

/**
 * The chosen world, beside the grid: what it says about itself before a single
 * packet is sent, and the accounts this browser keeps for it.
 *
 * The published list is the only place a world names its game servers - the
 * connect server sends ids and load, no text - and one client plays every
 * world, so "do I have an account over there" is a question about this world.
 */

type Pane = 'info' | 'account';

/** `Valhalla - Peaceful, Hard`, or the numbered default for an unnamed group. */
function serverLine(server: { id: number; name: string; channels: { name: string }[] }) {
  const name = server.name || t('servers.serverName', { number: server.id });
  const channels = server.channels.map(c => c.name).join(', ');

  return channels ? `${name} - ${channels}` : name;
}

const InfoPane = observer(({ world, clients }: { world: ServerProfile; clients: string[] }) => {
  const live = effective(world);
  const account = ServerAccounts.of(world.id);
  const reach = ServerProbe.of(world.id);
  const playable = playableHere(world);
  const servers = world.servers ?? [];

  const facts: { label: string; value: string; tone?: 'ok' | 'bad' | 'gold'; mono?: boolean }[] = [
    {
      label: t('info.client'),
      value: playable
        ? world.version || t('info.anyClient')
        : t('worlds.needsClient', { world: world.version ?? '', client: clients.join(', ') }),
      tone: playable ? undefined : 'bad',
    },
    { label: t('info.address'), value: displayAddress(world), mono: true },
    { label: t('info.route'), value: `${live.wsUrl} → ${live.csHost}:${live.csPort}`, mono: true },
    {
      label: t('info.status'),
      value: reach === 'unknown' ? t('info.notChecked') : t(REACH_TEXT[reach]),
      tone: reach === 'up' ? 'ok' : reach === 'down' ? 'bad' : undefined,
    },
    {
      label: t('info.account'),
      value: account.username || t('info.noAccount'),
      tone: account.username ? 'gold' : undefined,
    },
    {
      label: t('info.lastLogin'),
      value: account.lastLoginAt
        ? new Date(account.lastLoginAt).toLocaleDateString()
        : world.id === ServerConfig.lastPlayedId
          ? t('worlds.lastPlayed')
          : t('info.never'),
    },
  ];

  return (
    <>
      <p className="ws-desc">{world.description || t('info.noDescription')}</p>

      <dl className="ws-facts">
        {facts.map(fact => (
          <div key={fact.label} className="ws-fact" title={`${fact.label}: ${fact.value}`}>
            <dt>{fact.label}</dt>
            <dd className={`${fact.mono ? 'ws-mono' : ''}${fact.tone ? ` is-${fact.tone}` : ''}`}>
              {fact.value}
            </dd>
          </div>
        ))}
      </dl>

      <h3 className="ws-subhead">{t('info.gameServers')}</h3>
      {servers.length ? (
        <ul className="ws-servers">
          {servers.map(server => (
            <li key={server.id}>
              <Icon name="server" />
              <span>{serverLine(server)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="ws-muted">{t('info.noGameServers')}</p>
      )}
    </>
  );
});

/**
 * Several accounts per world - a main and a mule on one server is ordinary. The
 * highlighted row is the one the login window will hold when Enter opens it.
 * These go to this browser's storage in plain text, and the note says so.
 */
const AccountPane = observer(({ world }: { world: ServerProfile }) => {
  const rows = ServerAccounts.list(world.id);
  const account = ServerAccounts.of(world.id);
  const activeId = ServerAccounts.activeId(world.id);

  // The URL profile is gone next launch, and the placeholder is not a world.
  const readOnly = ServerConfig.lockedByUrl || ServerConfig.isEmpty;
  const editable = !readOnly && !!account.id;

  const set = (patch: Parameters<typeof ServerAccounts.update>[2]) =>
    ServerAccounts.update(world.id, account.id, patch);

  return (
    <>
      <h3 className="ws-subhead">
        {t('account.list', { world: world.name.trim() || t('server.unnamed') })}
      </h3>

      {rows.length > 0 && (
        <div className="ws-rows">
          {rows.map(row => (
            <button
              type="button"
              key={row.id}
              className={`ws-row${row.id === activeId ? ' is-on' : ''}`}
              onClick={uiClick(() => ServerAccounts.select(world.id, row.id))}
            >
              <Icon name="user" />
              <span className="ws-row-name">{row.username || t('account.unnamed')}</span>
              {/* The name is kept and the password asked for each time. */}
              {!row.remember && <span className="ws-tag">{t('account.notKept')}</span>}
            </button>
          ))}
        </div>
      )}

      <div className="ws-row-actions">
        <Button
          icon="plus"
          small
          disabled={readOnly || !ServerAccounts.canAdd(world.id)}
          onClick={() => ServerAccounts.add(world.id)}
        >
          {t('server.add')}
        </Button>
        <Button
          variant="ghost"
          small
          disabled={!editable}
          onClick={() => ServerAccounts.forget(world.id, account.id)}
        >
          {t('server.delete')}
        </Button>
      </div>

      <div className="ws-form">
        <TextField
          label={t('login.id')}
          value={account.username}
          disabled={!editable}
          maxLength={MAX_USERNAME_LENGTH}
          placeholder={editable ? '' : t('account.addFirst')}
          onChange={username => set({ username })}
        />
        <TextField
          label={t('login.password')}
          value={account.password}
          disabled={!editable || !account.remember}
          password
          maxLength={MAX_PASSWORD_LENGTH}
          revealLabels={{ show: t('worlds.showPassword'), hide: t('worlds.hidePassword') }}
          onChange={password => set({ password })}
        />
        <Toggle
          checked={account.remember}
          disabled={!editable}
          label={t('account.keepPassword')}
          onChange={remember => set({ remember })}
        />
      </div>

      <p className="ws-note">{readOnly ? t('account.cannotSave') : t('account.storedLocally')}</p>
      <p className="ws-note is-gold">
        {rows.length
          ? t('account.entersAs', { name: account.username || t('account.unnamed') })
          : t('account.needSignup')}
      </p>
    </>
  );
});

export const WorldDetails = observer(
  ({ world, clients }: { world: ServerProfile; clients: string[] }) => {
    const [pane, setPane] = useState<Pane>('info');

    if (ServerConfig.isEmpty) {
      return (
        <aside className="ws-aside ws-aside-empty">
          <Icon name="world" />
          <p>{t('worlds.empty')}</p>
        </aside>
      );
    }

    const playable = playableHere(world);
    const reach = ServerProbe.of(world.id);

    return (
      <aside className="ws-aside">
        <div className="ws-aside-art">
          <Banner key={`${world.id}/${world.image ?? ''}`} world={world} />
        </div>

        <div className="ws-aside-head">
          <h2 title={world.name}>{world.name.trim() || t('server.unnamed')}</h2>
          <div className="ws-badges">
            {world.version && (
              <span className={`ws-badge${playable ? '' : ' is-bad'}`}>{world.version}</span>
            )}
            <span className="ws-badge">
              {world.listed ? (world.language ?? '').toUpperCase() || '-' : t('worlds.yours')}
            </span>
            {reach !== 'unknown' && (
              <span className={`ws-badge is-${reach}`}>
                <span className="ws-badge-dot" />
                {t(REACH_TEXT[reach])}
              </span>
            )}
          </div>
        </div>

        <div className="ws-segment" role="tablist">
          {(
            [
              { key: 'info', label: t('worlds.tabInfo') },
              { key: 'account', label: t('worlds.tabAccount') },
            ] as const
          ).map(entry => (
            <button
              type="button"
              role="tab"
              key={entry.key}
              aria-selected={pane === entry.key}
              className={pane === entry.key ? 'is-on' : ''}
              onClick={uiClick(() => setPane(entry.key))}
            >
              {entry.label}
              {entry.key === 'account' && ServerAccounts.list(world.id).length > 0 && (
                <span className="ws-segment-count">{ServerAccounts.list(world.id).length}</span>
              )}
            </button>
          ))}
        </div>

        <div className="ws-aside-body scrollable">
          {pane === 'info' ? (
            <InfoPane world={world} clients={clients} />
          ) : (
            <AccountPane world={world} />
          )}
        </div>
      </aside>
    );
  }
);
