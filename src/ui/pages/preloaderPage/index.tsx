import './style.less';
import { useEffect, useMemo, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Store } from '../../../store';
import { i18n, t, type TextKey } from '../../../i18n';
import {
  displayAddress,
  matchesSearch,
  playableHere,
  ServerConfig,
} from '../../../common/serverConfig';
import { ServerList } from '../../../common/serverList';
import { loadVersionUi, versionTags, versionUi } from '../../../version';
import type { PregameBackdrop } from '../../../version/uiContract';
import { uiClick } from '../../../libs/sfx';
import { COMBAT_BUS, playSfx, sound, type Sounds } from '../../../sound';
import { SoundsManager } from '../../../libs/soundsManager';
import { setSceneCovered } from '../../../common/sceneCover';
import { pregameLoad } from '../../../common/pregameLoad';
import { MuFlag } from '../../components/muFlag';
import { Backdrop } from './backdrop';
import { Button, Icon, Select, type IconName } from './controls';
import { WorldsView } from './worldsView';
import { SetupView } from './setupView';
import { DownloadView } from './downloadView';
import { LoadingRunner } from './loadingRunner';
import { LogoLight } from './logoLight';
import { LightningLine } from './lightningLine';
import { Hellfire } from './hellfire';
import { FooterStrike } from './footerStrike';
import { MuFrame } from './muFrame';
import { MuIcon } from './muIcon';
import { REACH_TEXT } from './banner';
import { ServerProbe } from '../../../common/serverProbe';

const GITHUB_URL = 'https://github.com/Ignies/OpenMu-Client-Babylon';

/** How long the page takes to fade off the login scene once a world is entered. */
const LEAVE_MS = 320;

/**
 * The Dark Wizard's Hellfire, heard as it lights under the opening card, and
 * how long it may wait for the browser to unlock audio after the Start press
 * before it would land after the fire has gone.
 */
const HELLFIRE_SOUND: Sounds = 'Sound/sHellFire';
const HELLFIRE_SOUND_WAIT_MS = 600;

type Section = 'worlds' | 'setup' | 'download';

/**
 * The card's tabs, as the landing page lists the panel's: a label, the one
 * line the open tab unfolds, and the section marker - a number and a MU map,
 * the way the landing marks its sections.
 */
const SECTIONS: {
  key: Section;
  label: TextKey;
  desc: TextKey;
  icon: IconName;
  marker: string;
}[] = [
  {
    key: 'worlds',
    label: 'worlds.tabWorlds',
    desc: 'worlds.tabWorldsDesc',
    icon: 'world',
    marker: '01  Lorencia',
  },
  {
    key: 'setup',
    label: 'worlds.tabSetup',
    desc: 'worlds.tabSetupDesc',
    icon: 'server',
    marker: '02  Devias',
  },
  {
    key: 'download',
    label: 'worlds.tabDownload',
    desc: 'worlds.tabDownloadDesc',
    icon: 'download',
    marker: '03  Noria',
  },
];

/** The filter's "no filter" entry, kept apart from the language codes. */
const ALL = '';

const LanguagePicker = observer(() => (
  <Select
    className="ws-language"
    value={i18n.current.code}
    options={i18n.languages.map(layer => ({
      value: layer.code,
      label: layer.label,
      lead: <MuFlag region={layer.region} width={18} />,
    }))}
    onChange={code => i18n.setLanguage(code)}
  />
));

/** A load that never finishes still hands the page over after this long. */
const SHOW_ANYWAY_MS = 20000;

/** How long the hunter has to run off the full bar before the line draws in. */
const READY_DELAY_MS = 700;

/**
 * Loading: the bar runs across the middle. Ready: the load is done, the crack
 * draws down from the logo and a Start button waits on it. Open: the worlds
 * card, opened out of a line spread from where the button was.
 */
type Phase = 'loading' | 'ready' | 'open';

/** The share of the bar the character scene's scenery takes, after the login scene. */
const CHARACTERS_SHARE = 0.2;

/**
 * How far the loading behind this page has got: the login scene, then the
 * character scene's scenery. `mapIndex` is not observable, but every warp
 * flips `sceneLoading`, which is.
 */
