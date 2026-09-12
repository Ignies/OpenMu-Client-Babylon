import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { t, type TextKey } from '../../../i18n';
import { GmPanel } from '../../../gmPanel';
import { uiClick } from '../../../libs/sfx';
import { gmCommand } from '../../../common/gmCommands';
import { findMaps, mapName } from '../../../common/gmMaps';
import type { Nearby, WorldView } from '../../../gmWorld';
import { Radar } from './radar';
import {
  CommandCard,
  CommandFields,
  CommandPreview,
  QuickButton,
  RunButton,
} from './commandForm';

/**
 * The panel's screens.
 *
 * Each one is built for a job rather than being a list of commands: Travel
 * knows about maps, Nearby knows about the people in front of you, Character
 * puts the read and the write of one value side by side. The commands they
 * send are the catalogue's, with their parameters supplied rather than typed
 * wherever the screen already knows the answer.
 *
 * `view` is a fresh read of the world (see `gmWorld.ts`), polled by the shell.
 */

const HERO_STATE: Record<number, TextKey> = {
  0: 'gm.heroState.new',
  1: 'gm.heroState.hero',
  2: 'gm.heroState.hero',
  3: 'gm.heroState.normal',
  4: 'gm.heroState.outlaw',
  5: 'gm.heroState.murderer',
  6: 'gm.heroState.murderer',
};

/* ------------------------------------------------------------------ overview */

export const OverviewSection = observer(({ view }: { view: WorldView }) => {
  const hero = view.hero;

  if (!hero) {
    return <p className="gm-empty">{t('gm.notInWorld')}</p>;
  }

  const players = view.nearby.filter(e => e.kind === 'player');
  const monsters = view.nearby.filter(e => e.kind === 'monster');

  return (
    <>
      <section className="gm-stats">
        <div className="gm-stat">
          <span className="gm-stat-label">{t('gm.stat.map')}</span>
          <span className="gm-stat-value">{mapName(hero.map)}</span>
          <span className="gm-stat-sub">#{hero.map}</span>
        </div>
        <div className="gm-stat">
          <span className="gm-stat-label">{t('gm.stat.position')}</span>
          <span className="gm-stat-value gm-mono">
            {hero.x}, {hero.y}
          </span>
          <span className="gm-stat-sub">{t('gm.stat.live')}</span>
        </div>
        <div className="gm-stat">
          <span className="gm-stat-label">{t('common.level')}</span>
          <span className="gm-stat-value">{hero.level}</span>
          <span className="gm-stat-sub">
            {HERO_STATE[hero.heroState] ? t(HERO_STATE[hero.heroState]) : hero.heroState}
          </span>
        </div>
        <div className="gm-stat">
          <span className="gm-stat-label">{t('gm.stat.inScope')}</span>
          <span className="gm-stat-value">{players.length}</span>
          <span className="gm-stat-sub">
            {t('gm.stat.scopeCounts', {
              players: players.length,
              monsters: monsters.length,
            })}
          </span>
        </div>
      </section>

      <Radar
        view={view}
        selected={null}
        onPick={entry => {
          if (entry.kind === 'player') GmPanel.setTarget(entry.name);
          GmPanel.setSection('nearby');
        }}
      />

      <h4 className="gm-section-title">{t('gm.quickActions')}</h4>
      <div className="gm-quick">
        <QuickButton command={gmCommand('/hide')} />
        <QuickButton command={gmCommand('/unhide')} />
        <QuickButton command={gmCommand('/openware')} />
        <QuickButton command={gmCommand('/showids')} />
        <QuickButton command={gmCommand('/online')} />
        <QuickButton command={gmCommand('/clearinv')} />
      </div>
    </>
  );
});

/* -------------------------------------------------------------------- nearby */

