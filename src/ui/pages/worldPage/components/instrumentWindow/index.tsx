import './style.less';
import { useRef, type CSSProperties } from 'react';
import { observer } from 'mobx-react-lite';
import { t } from '../../../../../i18n';
import { Store } from '../../../../../store';
import {
  Band,
  instrumentById,
  joinBand,
  leaveBand,
  loadMidiFile,
  pauseSong,
  playSong,
  putAwayInstrument,
  remotePerformers,
  setLoop,
  stopPlaying,
  toggleInstrumentWindow,
} from '../../../../../common/band';
import { PERCUSSION_CHANNEL } from '../../../../../common/band/bandState';
import { uiClick } from '../../../../../libs/sfx';
import { MuButton } from '../../../../components/muButton';
import { MuSpriteFrame } from '../../../../components/muSprite';
import { MuItemWindow, MuTableFrame } from '../../../../components/muWindow';

/**
 * The Instrument window: what the player does with the instrument in hand,
 * in the original's item-window frame like the party and friend windows. A
 * song to load and run, its channels, the band around the player, and the
 * way to put the instrument away. Opens when an instrument is taken out;
 * Escape, the X and the exit button close it, the instrument stays out.
 *
 * The song's position is drawn with the party window's life bar: the
 * original has no progress bar, and that trough is the one it draws for a
 * number out of a whole.
 */

const WINDOW_ID = 'instrument-window';

const TITLE_Y = 12;
/** The X in the frame art. `left`/`top`, not `x`/`y`: those are not CSS on a div. */
const HEAD_CLOSE = { left: 169, top: 7, width: 13, height: 12 };
const SONG = { x: 12, y: 34, width: 166, height: 98 };
const CHANNELS = { x: 12, y: 138, width: 166, height: 112 };
const BAND = { x: 12, y: 256, width: 166, height: 114 };
const STATUS_Y = 374;
const EXIT_BUTTON = { x: 13, y: 392, width: 36, height: 29 };
const PUT_AWAY = { left: 58, top: 398 };
/** Inset of a table's content from its frame. */
const PAD = 8;

/** Tiles within which another performer can be joined. */
const JOIN_RANGE = 10;

const EXIT_SPRITE = 'newui_exit_00.OZT';
/** `newui_party_lifebar01/02`: the 151x8 trough, the 147x4 fill inset by two pixels. */
const BAR_BACK_SPRITE = 'newui_Party_Lifebar01.OZJ';
const BAR_FILL_SPRITE = 'newui_Party_Lifebar02.OZJ';
const BAR = { width: 151, height: 8 };
const BAR_FILL = { width: 147, height: 4, insetX: 2, insetY: 2 };

// Hoisted: `MuSpriteFrame` is memoised on its props.
const BAR_STYLE: CSSProperties = { backgroundSize: '100% 100%' };
const BAR_FILL_STYLE: CSSProperties = { left: BAR_FILL.insetX, top: BAR_FILL.insetY, backgroundSize: '100% 100%' };

type Box = { x: number; y: number; width: number; height: number };

function mmss(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function nameOf(netId: number): string {
  return Store.world?.getByNetId(netId)?.objectNameInWorld ?? `#${netId}`;
}

type Nearby = { netId: number; name: string; instrument: string };

function nearbyPerformers(): Nearby[] {
  const world = Store.world;
  const hero = world?.playerEntity;
  if (!world || !hero) return [];
  const out: Nearby[] = [];
  // The band's own list of who performs here: it includes a player drawn
  // under a monster skin, whom the player query does not carry.
  for (const { netId, instrument } of remotePerformers()) {
    const e = world.getByNetId(netId);
    if (!e || e === hero || e.objOutOfScope) continue;
    const dx = Math.abs(e.transform.pos.x - hero.transform.pos.x);
    const dz = Math.abs(e.transform.pos.z - hero.transform.pos.z);
    if (Math.max(dx, dz) > JOIN_RANGE) continue;
    out.push({ netId, name: nameOf(netId), instrument: t(instrumentById(instrument).labelKey) });
  }
  return out;
}

/** A table's dark fill and its frame. */
const Table = ({ box }: { box: Box }) => (
  <>
    <div className="table-fill" style={{ left: box.x, top: box.y, width: box.width, height: box.height }} />
    <MuTableFrame left={box.x} top={box.y} width={box.width} height={box.height} />
  </>
);

/** A table's content area, inset from the frame; every control in here opts out of the drag. */
const Content = ({ box, children }: { box: Box; children: React.ReactNode }) => (
  <div
    className="band-table"
    data-no-drag="true"
    style={{ left: box.x + PAD, top: box.y + PAD, width: box.width - 2 * PAD, height: box.height - 2 * PAD }}
  >
    {children}
  </div>
);

const SongTable = observer(() => {
  const fileInput = useRef<HTMLInputElement>(null);
  const song = Band.song;
  const playing = Band.phase === 'playing';
  const paused = Band.phase === 'paused';
  const member = Band.role === 'member';
  // `int iHP = (currHP * 147) / maxHP` - an integer number of filled pixels.
  const filled =
    song && song.durationMs > 0
      ? Math.max(0, Math.min(BAR_FILL.width, Math.trunc((BAR_FILL.width * Band.positionMs) / song.durationMs)))
      : 0;

  return (
    <Content box={SONG}>
      <div className="band-line">
        <span className="band-file" title={Band.fileName}>
          {song ? Band.fileName : t('instrument.noFile')}
        </span>
        <button type="button" disabled={member} onClick={uiClick(() => fileInput.current?.click())}>
          {t('instrument.load')}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".mid,.midi,audio/midi"
          hidden
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) void loadMidiFile(file);
            e.target.value = '';
          }}
        />
      </div>
      <MuSpriteFrame file={BAR_BACK_SPRITE} width={BAR.width} height={BAR.height} className="band-bar" style={BAR_STYLE}>
        {filled > 0 && (
          <MuSpriteFrame
            file={BAR_FILL_SPRITE}
            width={filled}
            height={BAR_FILL.height}
            className="band-bar-fill"
            style={BAR_FILL_STYLE}
          />
        )}
      </MuSpriteFrame>
      <div className="band-time">{song ? `${mmss(Band.positionMs)} / ${mmss(song.durationMs)}` : '0:00 / 0:00'}</div>
      <div className="band-line band-transport">
        <button
          type="button"
          disabled={!song || member || playing || Band.bankLoading}
          onClick={uiClick(() => void playSong())}
        >
          {t('instrument.play')}
        </button>
        <button type="button" disabled={!playing} onClick={uiClick(pauseSong)}>
          {t('instrument.pause')}
        </button>
        <button type="button" disabled={!playing && !paused} onClick={uiClick(stopPlaying)}>
          {t('instrument.stop')}
        </button>
        <button type="button" className={Band.loop ? 'on' : undefined} onClick={uiClick(() => setLoop(!Band.loop))}>
          {t('instrument.loop')}
        </button>
      </div>
    </Content>
  );
});