function backgroundLoad(backdrop: PregameBackdrop | null): {
  progress: number;
  done: boolean;
} {
  // Read before anything can return: an observer only redraws for what it read.
  const loading = Store.sceneLoading;
  const loaded = Store.loadingProgress;
  const warmed = pregameLoad.characters;

  if (!backdrop) return { progress: 0, done: false };

  const loginReady =
    !loading &&
    (backdrop.kind !== 'world' || Store.world?.mapIndex === backdrop.login);
  const login = loginReady ? 1 : loading ? loaded : 0;

  // A set-piece backdrop has no second world to warm.
  if (backdrop.kind !== 'world') return { progress: login, done: loginReady };

  // The warm starts once the login map's terrain is in, while that scene is
  // still settling, so the two shares fill side by side.
  return {
    progress: login * (1 - CHARACTERS_SHARE) + warmed * CHARACTERS_SHARE,
    done: loginReady && warmed >= 1,
  };
}

/**
 * The first screen: pick a world. Drawn in the Babylon site's style over its
 * world map, and opaque - the login scene loads behind it (`loginSceneSystem`
 * warps there for this state and prefetches the character scene), so entering
 * a world shows a scene that is already up rather than a loading bar.
 *
 * The filters live here rather than in the worlds view because they outlive
 * it: search, look at the setup tab, come back, and the search is still there.
 */
