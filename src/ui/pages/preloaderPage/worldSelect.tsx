import { uiClick } from '../../../libs/sfx';
import { useEffect, useMemo, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { MuSpriteFrame } from '../../components/muSprite';
import { MuButton } from '../../components/muButton';
import { MuText } from '../../components/muText';
import { DECO, SPRITE as SERVERS_SPRITE, TEXT_COLOR } from '../serversPage/layout';
import { t, type TextKey } from '../../../i18n';
import {
  displayAddress,
  playableHere,
  ServerConfig,
  type ServerProfile,
} from '../../../common/serverConfig';
import { versionTags } from '../../../version';
import { refreshServerList, ServerList } from '../../../common/serverList';
import { ServerProbe, type Reach } from '../../../common/serverProbe';
import {
  BTN_HEIGHT,
  BTN_WIDTH,
  PAGE_ARROW,
  SETUP_ART_WIDTH,
  SETUP_BOTTOM_HEIGHT,
  SETUP_TITLE_Y,
  SETUP_TOP_HEIGHT,
  SETUP_WIN_WIDTH,
  SPRITE,
  WORLD_BACK_X,
  WORLD_CARD_ART_HEIGHT,
  WORLD_CARD_BAR_HEIGHT,
  WORLD_CARD_WIDTH,
  WORLD_COLS,
  WORLD_COL_STEP,
  WORLD_GRID_TOP,
  WORLD_GRID_X,
  WORLD_HEAD_X,
  WORLD_HEAD_Y,
  WORLD_PAGE_NEXT_X,
  WORLD_PAGE_PREV_X,
  WORLD_PLAY_X,
  WORLD_ROW_STEP,
  WORLD_SETUP_X,
  worldMetrics,
  worldRowsFor,
} from './layout';

/**
 * The worlds: every server the client knows of, as a grid of cards, in the
 * setup window's frame.
 *
 * A card is the world's own banner with the server-list row art under it —
 * MU's list rows already carry the hover and pressed states a card wants, and
 * the name and language tag sit on them the way a server name sits on the
 * server screen. A world with no banner of its own gets the MU mark on stone
 * rather than a hole in the grid.
 *
 * Three things the grid says beyond the name. Whether the world answers, which
 * `serverProbe` finds out by dialling it the way the game would. Whether it is
 * the player's own or somebody's published row, because the two sit in one list
 * and only the tag tells them apart. And which one they last played, which
 * `ServerConfig.all` floats to the front.
 *
 * This is also the way to the server fields: the published list is the normal
 * way in, and Server Setup is for the address it does not carry, so that door
 * belongs next to the list it is an exception to rather than on the menu.
 */

const LOGO_SPRITE = 'Data/Logo/MU-logo.OZT';

/** The filter's "no filter" row, kept out of the language codes it sits with. */
const ALL = '';

/** What the dot means, as its tooltip. `unknown` draws no dot at all. */
const REACH_TEXT: Record<Exclude<Reach, 'unknown'>, TextKey> = {
  checking: 'worlds.checking',
  up: 'worlds.answering',
  down: 'worlds.noAnswer',
};

/**
 * The stone-and-mark tile a card falls back to. It is what a world with no
 * banner of its own gets, and — since a published banner is somebody else's
 * URL on somebody else's host — what a banner that fails to load gets too. A
 * browser's broken-image glyph in the middle of a grid of MU art is worse than
 * no banner at all.
 */
const CardStone = () => (
  <MuSpriteFrame
    file={SPRITE.optionFill}
    width={WORLD_CARD_WIDTH}
    height={WORLD_CARD_ART_HEIGHT}
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
const CardArt = ({ src }: { src: string }) => {
  const [broken, setBroken] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (broken) return <CardStone />;

  return (
    <img
      className={`world-card-art${loaded ? ' world-card-art-in' : ''}`}
      src={src}
      alt=""
      style={{ width: WORLD_CARD_WIDTH, height: WORLD_CARD_ART_HEIGHT }}
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
          thing that decides what the player is about to load — so it is on
          every card that names one, and only turns red when this client does
          not carry it. */}
      {world.version && (
        <span className={`world-version${playable ? '' : ' world-version-off'}`}>
          {world.version}
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
            that says the fields behind Server Setup are theirs to edit. */}
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
function useWorldRows(): number {
  const [rows, setRows] = useState(() => worldRowsFor(window.innerHeight));

  useEffect(() => {
    const onResize = () => setRows(worldRowsFor(window.innerHeight));

    window.addEventListener('resize', onResize);
    onResize();

    return () => window.removeEventListener('resize', onResize);
  }, []);

  return rows;
}

export const WorldSelect = observer(
  ({
    onPlay,
    onSetup,
    onClose,
  }: {
    onPlay: () => void;
    onSetup: () => void;
    onClose: () => void;
  }) => {
    const [page, setPage] = useState(0);
    const [language, setLanguage] = useState(ALL);
    const rows = useWorldRows();
    const pageSize = WORLD_COLS * rows;

    const all = ServerConfig.all;
    const selected = ServerConfig.active;

    // A saved world carries no language, so it belongs to no tag but `All` —
    // where it is always the first thing in the grid anyway.
    const worlds = useMemo(
      () =>
        language === ALL
          ? all
          : all.filter(w => w.language?.toLowerCase() === language),
      [all, language]
    );

    const pages = Math.max(1, Math.ceil(worlds.length / pageSize));
    const current = Math.min(page, pages - 1);

    // Memoised so the page is one object for as long as it is the same page:
    // the probe effect below keys off it, and a fresh slice every render would
    // re-dial the grid on every hover.
    const visible = useMemo(
      () => worlds.slice(current * pageSize, current * pageSize + pageSize),
      [worlds, current, pageSize]
    );

    // The height follows the *list*, not the page. Sizing it to the page put
    // the frame through a 268px shrink and a re-centre every time the last page
    // came up short — which, with paging, is most lists. A list that fits in
    // one short grid still gets a short window; a list that pages keeps one
    // height for all of them.
    const metrics = worldMetrics(
      Math.min(rows, Math.ceil(worlds.length / WORLD_COLS)) || 1
    );

    const playable = playableHere(selected);

    /**
     * Entering is refused for a world built against another client rather than
     * merely discouraged: this build carries one version's packets, so the
     * connect would succeed and then come apart mid-handshake, which reads as
     * a broken client rather than the wrong one.
     */
    const enter = (id = selected.id) => {
      // Nothing to enter: `active` is the placeholder, and connecting with it
      // would dial the build defaults at a world nobody published.
      if (ServerConfig.isEmpty) return;

      const world = ServerConfig.all.find(w => w.id === id);

      if (world && !playableHere(world)) return;

      ServerConfig.select(id);
      ServerConfig.markPlayed(id);
      onPlay();
    };

    // Only what is on screen is dialled, and only once it is: a grid that
    // probes every published world at launch is a port scanner with a banner.
    useEffect(() => {
      void ServerProbe.check(visible);
    }, [visible]);

    const refresh = () => {
      ServerProbe.forget();
      void refreshServerList();
    };

    /**
     * The grid, from the keyboard: the arrows walk the whole filtered list, not
     * the page, so running off the last card of one page lands on the first of
     * the next and the page follows the selection rather than the other way
     * round.
     */
    useEffect(() => {
      const onKey = (e: KeyboardEvent) => {
        const step: Record<string, number> = {
          ArrowLeft: -1,
          ArrowRight: 1,
          ArrowUp: -WORLD_COLS,
          ArrowDown: WORLD_COLS,
          PageUp: -pageSize,
          PageDown: pageSize,
        };

        if (e.key === 'Escape') {
          onClose();
        } else if (e.key === 'Enter') {
          enter();
        } else if (e.key in step && worlds.length) {
          const at = worlds.findIndex(w => w.id === selected.id);
          const next = Math.max(
            0,
            Math.min(worlds.length - 1, (at < 0 ? 0 : at) + step[e.key])
          );

          ServerConfig.select(worlds[next].id);
          setPage(Math.floor(next / pageSize));
        } else {
          return;
        }

        e.preventDefault();
      };

      window.addEventListener('keydown', onKey);

      return () => window.removeEventListener('keydown', onKey);
    });

    // One line under the grid: what this world says about itself, or why the
    // grid is thin — a list that could not be read is worth saying out loud
    // here, where the player is looking for somewhere to play, and with the
    // reason attached, because "could not be read" is not one of them.
    const blurb = !worlds.length
      ? t('worlds.empty')
      : !playable
        ? t('worlds.needsClient', {
            world: selected.version ?? '',
            client: versionTags().join(', '),
          })
        : selected.description ||
          (ServerList.state === 'loading'
            ? t('common.loading')
            : t('worlds.hint'));

    const listError =
      ServerList.state === 'error'
        ? `${t('server.listOffline')}${ServerList.error ? ` (${ServerList.error})` : ''}`
        : '';

    return (
      <div
        className="setup-win world-win"
        style={{ width: SETUP_WIN_WIDTH, height: metrics.height }}
      >
        {/* The setup window's frame, at this window's height. */}
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
          {t('worlds.title')}
          {pages > 1 && ` ${current + 1}/${pages}`}
        </div>

        {/* Filter left, refresh right. Both are text: the window's own buttons
            are 108 wide and there is no room for a fourth on the bottom row. */}
        <div
          className="world-head"
          style={{ top: WORLD_HEAD_Y, left: WORLD_HEAD_X, right: WORLD_HEAD_X }}
        >
          <div className="world-filter">
            {ServerConfig.languages.length > 1 &&
              [ALL, ...ServerConfig.languages].map(tag => (
                <span
                  key={tag || 'all'}
                  className={`world-chip${tag === language ? ' world-chip-on' : ''}`}
                  onClick={uiClick(() => {
                    setLanguage(tag);
                    setPage(0);
                  })}
                >
                  {tag ? tag.toUpperCase() : t('worlds.filterAll')}
                </span>
              ))}
          </div>
          <span
            className={`world-chip${ServerList.state === 'loading' ? ' world-chip-busy' : ''}`}
            onClick={uiClick(refresh)}
          >
            {t('worlds.refresh')}
          </span>
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
                top: metrics.buttonsY + 1,
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

        {visible.map((world, i) => (
          <WorldCard
            key={world.id}
            world={world}
            selected={world.id === selected.id}
            lastPlayed={world.id === ServerConfig.lastPlayedId}
            playable={playableHere(world)}
            reach={ServerProbe.of(world.id)}
            left={WORLD_GRID_X + WORLD_COL_STEP * (i % WORLD_COLS)}
            top={WORLD_GRID_TOP + WORLD_ROW_STEP * Math.floor(i / WORLD_COLS)}
            onSelect={() => ServerConfig.select(world.id)}
            onEnter={() => enter(world.id)}
          />
        ))}

        <MuText
          className="setup-line"
          color={listError || !playable ? TEXT_COLOR.yellow : TEXT_COLOR.brightGray}
          style={{ top: metrics.descY }}
          text={listError || blurb}
        />
        {!ServerConfig.isEmpty && (
          <MuText
            face="fix"
            className="setup-line"
            color={TEXT_COLOR.brightYellow}
            style={{ top: metrics.addressY }}
            text={`${selected.name.trim() || t('server.unnamed')} — ${displayAddress(selected)}`}
          />
        )}

        <MuButton
          file={SPRITE.button}
          width={BTN_WIDTH}
          height={BTN_HEIGHT}
          frames={{ up: 0, active: 1, down: 2 }}
          color={TEXT_COLOR.brightGray}
          activeColor={TEXT_COLOR.white}
          label={t('worlds.enter')}
          disabled={!playable || ServerConfig.isEmpty}
          onClick={() => enter()}
          style={{ position: 'absolute', left: WORLD_PLAY_X, top: metrics.buttonsY }}
          labelStyle={{ fontSize: 11 }}
        />
        <MuButton
          file={SPRITE.button}
          width={BTN_WIDTH}
          height={BTN_HEIGHT}
          frames={{ up: 0, active: 1, down: 2 }}
          color={TEXT_COLOR.brightGray}
          activeColor={TEXT_COLOR.white}
          label={t('preloader.serverSetup')}
          onClick={onSetup}
          style={{ position: 'absolute', left: WORLD_SETUP_X, top: metrics.buttonsY }}
          labelStyle={{ fontSize: 11 }}
        />
        <MuButton
          file={SPRITE.button}
          width={BTN_WIDTH}
          height={BTN_HEIGHT}
          frames={{ up: 0, active: 1, down: 2 }}
          color={TEXT_COLOR.brightGray}
          activeColor={TEXT_COLOR.white}
          label={t('common.close')}
          onClick={onClose}
          style={{ position: 'absolute', left: WORLD_BACK_X, top: metrics.buttonsY }}
          labelStyle={{ fontSize: 11 }}
        />
      </div>
    );
  }
);
