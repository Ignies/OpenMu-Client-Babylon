import { uiClick } from '../../../libs/sfx';
import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { MuSpriteFrame } from '../../components/muSprite';
import { MuButton } from '../../components/muButton';
import { DECO, SPRITE as SERVERS_SPRITE, TEXT_COLOR } from '../serversPage/layout';
import { t, type TextKey } from '../../../i18n';
import { playableHere, ServerConfig, type ServerProfile } from '../../../common/serverConfig';
import { ServerAccounts } from '../../../common/serverAccounts';
import { refreshServerList, ServerList } from '../../../common/serverList';
import { ServerProbe, type Reach } from '../../../common/serverProbe';
import { Plate } from './frame';
import {
  PAGE_ARROW,
  SPRITE,
  WORLD_CARD_ART_HEIGHT,
  WORLD_CARD_BAR_HEIGHT,
  WORLD_CARD_WIDTH,
  WORLD_COLS,
  WORLD_COL_STEP,
  WORLD_FILTER_Y,
  WORLD_GRID_TOP,
  WORLD_GRID_X,
  WORLD_HEAD_X,
  WORLD_PAGE_NEXT_X,
  WORLD_PAGE_PREV_X,
  WORLD_ROW_STEP,
  WORLD_SEARCH_HEIGHT,
  WORLD_SEARCH_WIDTH,
  WORLD_SEARCH_Y,
} from './layout';

/**
 * The worlds: every server the client knows of, as a grid of cards.
 *
 * A card is the world's own banner with the server-list row art under it - MU's
 * list rows already carry the hover and pressed states a card wants, and the
 * name and language tag sit on them the way a server name sits on the server
 * screen. A world with no banner of its own gets the MU mark on stone rather
 * than a hole in the grid.
 *
 * Four things the grid says beyond the name. Whether the world answers, which
 * `serverProbe` finds out by dialling it the way the game would. Whether it is
 * the player's own or somebody's published row, because the two sit in one list
 * and only the tag tells them apart. Which one they last played, which
 * `ServerConfig.all` floats to the front. And whether they have an account
 * saved on it, because with one list holding a dozen strangers' worlds that is
 * the difference between entering and signing up.
 */

const LOGO_SPRITE = 'Data/Logo/MU-logo.OZT';

/** What the dot means, as its tooltip. `unknown` draws no dot at all. */
export const REACH_TEXT: Record<Exclude<Reach, 'unknown'>, TextKey> = {
  checking: 'worlds.checking',
  up: 'worlds.answering',
  down: 'worlds.noAnswer',
};

/**
 * The stone-and-mark tile a card falls back to. It is what a world with no
 * banner of its own gets, and - since a published banner is somebody else's
 * URL on somebody else's host - what a banner that fails to load gets too. A
 * browser's broken-image glyph in the middle of a grid of MU art is worse than
 * no banner at all.
 */
export const CardStone = ({
  width = WORLD_CARD_WIDTH,
  height = WORLD_CARD_ART_HEIGHT,
}: {
  width?: number;
  height?: number;
}) => (
  <MuSpriteFrame
    file={SPRITE.optionFill}
    width={width}
    height={height}
    className="world-card-art"
    style={{ backgroundRepeat: 'repeat' }}
  >
    <MuSpriteFrame
      file={LOGO_SPRITE}
      style={{
        position: 'absolute',
        inset: 0,
        backgroundSize: '60% auto',
        backgroundPosition: 'center',
        opacity: 0.55,
      }}
    />
  </MuSpriteFrame>
);

/**
 * A published banner, faded up once its bytes are in. Mounted under its own URL
 * as a key, so a world whose banner changes gets a fresh one of these rather
 * than an effect resetting the old one's state.
 */
export const CardArt = ({
  src,
  width = WORLD_CARD_WIDTH,
  height = WORLD_CARD_ART_HEIGHT,
}: {
  src: string;
  width?: number;
  height?: number;
}) => {
  const [broken, setBroken] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (broken) return <CardStone width={width} height={height} />;

  return (
    <img
      className={`world-card-art${loaded ? ' world-card-art-in' : ''}`}
      src={src}
      alt=""
      style={{ width, height }}
      // A banner already in the cache has loaded before React can attach
      // `onLoad`, so the ref catches the ones the event would miss.
      ref={img => {
        if (img?.complete && img.naturalWidth) setLoaded(true);
      }}
      onLoad={() => setLoaded(true)}
      onError={() => setBroken(true)}
    />
  );
};

