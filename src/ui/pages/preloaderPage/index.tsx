import './style.less';
import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Store } from '../../../store';
import { ENUM_WORLD } from '../../../common';
import { displayAddress, ServerConfig } from '../../../common/serverConfig';
import { ServerList } from '../../../common/serverList';
import { useEventBus } from '../../../hooks/useEventBus';
import { MuSpriteFrame } from '../../components/muSprite';
import { MuButton } from '../../components/muButton';
import { MuText } from '../../components/muText';
import { MuLogo } from '../../components/muLogo';
import { LoadingArt, useSheetSizes } from '../../components/loadingScreen/art';
import { TEXT_COLOR } from '../serversPage/layout';
import { t } from '../../../i18n';
import { ServerSettings } from './serverSettings';
import { WorldSelect } from './worldSelect';
import {
  MENU_BTN_HEIGHT,
  MENU_BTN_STEP,
  MENU_BTN_WIDTH,
  MENU_BTN_X,
  MENU_ENDPOINT_LINE_Y,
  MENU_SERVER_LINE_Y,
  MENU_WIN_HEIGHT,
  MENU_WIN_WIDTH,
  menuButtonsTop,
  SPRITE,
} from './layout';

/** The menu, the worlds it opens, or the server fields Worlds opens in turn. */
type View = 'menu' | 'worlds' | 'setup';

/**
 * The start menu: MU's login window frame over the login scene the original
 * opens on (`WD_73NEW_LOGIN_SCENE` — `loginSceneSystem` warps to it for this
 * state too, so the camera is already touring the map behind this window).
 *
 * The scene needs a moment to load, and a black screen is not what MU shows
 * while a map loads — its loading artwork is. So that art is the backdrop
 * until the warp completes, then it fades off the camera tour.
 */
export const PreloaderPage = observer(() => {
  const [view, setView] = useState<View>('menu');
  const [sceneReady, setSceneReady] = useState(false);
  const { contain, cover } = useSheetSizes();

  useEventBus('warpCompleted', () => {
    if (Store.world?.mapIndex === ENUM_WORLD.WD_73NEW_LOGIN_SCENE) {
      setSceneReady(true);
    }
  });

  const profile = ServerConfig.active;

  // Nothing is drawn before the interface sprites are decoded: every frame of
  // this page is a piece of MU art, and unstyled text over the map is not a
  // loading state anyone would recognise. Black, then the artwork, then the
  // scene — the order the original boots in.
  const artReady = !Store.spritesLoading;
  const backGone = artReady && sceneReady;

  // Two entries. Picking a world and entering it is one act, so both live on
  // the Worlds screen — which is also where a server the published list does
  // not carry gets typed in — and the menu keeps only the two ways in.
  const buttons = [
    { key: 'worlds', label: t('preloader.worlds'), onClick: () => setView('worlds') },
    { key: 'offline', label: t('preloader.playOffline'), onClick: () => Store.playOffline() },
  ];
  const buttonsTop = menuButtonsTop(buttons.length);

  return (
    <div className="preloader-page">
      {/* The loading artwork, fading out once the 3D scene behind is up. */}
      <div className={`preloader-back${backGone ? ' preloader-back-gone' : ''}`}>
        {artReady && (
          <>
            <LoadingArt size={cover} className="loading-art loading-art-blur" />
            <LoadingArt size={contain} className="loading-art" />
          </>
        )}
      </div>

      {!artReady ? null : view === 'setup' ? (
        // Setup is reached through Worlds, so Close goes back there.
        <ServerSettings onClose={() => setView('worlds')} />
      ) : view === 'worlds' ? (
        <WorldSelect
          onPlay={() => Store.playOnline()}
          onSetup={() => setView('setup')}
          onClose={() => setView('menu')}
        />
      ) : (
        <>
          <MuLogo />

          <MuSpriteFrame
            file={SPRITE.menuWindow}
            width={MENU_WIN_WIDTH}
            height={MENU_WIN_HEIGHT}
            className="preloader-win"
          >
            {buttons.map((button, i) => (
              <MuButton
                key={button.key}
                file={SPRITE.menuButton}
                width={MENU_BTN_WIDTH}
                height={MENU_BTN_HEIGHT}
                frames={{ up: 0, active: 1, down: 2 }}
                color={TEXT_COLOR.brightGray}
                activeColor={TEXT_COLOR.white}
                label={button.label}
                onClick={button.onClick}
                style={{
                  position: 'absolute',
                  left: MENU_BTN_X,
                  top: buttonsTop + MENU_BTN_STEP * i,
                }}
                labelStyle={{ fontSize: 12 }}
              />
            ))}

            {/* Which server the next click connects to, and where that is —
                or, with nothing to name yet, what the list is doing. */}
            {ServerConfig.isEmpty ? (
              <MuText
                className="preloader-line"
                color={TEXT_COLOR.brightGray}
                style={{ top: MENU_SERVER_LINE_Y }}
                text={
                  ServerList.state === 'error'
                    ? t('server.listOffline')
                    : ServerList.state === 'ok'
                      ? t('worlds.empty')
                      : t('servers.loading')
                }
              />
            ) : (
              <>
                <MuText
                  face="fix"
                  className="preloader-line"
                  color={TEXT_COLOR.brightYellow}
                  style={{ top: MENU_SERVER_LINE_Y }}
                  text={profile.name.trim() || t('server.unnamed')}
                />
                <MuText
                  className="preloader-line"
                  color={TEXT_COLOR.brightGray}
                  style={{ top: MENU_ENDPOINT_LINE_Y }}
                  text={displayAddress(profile)}
                />
              </>
            )}
          </MuSpriteFrame>
        </>
      )}
    </div>
  );
});
