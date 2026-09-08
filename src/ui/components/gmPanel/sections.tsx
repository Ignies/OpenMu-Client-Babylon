import { useState } from 'react';
import { observer } from 'mobx-react-lite';
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

const HERO_STATE: Record<number, string> = {
  0: 'New',
  1: 'Hero',
  2: 'Hero',
  3: 'Normal',
  4: 'Outlaw',
  5: 'Murderer',
  6: 'Murderer',
};

/* ------------------------------------------------------------------ overview */

export const OverviewSection = observer(({ view }: { view: WorldView }) => {
  const hero = view.hero;

  if (!hero) {
    return <p className="gm-empty">Not in the world yet.</p>;
  }

  const players = view.nearby.filter(e => e.kind === 'player');
  const monsters = view.nearby.filter(e => e.kind === 'monster');

  return (
    <>
      <section className="gm-stats">
        <div className="gm-stat">
          <span className="gm-stat-label">Map</span>
          <span className="gm-stat-value">{mapName(hero.map)}</span>
          <span className="gm-stat-sub">#{hero.map}</span>
        </div>
        <div className="gm-stat">
          <span className="gm-stat-label">Position</span>
          <span className="gm-stat-value gm-mono">
            {hero.x}, {hero.y}
          </span>
          <span className="gm-stat-sub">live</span>
        </div>
        <div className="gm-stat">
          <span className="gm-stat-label">Level</span>
          <span className="gm-stat-value">{hero.level}</span>
          <span className="gm-stat-sub">{HERO_STATE[hero.heroState] ?? hero.heroState}</span>
        </div>
        <div className="gm-stat">
          <span className="gm-stat-label">In scope</span>
          <span className="gm-stat-value">{players.length}</span>
          <span className="gm-stat-sub">
            {players.length === 1 ? 'player' : 'players'}, {monsters.length} mob
            {monsters.length === 1 ? '' : 's'}
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

      <h4 className="gm-section-title">Quick actions</h4>
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
          {entry.isGm ? <b className="gm-row-gm">GM</b> : null}
          {entry.dying ? <em className="gm-row-dead">dead</em> : null}
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
                label="Go to"
                compact
              />
              <RunButton
                command={gmCommand('/track')}
                overrides={{ characterName: entry.name }}
                label="Bring here"
                compact
              />
              <RunButton
                command={gmCommand('/charinfo')}
                overrides={{ characterName: entry.name }}
                label="Info"
                compact
              />
              <RunButton
                command={gmCommand('/disconnect')}
                overrides={{ characterName: entry.name }}
                label="Kick"
                compact
              />
              <RunButton
                command={gmCommand('/banchar')}
                overrides={{ characterName: entry.name }}
                label="Ban"
                compact
              />
            </>
          ) : (
            <>
              <RunButton
                command={gmCommand('/removenpc')}
                overrides={{ id: String(entry.netId) }}
                label="Remove"
                compact
              />
              <RunButton
                command={gmCommand('/movemonster')}
                overrides={{
                  id: String(entry.netId),
                  x: String(hereX),
                  y: String(hereY),
                }}
                label="Bring here"
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
          Players ({view.nearby.filter(e => e.kind === 'player').length})
        </button>
        <button
          type="button"
          className={`gm-toggle-btn${kind === 'monster' ? ' is-active' : ''}`}
          onClick={uiClick(() => setKind('monster'))}
        >
          Monsters ({view.nearby.filter(e => e.kind !== 'player').length})
        </button>
      </div>

      {GmPanel.target ? (
        <p className="gm-target-note">
          Acting on <b>{GmPanel.target}</b>
          <button type="button" className="gm-link" onClick={uiClick(() => GmPanel.setTarget(''))}>
            clear
          </button>
        </p>
      ) : (
        <p className="gm-hint">
          Pick a player to aim the Character and Moderation screens at them.
        </p>
      )}

      {shown.length === 0 ? (
        <p className="gm-empty">
          Nothing in scope. The server only tells this client what is near you.
        </p>
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
          <h4>Teleport on this map</h4>
          <code>/teleport</code>
        </header>
        <p className="gm-help">
          {hero ? (
            <>
              You are at{' '}
              <b className="gm-mono">
                {hero.x}, {hero.y}
              </b>{' '}
              on {mapName(hero.map)}.
            </>
          ) : (
            'Not in the world yet.'
          )}
        </p>
        <div className="gm-pair">
          <CommandFields command={teleport} />
        </div>
        <CommandPreview command={teleport} />
        <div className="gm-card-actions">
          <RunButton command={teleport} />
        </div>
      </section>

      <h4 className="gm-section-title">Warp yourself</h4>
      <p className="gm-hint">
        Leave the spot blank to arrive at the map’s gate, which only works for maps on the
        server’s warp list. Fill it in and any map is reachable.
      </p>

      <div className="gm-pair">
        <label className="gm-field">
          <span className="gm-field-label">X</span>
          <input
            className="gm-input"
            inputMode="numeric"
            value={x}
            placeholder="gate"
            onChange={e => setX(e.target.value)}
          />
        </label>
        <label className="gm-field">
          <span className="gm-field-label">Y</span>
          <input
            className="gm-input"
            inputMode="numeric"
            value={y}
            placeholder="gate"
            onChange={e => setY(e.target.value)}
          />
        </label>
      </div>

      <input
        className="gm-search"
        type="search"
        value={filter}
        placeholder="Filter maps…"
        spellCheck={false}
        onChange={e => setFilter(e.target.value)}
      />

      {maps.length === 0 ? (
        <p className="gm-empty">No map matches that.</p>
      ) : (
        <div className="gm-maps">
          {maps.map(map => (
            <RunButton
              key={map.number}
              command={move}
              overrides={warpMe(map.number)}
              label={map.name}
              compact
            />
          ))}
        </div>
      )}

      <h4 className="gm-section-title">Warp somebody else</h4>
      <CommandCard command={move} label="Warp a character" />
    </>
  );
});

/* ----------------------------------------------------------------- character */

/** A read and a write of the same value, side by side. */
const StatPair = observer(
  ({ get, set, label }: { get: string; set: string; label: string }) => (
    <div className="gm-pairline">
      <span className="gm-pairline-label">{label}</span>
      <RunButton command={gmCommand(get)} label="Read" compact />
      <CommandFields command={gmCommand(set)} hide={['characterName']} bare />
      <RunButton command={gmCommand(set)} label="Set" compact />
    </div>
  )
);

export const CharacterSection = observer(() => (
  <>
    <label className="gm-field">
      <span className="gm-field-label">Character</span>
      <input
        className="gm-input"
        type="text"
        value={GmPanel.target}
        placeholder="blank = you"
        spellCheck={false}
        autoComplete="off"
        onChange={e => GmPanel.setTarget(e.target.value)}
      />
    </label>
    <p className="gm-hint">
      Picked in Nearby, or typed here. Blank means you, wherever the command allows it.
    </p>

    <div className="gm-quick">
      <RunButton command={gmCommand('/charinfo')} label="Character info" compact />
      <RunButton command={gmCommand('/clearinv')} label="Clear inventory" compact />
    </div>

    <h4 className="gm-section-title">Values</h4>
    <StatPair label="Level" get="/getlevel" set="/setlevel" />
    <StatPair label="Zen" get="/getmoney" set="/setmoney" />
    <StatPair label="Resets" get="/getresets" set="/setresets" />
    <StatPair label="Points" get="/getleveluppoints" set="/setleveluppoints" />
    <StatPair label="Master lv" get="/getmasterlevel" set="/setmasterlevel" />
    <StatPair label="Master pts" get="/getmasterleveluppoints" set="/setmasterleveluppoints" />

    <h4 className="gm-section-title">Stats</h4>
    <CommandCard command={gmCommand('/get')} hide={['characterName']} label="Read a stat" />
    <CommandCard command={gmCommand('/set')} hide={['characterName']} label="Set a stat" />

    <h4 className="gm-section-title">Hero state</h4>
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

      <h4 className="gm-section-title">Monsters in front of you</h4>
      <p className="gm-hint">
        Ids come from Show NPC ids, or from the Nearby list. Coordinates default to where you
        stand.
      </p>
      <CommandCard
        command={gmCommand('/movemonster')}
        overrides={here}
        hide={here ? ['x', 'y'] : undefined}
        label="Bring a monster here"
      />
      <CommandCard command={gmCommand('/walkmonster')} label="Walk a monster to a spot" />
      <CommandCard command={gmCommand('/removenpc')} />

      <h4 className="gm-section-title">Yourself</h4>
      <CommandCard command={gmCommand("/skin")} label="Wear a monster skin" />
      <CommandCard command={gmCommand("/npc")} label="Open an NPC store" />
    </>
  );
});

/* ---------------------------------------------------------------- moderation */

export const ModerationSection = observer(() => (
  <>
    {GmPanel.target ? (
      <p className="gm-target-note">
        Acting on <b>{GmPanel.target}</b>
        <button type="button" className="gm-link" onClick={uiClick(() => GmPanel.setTarget(''))}>
          clear
        </button>
      </p>
    ) : (
      <p className="gm-hint">Pick a player in Nearby, or type a name in each command.</p>
    )}

    <h4 className="gm-section-title">Characters</h4>
    <CommandCard command={gmCommand('/banchar')} hide={['characterName']} />
    <CommandCard command={gmCommand('/unbanchar')} hide={['characterName']} />
    <CommandCard command={gmCommand('/chatban')} hide={['characterName']} />
    <CommandCard command={gmCommand('/chatunban')} hide={['characterName']} />
    <CommandCard command={gmCommand('/disconnect')} hide={['characterName']} />

    <h4 className="gm-section-title">Accounts</h4>
    <CommandCard command={gmCommand('/banacc')} />
    <CommandCard command={gmCommand('/unbanacc')} />

    <h4 className="gm-section-title">Guilds</h4>
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
      <h4 className="gm-section-title">Start an event</h4>
      <div className="gm-quick">
        <QuickButton command={gmCommand('/startbc')} />
        <QuickButton command={gmCommand('/startcc')} />
        <QuickButton command={gmCommand('/startds')} />
      </div>

      <h4 className="gm-section-title">Fireworks</h4>
      <p className="gm-hint">Set off where you stand, or give a spot on this map.</p>
      <div className="gm-quick">
        <RunButton
          command={gmCommand('/fireworks')}
          overrides={here}
          label="Here"
          compact
        />
        <RunButton
          command={gmCommand('/xmasfireworks')}
          overrides={here}
          label="Christmas, here"
          compact
        />
      </div>
      <CommandCard command={gmCommand('/fireworks')} label="Fireworks at a spot" />

      <h4 className="gm-section-title">Announce</h4>
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
        <span className="gm-field-label">Type a line</span>
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
      <p className="gm-hint">
        Sent exactly as typed, the same as the chat box. Nothing here is checked first.
      </p>

      <input
        className="gm-search"
        type="search"
        value={GmPanel.query}
        placeholder="Search every command…"
        spellCheck={false}
        autoComplete="off"
        onChange={e => GmPanel.setQuery(e.target.value)}
      />

      {GmPanel.consoleGroups.length === 0 ? (
        <p className="gm-empty">No command matches that.</p>
      ) : (
        GmPanel.consoleGroups.map(group => (
          <div key={group.title}>
            <h4 className="gm-section-title">{group.title}</h4>
            <div className="gm-commands">
              {group.commands.map(command => (
                <button
                  key={command.command}
                  type="button"
                  className={`gm-command${
                    GmPanel.selected?.command === command.command ? ' is-active' : ''
                  }${command.confirm ? ' is-heavy' : ''}`}
                  onClick={uiClick(() => GmPanel.select(command))}
                  title={command.help}
                >
                  <span className="gm-command-label">{command.label}</span>
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
