import { observer } from 'mobx-react-lite';
import { t } from '../../../../i18n';
import { GmPanel } from '../../../../gmPanel';
import { AdminFeed } from '../../../../admin/feed';
import type { WorldView } from '../../../../gmWorld';
import { className, type TrackedPlayer } from '../../../../common/adminProtocol';
import { mapName } from '../../../../common/gmMaps';
import { gmCommand } from '../../../../common/gmCommands';
import { uiClick } from '../../../../libs/sfx';
import { RunButton } from '../commandForm';
import { FeedNotice, heroStateLabel, playerMatches, sinceText } from '../shared';

/**
 * Everyone online, on every map, as the proxy's tracker sees them.
 *
 * A row is a socket the game server accepted a login on; one still at the
 * character select has no map. Clicking a row opens its details and makes
 * the character the shared target, so the Character and Moderation tabs
 * are already aimed at them.
 */

const PlayerDetail = observer(({ player }: { player: TrackedPlayer }) => {
  const name = player.character ?? '';
  const inWorld = player.map !== null;

  return (
    <aside className="gm-detail">
      <header className="gm-detail-head">
        <h3>
          {player.character ?? player.account ?? player.id}
          {player.gm ? <b className="gm-badge gm-badge-gm">{t('gm.tabPlate')}</b> : null}
        </h3>
        <button
          type="button"
          className="gm-chip-x"
          aria-label={t('common.close')}
          onClick={uiClick(() => GmPanel.selectPlayer(null))}
        >
          ×
        </button>
      </header>

      <dl className="gm-facts">
        <dt>{t('gm.live.col.account')}</dt>
        <dd className="gm-mono">{player.account ?? '-'}</dd>
        <dt>{t('gm.live.col.class')}</dt>
        <dd>{player.cls !== null ? className(player.cls) : '-'}</dd>
        <dt>{t('common.level')}</dt>
        <dd>{player.level || '-'}</dd>
        <dt>{t('gm.live.col.map')}</dt>
        <dd>
          {player.map !== null
            ? `${mapName(player.map)} (${player.x}, ${player.y})`
            : t('gm.live.charSelect')}
        </dd>
        <dt>{t('gm.live.col.hp')}</dt>
        <dd className="gm-mono">{player.maxHp ? `${player.hp} / ${player.maxHp}` : '-'}</dd>
        <dt>{t('common.zen')}</dt>
        <dd className="gm-mono">{player.money.toLocaleString()}</dd>
        <dt>{t('gm.live.col.state')}</dt>
        <dd>{heroStateLabel(player.heroState)}</dd>
        <dt>{t('gm.live.col.guild')}</dt>
        <dd>{player.guild ?? '-'}</dd>
        <dt>{t('gm.live.col.online')}</dt>
        <dd>{sinceText(player.since)}</dd>
        <dt>{t('gm.live.col.last')}</dt>
        <dd className="gm-detail-last">{player.lastAction ?? '-'}</dd>
      </dl>

      {name ? (
        <>
          <h4 className="gm-section-title">{t('gm.live.actions')}</h4>
          <div className="gm-quick">
            <button
              type="button"
              className="gm-btn gm-btn-compact"
              onClick={uiClick(() => GmPanel.showLog(name))}
            >
              {t('gm.live.viewLog')}
            </button>
            {inWorld ? (
              <button
                type="button"
                className="gm-btn gm-btn-compact"
                onClick={uiClick(() => GmPanel.showOnMap(player.map, player.id))}
              >
                {t('gm.live.showOnMap')}
              </button>
            ) : null}
            <RunButton command={gmCommand('/trace')} overrides={{ characterName: name }} labelKey="gm.action.goTo" compact />
            <RunButton command={gmCommand('/track')} overrides={{ characterName: name }} labelKey="gm.action.bringHere" compact />
            <RunButton command={gmCommand('/charinfo')} overrides={{ characterName: name }} labelKey="gm.action.info" compact />
            <RunButton command={gmCommand('/disconnect')} overrides={{ characterName: name }} labelKey="gm.action.kick" compact />
            <RunButton
              command={gmCommand('/chatban')}
              overrides={{ characterName: name, durationMinutes: '60' }}
              labelKey="gm.live.chatBan"
              compact
            />
            <RunButton command={gmCommand('/banchar')} overrides={{ characterName: name }} labelKey="gm.action.ban" compact />
          </div>
        </>
      ) : null}
    </aside>
  );
});