const WorldCard = ({
  world,
  selected,
  lastPlayed,
  hasAccount,
  playable,
  reach,
  left,
  top,
  onSelect,
  onEnter,
}: {
  world: ServerProfile;
  selected: boolean;
  lastPlayed: boolean;
  hasAccount: boolean;
  playable: boolean;
  reach: Reach;
  left: number;
  top: number;
  onSelect: () => void;
  onEnter: () => void;
}) => {
  return (
    <div
      className={`world-card${selected ? ' world-card-on' : ''}${
        playable ? '' : ' world-card-off'
      }`}
      style={{ left, top, width: WORLD_CARD_WIDTH }}
      onClick={uiClick(onSelect)}
      onDoubleClick={onEnter}
    >
      {world.image ? (
        <CardArt key={world.image} src={world.image} />
      ) : (
        <CardStone />
      )}

      {/* The world last entered, marked where it is floated to: first in the
          grid for a reason the player can see rather than guess at. */}
      {lastPlayed && (
        <span className="world-last" title={t('worlds.lastPlayed')} />
      )}

      {/* Which client the world is published for. It is the first thing its
          line says, and with more than one version in the client it is the
          thing that decides what the player is about to load - so it is on
          every card that names one, and only turns red when this client does
          not carry it. */}
      {world.version && (
        <span className={`world-version${playable ? '' : ' world-version-off'}`}>
          {world.version}
        </span>
      )}

      {/* An account is saved here. Beside the version rather than in a corner
          of its own: both are about what happens after Enter is pressed. */}
      {hasAccount && (
        <span className="world-account" title={t('worlds.hasAccount')}>
          {t('worlds.accountMark')}
        </span>
      )}

      {/* Whether it answers, on the banner rather than the name row: the row is
          already carrying a tag on that side, and this belongs to the world. */}
      {reach !== 'unknown' && (
        <span
          className={`world-dot world-dot-${reach}`}
          title={t(REACH_TEXT[reach])}
        />
      )}

      <MuButton
        file={SPRITE.menuButton}
        width={WORLD_CARD_WIDTH}
        height={WORLD_CARD_BAR_HEIGHT}
        frames={{ up: 0, active: 1, down: 2 }}
        color={selected ? TEXT_COLOR.brightYellow : TEXT_COLOR.brightGray}
        activeColor={TEXT_COLOR.white}
        label={world.name.trim() || t('server.unnamed')}
        onClick={onSelect}
        style={{ position: 'absolute', left: 0, top: WORLD_CARD_ART_HEIGHT }}
        labelStyle={{ fontSize: 11 }}
      >
        {/* Published rows wear their language; the player's own wear the mark
            that says the fields behind the setup tab are theirs to edit. */}
        <span className={`setup-row-tag${world.listed ? '' : ' world-tag-mine'}`}>
          {world.listed
            ? (world.language ?? '').toUpperCase()
            : t('worlds.yours')}
        </span>
      </MuButton>
    </div>
  );
};

/** Rows of cards this viewport has room for, remeasured when it changes. */
export function useWorldRows(rowsFor: (height: number) => number): number {
  const [rows, setRows] = useState(() => rowsFor(window.innerHeight));

  useEffect(() => {
    const onResize = () => setRows(rowsFor(window.innerHeight));

    window.addEventListener('resize', onResize);
    onResize();

    return () => window.removeEventListener('resize', onResize);
  }, [rowsFor]);

  return rows;
}

