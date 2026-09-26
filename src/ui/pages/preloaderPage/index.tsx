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
import { versionTags, versionUi } from '../../../version';
import { uiClick } from '../../../libs/sfx';
import { setSceneCovered } from '../../../common/sceneCover';
import { MuFlag } from '../../components/muFlag';
import { Backdrop } from './backdrop';
import { Button, Icon, Select, type IconName } from './controls';
import { WorldsView } from './worldsView';
import { SetupView } from './setupView';
import { DownloadView } from './downloadView';

const LOGO_ART = '/ui/world_select/logo.webp';

/** How long the page takes to fade off the login scene once a world is entered. */
const LEAVE_MS = 320;

type Section = 'worlds' | 'setup' | 'download';

const SECTIONS: { key: Section; label: TextKey; icon: IconName }[] = [
  { key: 'worlds', label: 'worlds.tabWorlds', icon: 'world' },
  { key: 'setup', label: 'worlds.tabSetup', icon: 'server' },
  { key: 'download', label: 'worlds.tabDownload', icon: 'download' },
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

/**
 * Whether the login scene behind this page has finished loading. `mapIndex` is
 * not observable, but every warp flips `sceneLoading`, which is.
 */
function loginSceneReady(): boolean {
  if (Store.sceneLoading) return false;

  const backdrop = versionUi()?.pregame.backdrop;
  if (!backdrop) return false;
  if (backdrop.kind !== 'world') return true;

  return Store.world?.mapIndex === backdrop.login;
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
  const leaveTimer = useRef(0);

  // Opaque over the scene until it starts to fade off it.
  useEffect(() => {
    setSceneCovered(true);

    return () => {
      setSceneCovered(false);
      window.clearTimeout(leaveTimer.current);
    };
  }, []);

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
    if (ServerConfig.isEmpty || leaving) return;

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
      const typing = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA';
      const searching = !!target?.classList.contains('world-search');
      const onCard = !!target?.closest?.('[data-world]');
      const free = !typing && target?.tagName !== 'BUTTON';

      if (e.key === 'Escape' && typing) {
        target?.blur();
      } else if (e.key === 'Enter' && section === 'worlds' && (free || searching || onCard)) {
        enter();
      } else {
        return;
      }

      e.preventDefault();
    };

    window.addEventListener('keydown', onKey);

    return () => window.removeEventListener('keydown', onKey);
  });

  const sceneReady = loginSceneReady();
  const status = [
    versionTags().join(', '),
    sceneReady
      ? t('worlds.sceneReady')
      : `${t('worlds.scenePreparing')}${
          Store.sceneLoading ? ` ${Math.round(Store.loadingProgress * 100)}%` : ''
        }`,
    ServerList.state === 'loading'
      ? t('servers.loading')
      : ServerList.state === 'error'
        ? t('server.listOffline')
        : null,
  ].filter((part): part is string => !!part);

  return (
    <div className={`ws-page${leaving ? ' is-leaving' : ''}`}>
      <Backdrop />

      <header className="ws-top">
        <LanguagePicker />
        <Button
          icon="gear"
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
        <img className="ws-logo" src={LOGO_ART} alt="OpenMU Babylon" draggable={false} />

        <section className="ws-card">
          <nav className="ws-tabs">
            {SECTIONS.map(entry => (
              <button
                type="button"
                key={entry.key}
                className={`ws-tab anim-host${section === entry.key ? ' is-on' : ''}`}
                onClick={uiClick(() => setSection(entry.key))}
              >
                <Icon name={entry.icon} />
                {t(entry.label)}
              </button>
            ))}
          </nav>

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

          <footer className="ws-foot">
            <div className="ws-foot-world">
              {ServerConfig.isEmpty ? (
                <span className="ws-muted">{t('worlds.empty')}</span>
              ) : (
                <>
                  <span className="ws-foot-name">
                    {selected.name.trim() || t('server.unnamed')}
                  </span>
                  {playable ? (
                    <span className="ws-mono ws-muted">{displayAddress(selected)}</span>
                  ) : (
                    <span className="ws-foot-warn">
                      <Icon name="warning" />
                      {t('worlds.needsClient', {
                        world: selected.version ?? '',
                        client: versionTags().join(', '),
                      })}
                    </span>
                  )}
                </>
              )}
            </div>
            <Button variant="ghost" disabled={leaving} onClick={offline}>
              {t('preloader.playOffline')}
            </Button>
            <Button
              variant="primary"
              icon="play"
              className="ws-enter"
              disabled={!canEnter}
              onClick={() => enter()}
            >
              {t('worlds.enter')}
            </Button>
          </footer>
        </section>

        <p className="ws-status ws-mono">
          {status.map(part => (
            <span key={part}>{part}</span>
          ))}
        </p>
      </main>
    </div>
  );
});