const ChannelsTable = observer(({ percussion }: { percussion: boolean }) => {
  const song = Band.song;
  const rows = song ? song.channels.map((c, i) => ({ ...c, index: i })).filter(c => c.used) : [];

  return (
    <Content box={CHANNELS}>
      <div className="band-head">{t('instrument.channels')}</div>
      <div className="band-list">
        {rows.length === 0 && <div className="band-empty">{t('instrument.noFile')}</div>}
        {rows.map(c => {
          const silent = c.index === PERCUSSION_CHANNEL && !percussion;
          return (
            <div key={c.index} className={`band-channel${silent ? ' silent' : ''}`} title={c.name}>
              <span className="band-ch">{c.index + 1}</span>
              <span className="band-name">{c.name}</span>
              <span className="band-notes">{c.noteCount}</span>
            </div>
          );
        })}
      </div>
    </Content>
  );
});

/**
 * The band: as a member, the master and the way out; as a master, who
 * doubles the song; otherwise the performers close enough to join. A band
 * doubles its master's song, every channel, on each member's instrument.
 */
const BandTable = observer(() => {
  const band = Band.band;
  const busy = Band.phase === 'playing' || Band.phase === 'paused';
  const nearby = Band.role === 'solo' ? nearbyPerformers() : [];

  return (
    <Content box={BAND}>
      <div className="band-head">{t('instrument.band')}</div>
      <div className="band-list">
        {Band.role === 'member' && band ? (
          <div className="band-line">
            <span className="band-name">{nameOf(band.masterId)}</span>
            <button type="button" onClick={uiClick(leaveBand)}>
              {t('instrument.leave')}
            </button>
          </div>
        ) : Band.role === 'master' && band ? (
          band.members.map(m => (
            <div key={m.netId} className="band-line">
              <span className="band-name">{nameOf(m.netId)}</span>
              <span className="band-notes">{t(instrumentById(m.instrument).labelKey)}</span>
            </div>
          ))
        ) : nearby.length === 0 ? (
          <div className="band-empty">{t('instrument.none')}</div>
        ) : (
          <>
            <div className="band-sub">{t('instrument.nearby')}</div>
            {nearby.map(p => (
              <div key={p.netId} className="band-line">
                <span className="band-name">{`${p.name} - ${p.instrument}`}</span>
                <button type="button" disabled={busy} onClick={uiClick(() => joinBand(p.netId))}>
                  {t('instrument.join')}
                </button>
              </div>
            ))}
          </>
        )}
      </div>
    </Content>
  );
});

export const InstrumentWindow = observer(() => {
  const close = () => toggleInstrumentWindow(false);

  if (!Band.windowOpen || !Band.instrument) return null;

  const def = instrumentById(Band.instrument);
  const status = Band.bankLoading
    ? t('instrument.loading')
    : Band.error
      ? t(Band.error)
      : !Band.available && !Store.isOffline
        ? t('instrument.unavailable')
        : '';

  return (
    <MuItemWindow id={WINDOW_ID} className="instrument-window" column={1} label={t('instrument.title')} onClose={close}>
      <div className="band-title" style={{ top: TITLE_Y }}>
        {`${t('instrument.title')} - ${t(def.labelKey)}`}
      </div>
      <div className="head-close" data-no-drag="true" style={HEAD_CLOSE} onClick={close} />

      <Table box={SONG} />
      <Table box={CHANNELS} />
      <Table box={BAND} />
      <SongTable />
      <ChannelsTable percussion={def.percussion === true} />
      <BandTable />

      {status && (
        <div className={`band-status${Band.error && !Band.bankLoading ? ' error' : ''}`} style={{ top: STATUS_Y }}>
          {status}
        </div>
      )}

      <div data-no-drag="true" style={{ position: 'absolute', left: EXIT_BUTTON.x, top: EXIT_BUTTON.y }}>
        <MuButton
          file={EXIT_SPRITE}
          width={EXIT_BUTTON.width}
          height={EXIT_BUTTON.height}
          frames={{ up: 0, down: 1 }}
          onClick={close}
        />
      </div>
      <div className="band-put-away" data-no-drag="true" style={PUT_AWAY}>
        <button type="button" onClick={uiClick(putAwayInstrument)}>
          {t('instrument.putAway')}
        </button>
      </div>
    </MuItemWindow>
  );
});