export const WorldsTab = observer(
  ({
    worlds,
    visible,
    total,
    search,
    onSearch,
    language,
    onLanguage,
    pages,
    page,
    onPage,
    arrowsY,
    onEnter,
  }: {
    /** Everything that survived both filters, for the count line. */
    worlds: ServerProfile[];
    /** The page of it that is on screen. */
    visible: ServerProfile[];
    /** Worlds before either filter, so the count can say "3 of 12". */
    total: number;
    search: string;
    onSearch: (text: string) => void;
    language: string;
    onLanguage: (tag: string) => void;
    pages: number;
    page: number;
    onPage: (page: number) => void;
    /** The button row the paging arrows flank. */
    arrowsY: number;
    onEnter: (id: string) => void;
  }) => {
    const selected = ServerConfig.active;

    // Only what is on screen is dialled, and only once it is: a grid that
    // probes every published world at launch is a port scanner with a banner.
    useEffect(() => {
      void ServerProbe.check(visible);
    }, [visible]);

    const refresh = () => {
      ServerProbe.forget();
      void refreshServerList();
    };

    return (
      <>
        {/* The search box, with the refresh link on its right. */}
        <Plate
          width={WORLD_SEARCH_WIDTH}
          height={WORLD_SEARCH_HEIGHT}
          left={WORLD_HEAD_X}
          top={WORLD_SEARCH_Y}
        >
          <input
            className="setup-input world-search"
            type="text"
            value={search}
            placeholder={t('worlds.search')}
            onChange={e => onSearch(e.target.value)}
          />
        </Plate>
        {!!search && (
          <span
            className="world-search-clear"
            title={t('worlds.clearSearch')}
            style={{
              left: WORLD_HEAD_X + WORLD_SEARCH_WIDTH - 16,
              top: WORLD_SEARCH_Y + 4,
            }}
            onClick={uiClick(() => onSearch(''))}
          >
            ×
          </span>
        )}
        <div
          className="world-head"
          style={{
            top: WORLD_SEARCH_Y + 3,
            left: WORLD_HEAD_X + WORLD_SEARCH_WIDTH + 8,
            right: WORLD_HEAD_X,
          }}
        >
          <span
            className={`world-chip${ServerList.state === 'loading' ? ' world-chip-busy' : ''}`}
            onClick={uiClick(refresh)}
          >
            {t('worlds.refresh')}
          </span>
        </div>

        {/* The language chips, with what the two filters left on the right. */}
        <div
          className="world-head"
          style={{ top: WORLD_FILTER_Y, left: WORLD_HEAD_X, right: WORLD_HEAD_X }}
        >
          <div className="world-filter">
            {ServerConfig.languages.length > 1 &&
              ['', ...ServerConfig.languages].map(tag => (
                <span
                  key={tag || 'all'}
                  className={`world-chip${tag === language ? ' world-chip-on' : ''}`}
                  onClick={uiClick(() => onLanguage(tag))}
                >
                  {tag ? tag.toUpperCase() : t('worlds.filterAll')}
                </span>
              ))}
          </div>
          {worlds.length < total && (
            <span className="world-count">
              {t('worlds.count', { shown: worlds.length, total })}
            </span>
          )}
        </div>

        {pages > 1 &&
          (
            [
              { key: 'prev', rect: DECO.arrowLeft, x: WORLD_PAGE_PREV_X, step: -1 },
              { key: 'next', rect: DECO.arrowRight, x: WORLD_PAGE_NEXT_X, step: 1 },
            ] as const
          ).map(arrow => (
            <MuSpriteFrame
              key={arrow.key}
              file={SERVERS_SPRITE.deco}
              {...arrow.rect}
              style={{
                position: 'absolute',
                left: arrow.x,
                top: arrowsY + 1,
                width: PAGE_ARROW.width,
                height: PAGE_ARROW.height,
                cursor: 'pointer',
                pointerEvents: 'auto',
              }}
              onClick={uiClick(() => onPage((page + arrow.step + pages) % pages))}
            />
          ))}

        {visible.map((world, i) => (
          <WorldCard
            key={world.id}
            world={world}
            selected={world.id === selected.id}
            lastPlayed={world.id === ServerConfig.lastPlayedId}
            hasAccount={ServerAccounts.has(world.id)}
            playable={playableHere(world)}
            reach={ServerProbe.of(world.id)}
            left={WORLD_GRID_X + WORLD_COL_STEP * (i % WORLD_COLS)}
            top={WORLD_GRID_TOP + WORLD_ROW_STEP * Math.floor(i / WORLD_COLS)}
            onSelect={() => ServerConfig.select(world.id)}
            onEnter={() => onEnter(world.id)}
          />
        ))}
      </>
    );
  }
);