const NearbyRow = observer(({ entry, hereX, hereY }: {
  entry: Nearby;
  hereX: number;
  hereY: number;
}) => {
  const [openId, setOpen] = useState(false);
  const isPlayer = entry.kind === 'player';
  const selected = isPlayer && GmPanel.target === entry.name;

  return (
    <li className={`gm-row${selected ? ' is-selected' : ''}`}>
      <button
        type="button"
        className="gm-row-main"
        onClick={uiClick(() => {
          if (isPlayer) GmPanel.setTarget(entry.name);
          setOpen(!openId);
        })}
      >
        <span className={`gm-dot gm-dot-${entry.kind}`} />
        <span className="gm-row-name">
          {entry.name}
          {entry.isGm ? <b className="gm-row-gm">{t('gm.tabPlate')}</b> : null}
          {entry.dying ? <em className="gm-row-dead">{t('gm.row.dead')}</em> : null}
        </span>
        <span className="gm-row-pos gm-mono">
          {entry.x}, {entry.y}
        </span>
        <span className="gm-row-dist">{entry.distance}t</span>
      </button>

      {openId ? (
        <div className="gm-row-actions">
          {isPlayer ? (
            <>
              <RunButton
                command={gmCommand('/trace')}
                overrides={{ characterName: entry.name }}
                labelKey="gm.action.goTo"
                compact
              />
              <RunButton
                command={gmCommand('/track')}
                overrides={{ characterName: entry.name }}
                labelKey="gm.action.bringHere"
                compact
              />
              <RunButton
                command={gmCommand('/charinfo')}
                overrides={{ characterName: entry.name }}
                labelKey="gm.action.info"
                compact
              />
              <RunButton
                command={gmCommand('/disconnect')}
                overrides={{ characterName: entry.name }}
                labelKey="gm.action.kick"
                compact
              />
              <RunButton
                command={gmCommand('/banchar')}
                overrides={{ characterName: entry.name }}
                labelKey="gm.action.ban"
                compact
              />
            </>
          ) : (
            <>
              <RunButton
                command={gmCommand('/removenpc')}
                overrides={{ id: String(entry.netId) }}
                labelKey="gm.action.remove"
                compact
              />
              <RunButton
                command={gmCommand('/movemonster')}
                overrides={{
                  id: String(entry.netId),
                  x: String(hereX),
                  y: String(hereY),
                }}
                labelKey="gm.action.bringHere"
                compact
              />
            </>
          )}
        </div>
      ) : null}
    </li>
  );
});

export const NearbySection = observer(({ view }: { view: WorldView }) => {
  const [kind, setKind] = useState<'player' | 'monster'>('player');

  const shown = view.nearby.filter(entry =>
    kind === 'player' ? entry.kind === 'player' : entry.kind !== 'player'
  );

  return (
    <>
      <div className="gm-toggle">
        <button
          type="button"
          className={`gm-toggle-btn${kind === 'player' ? ' is-active' : ''}`}
          onClick={uiClick(() => setKind('player'))}
        >
          {t('gm.nearby.players', {
            count: view.nearby.filter(e => e.kind === 'player').length,
          })}
        </button>
        <button
          type="button"
          className={`gm-toggle-btn${kind === 'monster' ? ' is-active' : ''}`}
          onClick={uiClick(() => setKind('monster'))}
        >
          {t('gm.nearby.monsters', {
            count: view.nearby.filter(e => e.kind !== 'player').length,
          })}
        </button>
      </div>

      {GmPanel.target ? (
        <p className="gm-target-note">
          {t('gm.actingOn')} <b>{GmPanel.target}</b>
          <button type="button" className="gm-link" onClick={uiClick(() => GmPanel.setTarget(''))}>
            {t('gm.clear')}
          </button>
        </p>
      ) : (
        <p className="gm-hint">{t('gm.nearby.pickHint')}</p>
      )}

      {shown.length === 0 ? (
        <p className="gm-empty">{t('gm.nearby.empty')}</p>
      ) : (
        <ul className="gm-rows">
          {shown.map(entry => (
            <NearbyRow
              key={entry.netId}
              entry={entry}
              hereX={view.hero?.x ?? 0}
              hereY={view.hero?.y ?? 0}
            />
          ))}
        </ul>
      )}
    </>
  );
});

/* -------------------------------------------------------------------- travel */

export const TravelSection = observer(({ view }: { view: WorldView }) => {
  const [filter, setFilter] = useState('');
  const [x, setX] = useState('');
  const [y, setY] = useState('');
  const teleport = gmCommand('/teleport');
  const move = gmCommand('/move');
  const maps = findMaps(filter);
  const hero = view.hero;

  /**
   * `/move` warps a *named* character, so warping yourself means naming
   * yourself - which is also what unlocks the second half of the command:
   * with a map in the second slot it reaches any map, and with coordinates it
   * skips the server's warp list entirely.
   */
  const warpMe = (mapNumber: number) => ({
    target: hero?.name ?? '',
    mapIdOrName: String(mapNumber),
    ...(x.trim() && y.trim() ? { x: x.trim(), y: y.trim() } : {}),
  });

  return (
    <>
      <section className="gm-card">
        <header className="gm-card-head">
          <h4>{t('gm.travel.teleportHere')}</h4>
          <code>/teleport</code>
        </header>
        <p className="gm-help">
          {hero
            ? t('gm.travel.youAreAt', {
                x: hero.x,
                y: hero.y,
                map: mapName(hero.map),
              })
            : t('gm.notInWorld')}
        </p>
        <div className="gm-pair">
          <CommandFields command={teleport} />
        </div>
        <CommandPreview command={teleport} />
        <div className="gm-card-actions">
          <RunButton command={teleport} />
        </div>
      </section>

      <h4 className="gm-section-title">{t('gm.travel.warpYourself')}</h4>
      <p className="gm-hint">{t('gm.travel.warpYourselfHint')}</p>

      <div className="gm-pair">
        <label className="gm-field">
          <span className="gm-field-label">{t('gm.param.x')}</span>
          <input
            className="gm-input"
            inputMode="numeric"
            value={x}
            placeholder={t('gm.hint.gate')}
            onChange={e => setX(e.target.value)}
          />
        </label>
        <label className="gm-field">
          <span className="gm-field-label">{t('gm.param.y')}</span>
          <input
            className="gm-input"
            inputMode="numeric"
            value={y}
            placeholder={t('gm.hint.gate')}
            onChange={e => setY(e.target.value)}
          />
        </label>
      </div>

      <input
        className="gm-search"
        type="search"
        value={filter}
        placeholder={t('gm.travel.filterMaps')}
        spellCheck={false}
        onChange={e => setFilter(e.target.value)}
      />

      {maps.length === 0 ? (
        <p className="gm-empty">{t('gm.travel.noMapMatches')}</p>
      ) : (
        <div className="gm-maps">
          {maps.map(map => (
            <RunButton
              key={map.number}
              command={move}
              overrides={warpMe(map.number)}
              text={map.name}
              compact
            />
          ))}
        </div>
      )}

      <h4 className="gm-section-title">{t('gm.travel.warpSomebody')}</h4>
      <CommandCard command={move} />
    </>
  );
});

