import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { t, type TextKey } from '../../../../i18n';
import { GmPanel } from '../../../../gmPanel';
import { AdminFeed } from '../../../../admin/feed';
import { EVENT_KINDS, type EventKind, type TrackEvent } from '../../../../common/adminProtocol';
import { uiClick } from '../../../../libs/sfx';
import { FeedNotice, clockText } from '../shared';

/**
 * A character's journal, newest first, and the live feed of everything.
 *
 * History comes from the proxy's journal a page at a time; while "follow
 * live" is on, lines the stream delivers for the same character are shown
 * on top as they arrive. With no character picked the tab shows the live
 * feed for the whole server.
 */

const KIND_KEY: Record<EventKind, TextKey> = {
  login: 'gm.kind.login',
  logout: 'gm.kind.logout',
  select: 'gm.kind.select',
  map: 'gm.kind.map',
  walk: 'gm.kind.walk',
  teleport: 'gm.kind.teleport',
  warp: 'gm.kind.warp',
  chat: 'gm.kind.chat',
  whisper: 'gm.kind.whisper',
  party: 'gm.kind.party',
  guild: 'gm.kind.guild',
  shout: 'gm.kind.shout',
  command: 'gm.kind.command',
  attack: 'gm.kind.attack',
  skill: 'gm.kind.skill',
  kill: 'gm.kind.kill',
  death: 'gm.kind.death',
  exp: 'gm.kind.exp',
  level: 'gm.kind.level',
  state: 'gm.kind.state',
  pickup: 'gm.kind.pickup',
  drop: 'gm.kind.drop',
  item: 'gm.kind.item',
  money: 'gm.kind.money',
  buy: 'gm.kind.buy',
  sell: 'gm.kind.sell',
  repair: 'gm.kind.repair',
  npc: 'gm.kind.npc',
  trade: 'gm.kind.trade',
  shop: 'gm.kind.shop',
  server: 'gm.kind.server',
};

export function kindLabel(kind: EventKind): string {
  return KIND_KEY[kind] ? t(KIND_KEY[kind]) : kind;
}

const EventLine = observer(({ event, showWho }: { event: TrackEvent; showWho: boolean }) => (
  <li className={`gm-log-line gm-kind-${event.kind}`}>
    <time className="gm-mono">{clockText(event.at)}</time>
    <span className="gm-log-kind">{kindLabel(event.kind)}</span>
    {showWho ? (
      <button
        type="button"
        className="gm-log-who"
        onClick={uiClick(() => {
          if (event.character) GmPanel.setLogCharacter(event.character);
        })}
      >
        {event.character ?? event.account ?? '?'}
      </button>
    ) : null}
    <span className="gm-log-text">{event.text}</span>
  </li>
));