export const LiveTab = observer(({ view }: { view: WorldView }) => {
  const players = AdminFeed.list.filter(p => playerMatches(p, GmPanel.search));
  const selected = GmPanel.selectedPlayerId ? AdminFeed.players.get(GmPanel.selectedPlayerId) : null;
  const me = view.hero?.name ?? '';

  return (
    <div className={`gm-live${selected ? ' has-detail' : ''}`}>
      <div className="gm-live-main">
        <section className="gm-stats">
          <div className="gm-stat">
            <span className="gm-stat-label">{t('gm.live.online')}</span>
            <span className="gm-stat-value">{AdminFeed.inWorldCount}</span>
            <span className="gm-stat-sub">{t('gm.live.tracked', { count: AdminFeed.players.size })}</span>
          </div>
          <div className="gm-stat">
            <span className="gm-stat-label">{t('gm.live.maps')}</span>
            <span className="gm-stat-value">{AdminFeed.byMap.size}</span>
            <span className="gm-stat-sub">{t('gm.live.withPlayers')}</span>
          </div>
          <div className="gm-stat">
            <span className="gm-stat-label">{t('gm.live.gms')}</span>
            <span className="gm-stat-value">{AdminFeed.gameMasterCount}</span>
            <span className="gm-stat-sub">{t('gm.tabPlate')}</span>
          </div>
        </section>

        <FeedNotice />

        {AdminFeed.status === 'open' && players.length === 0 ? (
          <p className="gm-empty">{GmPanel.search ? t('gm.live.noMatch') : t('gm.live.empty')}</p>
        ) : null}

        {players.length > 0 ? (
          <div className="gm-table-wrap">
            <table className="gm-table">
              <thead>
                <tr>
                  <th>{t('gm.live.col.player')}</th>
                  <th>{t('gm.live.col.class')}</th>
                  <th className="gm-num">{t('common.level')}</th>
                  <th>{t('gm.live.col.map')}</th>
                  <th className="gm-num">{t('gm.live.col.position')}</th>
                  <th className="gm-num">{t('gm.live.col.hp')}</th>
                  <th>{t('gm.live.col.state')}</th>
                  <th>{t('gm.live.col.online')}</th>
                  <th>{t('gm.live.col.last')}</th>
                </tr>
              </thead>
              <tbody>
                {players.map(player => {
                  const isMe = !!me && player.character === me;
                  const isSelected = player.id === GmPanel.selectedPlayerId;
                  const hpRatio = player.maxHp ? Math.min(1, player.hp / player.maxHp) : 0;
                  return (
                    <tr
                      key={player.id}
                      className={`gm-row-player${isSelected ? ' is-selected' : ''}${isMe ? ' is-me' : ''}`}
                      onClick={uiClick(() => {
                        GmPanel.selectPlayer(isSelected ? null : player.id);
                        if (player.character && !isMe) GmPanel.setTarget(player.character);
                      })}
                    >
                      <td>
                        <span className="gm-cell-name">
                          <i className={`gm-dot gm-dot-player${player.gm ? ' is-gm' : ''}`} />
                          <b>{player.character ?? player.account ?? player.id}</b>
                          {player.character && player.account ? (
                            <small className="gm-mono">{player.account}</small>
                          ) : null}
                        </span>
                      </td>
                      <td>{player.cls !== null ? className(player.cls) : '-'}</td>
                      <td className="gm-num">{player.level || '-'}</td>
                      <td>{player.map !== null ? mapName(player.map) : <em>{t('gm.live.charSelect')}</em>}</td>
                      <td className="gm-num gm-mono">{player.map !== null ? `${player.x}, ${player.y}` : '-'}</td>
                      <td className="gm-num">
                        {player.maxHp ? (
                          <span className="gm-hp" title={`${player.hp} / ${player.maxHp}`}>
                            <i style={{ width: `${hpRatio * 100}%` }} className={hpRatio < 0.3 ? 'is-low' : ''} />
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td>{heroStateLabel(player.heroState)}</td>
                      <td className="gm-mono">{sinceText(player.since)}</td>
                      <td className="gm-cell-last">{player.lastAction ?? ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      {selected ? <PlayerDetail player={selected} /> : null}
    </div>
  );
});