/* ----------------------------------------------------------------- character */

/** A read and a write of the same value, side by side. */
const StatPair = observer(
  ({ get, set, labelKey }: { get: string; set: string; labelKey: TextKey }) => (
    <div className="gm-pairline">
      <span className="gm-pairline-label">{t(labelKey)}</span>
      <RunButton command={gmCommand(get)} labelKey="gm.action.read" compact />
      <CommandFields command={gmCommand(set)} hide={['characterName']} bare />
      <RunButton command={gmCommand(set)} labelKey="gm.action.set" compact />
    </div>
  )
);

export const CharacterSection = observer(() => (
  <>
    <label className="gm-field">
      <span className="gm-field-label">{t('gm.param.character')}</span>
      <input
        className="gm-input"
        type="text"
        value={GmPanel.target}
        placeholder={t('gm.hint.blankIsYou')}
        spellCheck={false}
        autoComplete="off"
        onChange={e => GmPanel.setTarget(e.target.value)}
      />
    </label>
    <p className="gm-hint">{t('gm.character.targetHint')}</p>

    <div className="gm-quick">
      <RunButton command={gmCommand('/charinfo')} labelKey="gm.cmd.charinfo.label" compact />
      <RunButton command={gmCommand('/clearinv')} labelKey="gm.cmd.clearinv.label" compact />
    </div>

    <h4 className="gm-section-title">{t('gm.character.values')}</h4>
    <StatPair labelKey="common.level" get="/getlevel" set="/setlevel" />
    <StatPair labelKey="common.zen" get="/getmoney" set="/setmoney" />
    <StatPair labelKey="gm.param.resets" get="/getresets" set="/setresets" />
    <StatPair labelKey="gm.param.points" get="/getleveluppoints" set="/setleveluppoints" />
    <StatPair labelKey="gm.param.masterLevel" get="/getmasterlevel" set="/setmasterlevel" />
    <StatPair
      labelKey="gm.param.masterPoints"
      get="/getmasterleveluppoints"
      set="/setmasterleveluppoints"
    />

    <h4 className="gm-section-title">{t('gm.character.stats')}</h4>
    <CommandCard command={gmCommand('/get')} hide={['characterName']} />
    <CommandCard command={gmCommand('/set')} hide={['characterName']} />

    <h4 className="gm-section-title">{t('gm.character.heroState')}</h4>
    <CommandCard command={gmCommand('/pk')} hide={['characterName']} />
  </>
));

/* --------------------------------------------------------------------- spawn */

export const SpawnSection = observer(({ view }: { view: WorldView }) => {
  const hero = view.hero;
  const here = hero ? { x: String(hero.x), y: String(hero.y) } : undefined;

  return (
    <>
      <CommandCard command={gmCommand('/createmonster')} />
      <CommandCard command={gmCommand('/item')} />

      <h4 className="gm-section-title">{t('gm.spawn.monstersInFront')}</h4>
      <p className="gm-hint">{t('gm.spawn.idsHint')}</p>
      <CommandCard
        command={gmCommand('/movemonster')}
        overrides={here}
        hide={here ? ['x', 'y'] : undefined}
      />
      <CommandCard command={gmCommand('/walkmonster')} />
      <CommandCard command={gmCommand('/removenpc')} />

      <h4 className="gm-section-title">{t('gm.spawn.yourself')}</h4>
      <CommandCard command={gmCommand('/skin')} />
      <CommandCard command={gmCommand('/npc')} />
    </>
  );
});