export const LogsTab = observer(() => {
  const [kinds, setKinds] = useState<Set<EventKind>>(() => new Set());
  const [follow, setFollow] = useState(true);
  const [draft, setDraft] = useState(GmPanel.logCharacter);

  const character = GmPanel.logCharacter.trim();
  const key = character.toLowerCase();
  const page = key ? AdminFeed.logs.get(key) : undefined;
  const kindList = kinds.size ? [...kinds] : undefined;

  // A pick elsewhere (a row in Live, a name in the feed) lands in the box.
  const [seen, setSeen] = useState(GmPanel.logCharacter);
  if (seen !== GmPanel.logCharacter) {
    setSeen(GmPanel.logCharacter);
    setDraft(GmPanel.logCharacter);
  }

  // A new character or a new filter asks for the newest page again.
  useEffect(() => {
    if (!character || AdminFeed.status !== 'open') return;
    AdminFeed.requestLog(character, { kinds: kindList });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character, kinds, AdminFeed.status]);

  const liveFor = AdminFeed.live.filter(event => {
    if (kinds.size && !kinds.has(event.kind)) return false;
    if (!character) return true;
    return (event.character ?? '').toLowerCase() === key;
  });

  // Live lines that arrived after the page's newest one, newest first.
  const newest = page?.events[0]?.at ?? 0;
  const fresh = follow ? liveFor.filter(event => event.at > newest).slice().reverse() : [];

  const suggestions = AdminFeed.list
    .filter(p => p.character && draft && p.character.toLowerCase().startsWith(draft.toLowerCase()) && p.character !== character)
    .slice(0, 6);

  const toggleKind = (kind: EventKind) => {
    const next = new Set(kinds);
    if (next.has(kind)) next.delete(kind);
    else next.add(kind);
    setKinds(next);
  };

  return (
    <div className="gm-logs">
      <div className="gm-logs-bar">
        <label className="gm-field gm-logs-who">
          <span className="gm-field-label">{t('gm.logs.character')}</span>
          <input
            className="gm-input"
            type="text"
            value={draft}
            placeholder={t('gm.hint.name')}
            spellCheck={false}
            autoComplete="off"
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key !== 'Enter') return;
              e.preventDefault();
              e.stopPropagation();
              GmPanel.setLogCharacter(draft.trim());
            }}
            onBlur={() => GmPanel.setLogCharacter(draft.trim())}
          />
          {suggestions.length > 0 ? (
            <div className="gm-suggest">
              {suggestions.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onMouseDown={e => e.preventDefault()}
                  onClick={uiClick(() => GmPanel.setLogCharacter(p.character ?? ''))}
                >
                  {p.character}
                </button>
              ))}
            </div>
          ) : null}
        </label>

        <label className={`gm-toggle-check${follow ? ' is-on' : ''}`}>
          <input type="checkbox" checked={follow} onChange={e => setFollow(e.target.checked)} />
          {t('gm.logs.follow')}
        </label>

        {character ? (
          <button type="button" className="gm-link" onClick={uiClick(() => GmPanel.setLogCharacter(''))}>
            {t('gm.logs.showAll')}
          </button>
        ) : null}
      </div>

      <div className="gm-kinds">
        <button
          type="button"
          className={`gm-chip${kinds.size === 0 ? ' is-active' : ''}`}
          onClick={uiClick(() => setKinds(new Set()))}
        >
          {t('gm.logs.allKinds')}
        </button>
        {EVENT_KINDS.map(kind => (
          <button
            key={kind}
            type="button"
            className={`gm-chip gm-chip-${kind}${kinds.has(kind) ? ' is-active' : ''}`}
            onClick={uiClick(() => toggleKind(kind))}
          >
            {kindLabel(kind)}
          </button>
        ))}
      </div>

      <FeedNotice />

      {!character ? (
        <>
          <h4 className="gm-section-title">{t('gm.logs.live')}</h4>
          <p className="gm-hint">{t('gm.logs.liveHint')}</p>
          {liveFor.length === 0 ? (
            <p className="gm-empty">{t('gm.logs.nothingYet')}</p>
          ) : (
            <ul className="gm-log">
              {liveFor
                .slice()
                .reverse()
                .map((event, i) => (
                  <EventLine key={`${event.at}-${i}`} event={event} showWho />
                ))}
            </ul>
          )}
        </>
      ) : (
        <>
          <h4 className="gm-section-title">{character}</h4>
          {page?.loading && page.events.length === 0 ? <p className="gm-hint">{t('gm.logs.loading')}</p> : null}
          {page && !page.loading && page.events.length === 0 && fresh.length === 0 ? (
            <p className="gm-empty">{t('gm.logs.empty', { name: character })}</p>
          ) : null}
          <ul className="gm-log">
            {fresh.map((event, i) => (
              <EventLine key={`live-${event.at}-${i}`} event={event} showWho={false} />
            ))}
            {(page?.events ?? []).map(event => (
              <EventLine key={event.id ?? `${event.at}-${event.text}`} event={event} showWho={false} />
            ))}
          </ul>
          {page?.more ? (
            <button
              type="button"
              className="gm-btn gm-btn-compact"
              disabled={page.loading}
              onClick={uiClick(() =>
                AdminFeed.requestLog(character, {
                  before: page.events[page.events.length - 1]?.at,
                  kinds: kindList,
                  append: true,
                })
              )}
            >
              {page.loading ? t('gm.logs.loading') : t('gm.logs.older')}
            </button>
          ) : null}
        </>
      )}
    </div>
  );
});
