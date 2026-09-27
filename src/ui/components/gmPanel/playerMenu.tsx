import { observer } from 'mobx-react-lite';
import { t } from '../../../i18n';
import { GmPanel } from '../../../gmPanel';
import { mapName } from '../../../common/gmMaps';
import { gmCommand, type GmCommand } from '../../../common/gmCommands';
import { className, type TrackedPlayer } from '../../../common/adminProtocol';
import { uiClick } from '../../../libs/sfx';
import { ContextMenu, type MenuPoint } from './contextMenu';

/**
 * A right-click on a player, on the Map tab or in Live: where they are, the
 * moves between you and them, and the moderation lines by their name. What
 * takes something away asks for a second press here too, and the menu stays
 * open for it.
 */

type Hero = { name: string; map: number; x: number; y: number };

export const PlayerMenu = observer(
  ({
    player,
    at,
    hero,
    onClose,
  }: {
    player: TrackedPlayer;
    at: MenuPoint;
    hero: Hero | null;
    onClose: () => void;
  }) => {
    const name = player.character ?? '';
    const move = gmCommand('/move');
    const own = name !== '' && name === hero?.name;

    const run = (command: GmCommand, overrides: Record<string, string>) => {
      GmPanel.run(command, overrides);
      // A command that asks first keeps the menu open for the second press.
      if (!command.confirm || !GmPanel.confirming) onClose();
    };

    const heavy = (command: GmCommand, overrides: Record<string, string>) => {
      const armed = GmPanel.isArmed(command, overrides);
      return (
        <button
          type="button"
          className={`gm-menu-item is-heavy${armed ? ' is-armed' : ''}`}
          onClick={uiClick(() => run(command, overrides))}
        >
          {armed ? t('gm.confirm') : t(command.labelKey)}
        </button>
      );
    };

    const act = (then: () => void) => {
      then();
      onClose();
    };

    return (
      <ContextMenu at={at} onClose={onClose}>
        <header className="gm-menu-head">
          <b>{name || player.account || player.id}</b>
          <span>
            {player.cls !== null ? className(player.cls) : ''} {player.level || ''}
          </span>
        </header>
        {player.map !== null ? (
          <p className="gm-menu-note gm-mono">
            {mapName(player.map)} {player.x}, {player.y}
          </p>
        ) : null}

        {name ? (
          <>
            {hero && !own && player.map !== null ? (
              <>
                <button
                  type="button"
                  className="gm-menu-item"
                  onClick={uiClick(() =>
                    run(move, {
                      target: hero.name,
                      mapIdOrName: String(player.map),
                      x: String(player.x),
                      y: String(player.y),
                    })
                  )}
                >
                  {t('gm.player.goTo')}
                </button>
                <button
                  type="button"
                  className="gm-menu-item"
                  onClick={uiClick(() =>
                    run(move, {
                      target: name,
                      mapIdOrName: String(hero.map),
                      x: String(hero.x),
                      y: String(hero.y),
                    })
                  )}
                >
                  {t('gm.player.bring')}
                </button>
              </>
            ) : null}
            <button
              type="button"
              className="gm-menu-item"
              onClick={uiClick(() => run(gmCommand('/charinfo'), { characterName: name }))}
            >
              {t('gm.cmd.charinfo.label')}
            </button>

            <div className="gm-menu-sep" />

            <button type="button" className="gm-menu-item" onClick={uiClick(() => act(() => GmPanel.setTarget(name)))}>
              {t('gm.player.target')}
            </button>
            <button
              type="button"
              className="gm-menu-item"
              onClick={uiClick(() =>
                act(() => {
                  GmPanel.setTarget(name);
                  GmPanel.setSection('character');
                })
              )}
            >
              {t('gm.player.openCharacter')}
            </button>
            <button type="button" className="gm-menu-item" onClick={uiClick(() => act(() => GmPanel.showLog(name)))}>
              {t('gm.player.showLog')}
            </button>
            {GmPanel.section !== 'map' && player.map !== null ? (
              <button
                type="button"
                className="gm-menu-item"
                onClick={uiClick(() => act(() => GmPanel.showOnMap(player.map, player.id)))}
              >
                {t('gm.player.showOnMap')}
              </button>
            ) : null}

            {!own ? (
              <>
                <div className="gm-menu-sep" />
                {heavy(gmCommand('/disconnect'), { characterName: name })}
                {heavy(gmCommand('/banchar'), { characterName: name })}
              </>
            ) : null}
          </>
        ) : null}
      </ContextMenu>
    );
  }
);