/* ---------------------------------------------------------------- moderation */

export const ModerationSection = observer(() => (
  <>
    {GmPanel.target ? (
      <p className="gm-target-note">
        {t('gm.actingOn')} <b>{GmPanel.target}</b>
        <button type="button" className="gm-link" onClick={uiClick(() => GmPanel.setTarget(''))}>
          {t('gm.clear')}
        </button>
      </p>
    ) : (
      <p className="gm-hint">{t('gm.moderation.pickHint')}</p>
    )}

    <h4 className="gm-section-title">{t('gm.moderation.characters')}</h4>
    <CommandCard command={gmCommand('/banchar')} hide={['characterName']} />
    <CommandCard command={gmCommand('/unbanchar')} hide={['characterName']} />
    <CommandCard command={gmCommand('/chatban')} hide={['characterName']} />
    <CommandCard command={gmCommand('/chatunban')} hide={['characterName']} />
    <CommandCard command={gmCommand('/disconnect')} hide={['characterName']} />

    <h4 className="gm-section-title">{t('gm.moderation.accounts')}</h4>
    <CommandCard command={gmCommand('/banacc')} />
    <CommandCard command={gmCommand('/unbanacc')} />

    <h4 className="gm-section-title">{t('gm.moderation.guilds')}</h4>
    <CommandCard command={gmCommand('/guilddisconnect')} />
    <CommandCard command={gmCommand('/guildmove')} />
  </>
));

/* -------------------------------------------------------------------- events */

export const EventsSection = observer(({ view }: { view: WorldView }) => {
  const hero = view.hero;
  const here = hero ? { x: String(hero.x), y: String(hero.y) } : undefined;

  return (
    <>
      <h4 className="gm-section-title">{t('gm.events.start')}</h4>
      <div className="gm-quick">
        <QuickButton command={gmCommand('/startbc')} />
        <QuickButton command={gmCommand('/startcc')} />
        <QuickButton command={gmCommand('/startds')} />
      </div>

      <h4 className="gm-section-title">{t('gm.cmd.fireworks.label')}</h4>
      <p className="gm-hint">{t('gm.events.fireworksHint')}</p>
      <div className="gm-quick">
        <RunButton
          command={gmCommand('/fireworks')}
          overrides={here}
          labelKey="gm.events.here"
          compact
        />
        <RunButton
          command={gmCommand('/xmasfireworks')}
          overrides={here}
          labelKey="gm.events.christmasHere"
          compact
        />
      </div>
      <CommandCard command={gmCommand('/fireworks')} />

      <h4 className="gm-section-title">{t('gm.events.announce')}</h4>
      <CommandCard command={gmCommand('/goldnotice')} />
    </>
  );
});

/* ------------------------------------------------------------------- console */

export const ConsoleSection = observer(() => {
  const [raw, setRaw] = useState('');

  return (
    <>
      <label className="gm-field">
        <span className="gm-field-label">{t('gm.console.typeLine')}</span>
        <input
          className="gm-input gm-mono"
          type="text"
          value={raw}
          placeholder="/item 7 3 13"
          spellCheck={false}
          autoComplete="off"
          onChange={e => setRaw(e.target.value)}
          onKeyDown={e => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            e.stopPropagation();
            GmPanel.sendRaw(raw);
            setRaw('');
          }}
        />
      </label>
      <p className="gm-hint">{t('gm.console.rawHint')}</p>

      <input
        className="gm-search"
        type="search"
        value={GmPanel.query}
        placeholder={t('gm.console.search')}
        spellCheck={false}
        autoComplete="off"
        onChange={e => GmPanel.setQuery(e.target.value)}
      />

      {GmPanel.consoleGroups.length === 0 ? (
        <p className="gm-empty">{t('gm.console.noMatch')}</p>
      ) : (
        GmPanel.consoleGroups.map(group => (
          <div key={group.titleKey}>
            <h4 className="gm-section-title">{t(group.titleKey)}</h4>
            <div className="gm-commands">
              {group.commands.map(command => (
                <button
                  key={command.command}
                  type="button"
                  className={`gm-command${
                    GmPanel.selected?.command === command.command ? ' is-active' : ''
                  }${command.confirm ? ' is-heavy' : ''}`}
                  onClick={uiClick(() => GmPanel.select(command))}
                  title={t(command.helpKey)}
                >
                  <span className="gm-command-label">{t(command.labelKey)}</span>
                  <code className="gm-command-slash">{command.command}</code>
                </button>
              ))}
            </div>
          </div>
        ))
      )}

      {GmPanel.selected ? (
        <CommandCard command={GmPanel.selected} />
      ) : null}
    </>
  );
});