export const PreloaderPage = observer(() => {
  const [section, setSection] = useState<Section>('worlds');
  const [language, setLanguage] = useState(ALL);
  const [search, setSearch] = useState('');
  const [leaving, setLeaving] = useState(false);
  // The card folds away to show the map and its credits, and back.
  const [panelHidden, setPanelHidden] = useState(false);
  const leaveTimer = useRef(0);
  // The version's UI chunk arrives after the first frames, and nothing
  // observable says when: held here so its arrival redraws the page.
  const [backdrop, setBackdrop] = useState<PregameBackdrop | null>(
    () => versionUi()?.pregame.backdrop ?? null
  );

  useEffect(() => {
    if (!backdrop)
      void loadVersionUi().then(ui => setBackdrop(ui.pregame.backdrop));
  }, [backdrop]);

  // Opaque over the scene until it starts to fade off it.
  useEffect(() => {
    setSceneCovered(true);

    return () => {
      setSceneCovered(false);
      window.clearTimeout(leaveTimer.current);
    };
  }, []);

  const load = backgroundLoad(backdrop);

  // The worlds wait for the scenes behind them, so the page opens as a loading
  // screen, and the card arrives with everything it leads to already loaded.
  const [phase, setPhase] = useState<Phase>('loading');
  const loaded = phase !== 'loading';
  const open = phase === 'open';
  const ready = () => setPhase(p => (p === 'loading' ? 'ready' : p));

  useEffect(() => {
    if (!load.done) return;

    const timer = window.setTimeout(ready, READY_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [load.done]);

  useEffect(() => {
    const timer = window.setTimeout(ready, SHOW_ANYWAY_MS);

    return () => window.clearTimeout(timer);
  }, []);

  // Start is up: fetch the Hellfire's sound now, so it is decoded by the press.
  useEffect(() => {
    if (phase === 'ready' && SoundsManager.scene) {
      SoundsManager.loadSound(HELLFIRE_SOUND);
    }
  }, [phase]);

  // The card opening is the cue for the menu music and the Hellfire's roar.
  // The Start press that opened it is the gesture browsers want before they
  // play anything, and the unlock it starts lands a moment after it.
  useEffect(() => {
    if (!open) return;

    pregameLoad.setWorldsOpen(true);
    sound.tryUnlock();

    const roar = () => {
      if (!sound.unlocked) return false;
      playSfx(HELLFIRE_SOUND, null, { bus: COMBAT_BUS });
      return true;
    };
    const until = performance.now() + HELLFIRE_SOUND_WAIT_MS;
    let wait = 0;
    if (!roar()) {
      wait = window.setInterval(() => {
        if (roar() || performance.now() > until) window.clearInterval(wait);
      }, 30);
    }

    return () => {
      window.clearInterval(wait);
      pregameLoad.setWorldsOpen(false);
    };
  }, [open]);

  const all = ServerConfig.all;
  const selected = ServerConfig.active;

  // A saved world carries no language, so it belongs to no tag but `All`.
  const worlds = useMemo(
    () =>
      all.filter(
        w =>
          (language === ALL || w.language?.toLowerCase() === language) &&
          matchesSearch(w, search)
      ),
    [all, language, search]
  );

  const playable = playableHere(selected);
  const reach = ServerProbe.of(selected.id);
  const current = SECTIONS.find(entry => entry.key === section) ?? SECTIONS[0];
  const canEnter = playable && !ServerConfig.isEmpty && !leaving;

  const leave = (then: () => void) => {
    setLeaving(true);
    setSceneCovered(false);
    leaveTimer.current = window.setTimeout(then, LEAVE_MS);
  };

  /**
   * A world built for another client is refused rather than discouraged: the
   * connect would succeed and then come apart mid-handshake, which reads as a
   * broken client rather than the wrong one.
   */
  const enter = (id = selected.id) => {
    if (!open || ServerConfig.isEmpty || leaving) return;

    const world = ServerConfig.all.find(w => w.id === id);
    if (world && !playableHere(world)) return;

    ServerConfig.select(id);
    ServerConfig.markPlayed(id);
    leave(() => Store.playOnline());
  };

  const offline = () => {
    if (!leaving) leave(() => Store.playOffline());
  };

  // Enter enters from the grid or the search box. Anywhere else it belongs to
  // what has the focus: Enter in a server address or a password is not a
  // request to connect, and on a button it presses that button. Escape leaves
  // a field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA';
      const searching = !!target?.classList.contains('world-search');
      const onCard = !!target?.closest?.('[data-world]');
      const free =
        !typing && target?.tagName !== 'BUTTON' && target?.tagName !== 'A';

      if (phase === 'ready' && (e.key === 'Enter' || e.key === ' ')) {
        // Any Enter is Start while Start is all there is.
        setPhase('open');
      } else if (e.key === 'Escape' && typing) {
        target?.blur();
      } else if (
        open &&
        e.key === 'Enter' &&
        section === 'worlds' &&
        (free || searching || onCard)
      ) {
        enter();
      } else {
        return;
      }

      e.preventDefault();
    };

    window.addEventListener('keydown', onKey);

    return () => window.removeEventListener('keydown', onKey);
  });

  const loadText = load.done
    ? t('worlds.sceneReady')
    : `${t('worlds.scenePreparing')} ${Math.round(load.progress * 100)}%`;

  const status = [
    versionTags().join(', '),
    t('worlds.sceneReady'),
    ServerList.state === 'loading'
      ? t('servers.loading')
      : ServerList.state === 'error'
        ? t('server.listOffline')
        : null,
  ].filter((part): part is string => !!part);

  return (
    <div
      className={`ws-page${loaded ? ' is-loaded' : ''}${open ? ' is-open' : ''}${open && panelHidden ? ' is-panel-hidden' : ''}${leaving ? ' is-leaving' : ''}`}
    >
      <Backdrop />
      {open && <Hellfire />}

      <header className="ws-top">
        {open && (
          <Button
            icon={panelHidden ? 'eye' : 'eyeOff'}
            variant="ghost"
            small
            onClick={() => setPanelHidden(hidden => !hidden)}
          >
            {t(panelHidden ? 'worlds.showPanel' : 'worlds.hidePanel')}
          </Button>
        )}
        <LanguagePicker />
        <Button
          icon="gearFill"
          variant="ghost"
          small
          onClick={() => {
            Store.optionsEnabled = true;
          }}
        >
          {t('options.title')}
        </Button>
      </header>

      <main className="ws-main">
        <LogoLight />

        <div className="ws-stage">
          <LightningLine phase={phase} />

          {phase === 'loading' ? (
            <LoadingRunner
              progress={load.progress}
              done={load.done}
              label={loadText}
            />
          ) : phase === 'ready' ? (
            <button
              type="button"
              className="ws-start anim-host"
              autoFocus
              onClick={uiClick(() => setPhase('open'))}
            >
              <Icon name="play" />
              {t('worlds.start')}
            </button>
          ) : (
            <>
              {/* A line spread out from where Start was, then split in two:
                  its halves open up and down as the card's edges. */}
              <div className="ws-unfold" aria-hidden>
                <i />
                <i />
              </div>
              <section className="ws-card">
                <MuFrame />
                {/* The landing's panel section: its head and a vertical tab
                    list on the left, the product window on the right. */}
                <div className="ws-side">
                  <span className="ws-marker ws-mono">{current.marker}</span>
                  <h2 className="ws-headline">{t('worlds.headline')}</h2>
                  <p className="ws-lead">{t('worlds.lead')}</p>

                  <nav
                    className="ws-tabs"
                    role="tablist"
                    aria-orientation="vertical"
                  >
                    {SECTIONS.map(entry => (
                      <button
                        type="button"
                        role="tab"
                        aria-selected={section === entry.key}
                        key={entry.key}
                        className={`ws-tab anim-host${section === entry.key ? ' is-on' : ''}`}
                        onClick={uiClick(() => setSection(entry.key))}
                      >
                        <span className="ws-tab-row">
                          <MuIcon
                            name={entry.key}
                            size={22}
                            lit={section === entry.key}
                          />
                          <span>{t(entry.label)}</span>
                        </span>
                        <span className="ws-tab-desc">
                          <span>{t(entry.desc)}</span>
                        </span>
                      </button>
                    ))}
                  </nav>

                  <div className="ws-side-actions">
                    <Button
                      variant="primary"
                      icon="play"
                      className="ws-enter"
                      disabled={!canEnter}
                      onClick={() => enter()}
                    >
                      {t('worlds.enter')}
                    </Button>
                    <Button disabled={leaving} onClick={offline}>
                      {t('preloader.playOffline')}
                    </Button>
                  </div>
                </div>

                <figure className="ws-mock">
                  <figcaption className="ws-mock-bar">
                    <span className="ws-mock-server">
                      {ServerConfig.isEmpty
                        ? t('worlds.empty')
                        : selected.name.trim() || t('server.unnamed')}
                    </span>
                    <span className="ws-mock-sep">/</span>
                    <span className="ws-mock-title">{t(current.label)}</span>
                    {!!selected.version && (
                      <span
                        className={`ws-mock-pill ws-mono${playable ? '' : ' is-bad'}`}
                      >
                        {selected.version}
                      </span>
                    )}
                    {reach !== 'unknown' && (
                      <span className={`ws-mock-count ws-mono is-${reach}`}>
                        <span className="ws-badge-dot" />
                        {t(REACH_TEXT[reach])}
                      </span>
                    )}
                  </figcaption>

                  <div className="ws-body">
                    {section === 'download' ? (
                      <DownloadView />
                    ) : section === 'setup' ? (
                      <SetupView />
                    ) : (
                      <WorldsView
                        worlds={worlds}
                        total={all.length}
                        search={search}
                        onSearch={setSearch}
                        language={language}
                        onLanguage={setLanguage}
                        onEnter={enter}
                      />
                    )}
                  </div>

                  <div
                    className={`ws-mock-status ws-mono${playable ? '' : ' is-bad'}`}
                  >
                    {ServerConfig.isEmpty
                      ? t('worlds.empty')
                      : playable
                        ? displayAddress(selected)
                        : t('worlds.needsClient', {
                            world: selected.version ?? '',
                            client: versionTags().join(', '),
                          })}
                  </div>
                </figure>
              </section>
            </>
          )}
        </div>

        <FooterStrike lit={open} />

        <p className="ws-status ws-mono">
          {loaded && status.map(part => <span key={part}>{part}</span>)}
          {loaded && (
            <a
              className="ws-github anim-host"
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icon name="github" />
              GitHub
            </a>
          )}
        </p>
      </main>
    </div>
  );
});
