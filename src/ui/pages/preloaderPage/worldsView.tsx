import { useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { uiClick } from '../../../libs/sfx';
import { t } from '../../../i18n';
import {
  playableHere,
  ServerConfig,
  type ServerProfile,
} from '../../../common/serverConfig';
import { ServerAccounts } from '../../../common/serverAccounts';
import { refreshServerList, ServerList } from '../../../common/serverList';
import { ServerProbe } from '../../../common/serverProbe';
import { versionTags } from '../../../version';
import { Button, Icon } from './controls';
import { Banner, REACH_TEXT } from './banner';
import { WorldDetails } from './worldDetails';

const WorldCard = observer(
  ({
    world,
    selected,
    onSelect,
    onEnter,
  }: {
    world: ServerProfile;
    selected: boolean;
    onSelect: () => void;
    onEnter: () => void;
  }) => {
    const playable = playableHere(world);
    const reach = ServerProbe.of(world.id);

    return (
      <button
        type="button"
        data-world={world.id}
        className={`ws-world${selected ? ' is-on' : ''}${playable ? '' : ' is-off'}`}
        onClick={uiClick(onSelect)}
        onDoubleClick={onEnter}
      >
        <span className="ws-world-art">
          <Banner key={world.image ?? ''} world={world} />
          {world.version && (
            <span className={`ws-tag ws-tag-float${playable ? '' : ' is-bad'}`}>
              {world.version}
            </span>
          )}
          {reach !== 'unknown' && (
            <span className={`ws-dot ws-dot-${reach}`} title={t(REACH_TEXT[reach])} />
          )}
        </span>
        <span className="ws-world-body">
          <span className="ws-world-name">{world.name.trim() || t('server.unnamed')}</span>
          <span className="ws-world-meta">
            {/* Published rows wear their language; the player's own say so. */}
            <span>
              {world.listed ? (world.language ?? '').toUpperCase() : t('worlds.yours')}
            </span>
            {ServerAccounts.has(world.id) && (
              <span title={t('worlds.hasAccount')}>{t('worlds.accountMark')}</span>
            )}
            {world.id === ServerConfig.lastPlayedId && (
              <span className="ws-world-last">{t('worlds.lastPlayed')}</span>
            )}
          </span>
        </span>
      </button>
    );
  }
);

export const WorldsView = observer(
  ({
    worlds,
    total,
    search,
    onSearch,
    language,
    onLanguage,
    onEnter,
  }: {
    /** Everything that survived both filters. */
    worlds: ServerProfile[];
    /** Worlds before either filter, so the count can say "3 of 12". */
    total: number;
    search: string;
    onSearch: (text: string) => void;
    language: string;
    onLanguage: (tag: string) => void;
    onEnter: (id: string) => void;
  }) => {
    const selected = ServerConfig.active;
    const scroller = useRef<HTMLDivElement>(null);
    const grid = useRef<HTMLDivElement>(null);

    // Only cards scrolled into view are dialled: a grid that probes every
    // published world at launch is a port scanner with a banner.
    useEffect(() => {
      const root = scroller.current;
      if (!root) return;

      const byId = new Map(worlds.map(w => [w.id, w]));
      let batch: ServerProfile[] = [];
      let timer = 0;

      const observer = new IntersectionObserver(
        entries => {
          for (const entry of entries) {
            const world = byId.get((entry.target as HTMLElement).dataset.world ?? '');
            if (entry.isIntersecting && world) batch.push(world);
          }

          if (batch.length && !timer) {
            timer = window.setTimeout(() => {
              timer = 0;
              void ServerProbe.check(batch);
              batch = [];
            }, 60);
          }
        },
        { root }
      );

      root.querySelectorAll('[data-world]').forEach(el => observer.observe(el));

      return () => {
        observer.disconnect();
        window.clearTimeout(timer);
      };
    }, [worlds]);

    // The selection stays on screen, whether the arrows or a search moved it.
    useEffect(() => {
      grid.current
        ?.querySelector(`[data-world="${CSS.escape(selected.id)}"]`)
        ?.scrollIntoView({ block: 'nearest' });
    }, [selected.id, worlds]);

    // The arrows walk the filtered list, a row at a time up and down. A field
    // keeps its own keys: arrows there move a caret.
    useEffect(() => {
      const onKey = (e: KeyboardEvent) => {
        const target = e.target as HTMLElement | null;
        if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;
        if (!worlds.length) return;

        const columns = grid.current
          ? getComputedStyle(grid.current).gridTemplateColumns.split(' ').filter(Boolean).length
          : 1;
        const step: Record<string, number> = {
          ArrowLeft: -1,
          ArrowRight: 1,
          ArrowUp: -columns,
          ArrowDown: columns,
        };

        if (!(e.key in step)) return;

        const at = worlds.findIndex(w => w.id === selected.id);
        const next = Math.max(
          0,
          Math.min(worlds.length - 1, (at < 0 ? 0 : at) + step[e.key])
        );

        ServerConfig.select(worlds[next].id);
        e.preventDefault();
      };

      window.addEventListener('keydown', onKey);

      return () => window.removeEventListener('keydown', onKey);
    }, [worlds, selected.id]);

    const refresh = () => {
      ServerProbe.forget();
      void refreshServerList();
    };

    const empty = search
      ? t('worlds.noMatch', { text: search.trim() })
      : ServerList.state === 'loading'
        ? t('servers.loading')
        : ServerList.state === 'error'
          ? t('server.listOffline')
          : t('worlds.empty');

    return (
      <div className="ws-worlds">
        <div className="ws-browse">
          <div className="ws-toolbar">
            <label className="ws-search">
              <Icon name="search" />
              <input
                className="world-search"
                type="text"
                value={search}
                placeholder={t('worlds.search')}
                spellCheck={false}
                onChange={e => onSearch(e.target.value)}
              />
              {!!search && (
                <button
                  type="button"
                  className="ws-search-clear"
                  title={t('worlds.clearSearch')}
                  onClick={uiClick(() => onSearch(''))}
                >
                  <Icon name="close" />
                </button>
              )}
            </label>

            {ServerConfig.languages.length > 1 && (
              <div className="ws-chips">
                {['', ...ServerConfig.languages].map(tag => (
                  <button
                    type="button"
                    key={tag || 'all'}
                    className={`ws-chip${tag === language ? ' is-on' : ''}`}
                    onClick={uiClick(() => onLanguage(tag))}
                  >
                    {tag ? tag.toUpperCase() : t('worlds.filterAll')}
                  </button>
                ))}
              </div>
            )}

            <span className="ws-toolbar-end">
              {worlds.length < total && (
                <span className="ws-count">
                  {t('worlds.count', { shown: worlds.length, total })}
                </span>
              )}
              <Button
                icon="refresh"
                variant="ghost"
                small
                className={ServerList.state === 'loading' ? 'is-busy' : undefined}
                onClick={refresh}
              >
                {t('worlds.refresh')}
              </Button>
            </span>
          </div>

          <div className="ws-grid-scroll" ref={scroller}>
            {worlds.length ? (
              <div className="ws-cards" ref={grid}>
                {worlds.map(world => (
                  <WorldCard
                    key={world.id}
                    world={world}
                    selected={world.id === selected.id}
                    onSelect={() => ServerConfig.select(world.id)}
                    onEnter={() => onEnter(world.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="ws-empty">{empty}</div>
            )}
          </div>
        </div>

        <WorldDetails world={selected} clients={versionTags()} />
      </div>
    );
  }
);
