import './style.less';
import { useRef } from 'react';
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
import { MuText } from '../../../../components/muText';
import { useWindowChrome } from '../../../../components/muWindow/useWindowChrome';

/**
 * The Instrument window: what the player does with the instrument in hand.
 * A file to load, play / pause / stop / loop, the song's channels and who
 * voices them, the band around them, and the way to put the instrument away.
 * Opens when an instrument is taken out; Escape and the bar close it, the
 * instrument stays out.
 *
 * Panel chrome like the move-command window: a black plate, the window
 * stack's drag and scale.
 */

const WINDOW_ID = 'instrument-window';
const WIDTH = 300;
const HEIGHT = 440;

/** Tiles within which another performer can be joined. */
const JOIN_RANGE = 10;

const TITLE_COLOR = '#ffcc1a';

function mmss(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
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
    out.push({
      netId,
      name: e.objectNameInWorld ?? `#${netId}`,
      instrument: t(instrumentById(instrument).labelKey),
    });
  }
  return out;
}

export const InstrumentWindow = observer(() => {
  const fileInput = useRef<HTMLInputElement>(null);

  const chrome = useWindowChrome(WINDOW_ID, {
    width: WIDTH,
    height: HEIGHT,
    onClose: () => toggleInstrumentWindow(false),
  });

  if (!Band.windowOpen || !Band.instrument) return null;

  const def = instrumentById(Band.instrument);
  const song = Band.song;
  const playing = Band.phase === 'playing';
  const paused = Band.phase === 'paused';
  const member = Band.role === 'member';
  const band = Band.band;
  const nearby = member ? [] : nearbyPerformers();

  // The song is the hero's own (a member loads none), so every channel of
  // it is theirs; a band doubles it, it takes nothing away.
  const ownerName = (): string => t('instrument.you');

  const channels = song
    ? song.channels
        .map((c, i) => ({ ...c, index: i }))
        .filter(c => c.used)
    : [];

  const onFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (file) await loadMidiFile(file);
  };

  return (
    <div
      ref={chrome.ref as React.Ref<HTMLDivElement>}
      role="dialog"
      aria-label={t('instrument.title')}
      tabIndex={-1}
      className="instrument-window"
      onPointerDown={chrome.onPointerDown}
      style={{
        width: WIDTH,
        height: HEIGHT,
        ...chrome.style,
        transform: `scale(${chrome.scale})`,
        transformOrigin: '0 0',
      }}
    >
      <MuText
        face="bold"
        className="band-title"
        color={TITLE_COLOR}
        style={{ left: WIDTH / 2, top: 6 }}
        text={`${t('instrument.title')} - ${t(def.labelKey)}`}
      />

      {/* The chrome drags (and captures the pointer) on any press outside
          `data-no-drag`, which would swallow every click in here; the title
          strip above stays the handle. */}
      <div className="band-body" data-no-drag="true">
        <div className="band-row">
          <button
            type="button"
            className="band-btn"
            onClick={() => fileInput.current?.click()}
            disabled={member}
          >
            {t('instrument.load')}
          </button>
          <span className="band-file" title={Band.fileName}>
            {song ? `${Band.fileName}  ${mmss(song.durationMs)}` : t('instrument.noFile')}
          </span>
          <input
            ref={fileInput}
            type="file"
            accept=".mid,.midi,audio/midi"
            hidden
            onChange={e => {
              void onFile(e.target.files);
              e.target.value = '';
            }}
          />
        </div>

        <div className="band-row band-transport">
          <button
            type="button"
            className="band-btn"
            disabled={!song || member || playing || Band.bankLoading}
            onClick={() => void playSong()}
          >
            {t('instrument.play')}
          </button>
          <button type="button" className="band-btn" disabled={!playing} onClick={pauseSong}>
            {t('instrument.pause')}
          </button>
          <button type="button" className="band-btn" disabled={!playing && !paused} onClick={stopPlaying}>
            {t('instrument.stop')}
          </button>
          <label className="band-check">
            <input type="checkbox" checked={Band.loop} onChange={e => setLoop(e.target.checked)} />
            {t('instrument.loop')}
          </label>
        </div>

        <div className="band-progress">
          <div
            className="band-progress-fill"
            style={{ width: song && song.durationMs > 0 ? `${(100 * Band.positionMs) / song.durationMs}%` : 0 }}
          />
          <span>{song ? `${mmss(Band.positionMs)} / ${mmss(song.durationMs)}` : ''}</span>
        </div>

        {Band.bankLoading && <div className="band-note">{t('instrument.loading')}</div>}
        {Band.error && <div className="band-error">{t(Band.error)}</div>}

        <div className="band-section">{t('instrument.channels')}</div>
        <div className="band-channels">
          {channels.length === 0 && <div className="band-note">{t('instrument.noFile')}</div>}
          {channels.map(c => {
            const silent = c.index === PERCUSSION_CHANNEL && !def.percussion;
            return (
              <div key={c.index} className={`band-channel${silent ? ' silent' : ''}`}>
                <span className="band-ch">{c.index + 1}</span>
                <span className="band-name" title={c.name}>
                  {c.name}
                </span>
                <span className="band-notes">{c.noteCount}</span>
                <span className="band-owner">{silent ? '-' : ownerName()}</span>
              </div>
            );
          })}
        </div>

        <div className="band-section">{t('instrument.band')}</div>
        <div className="band-box">
          {member && band ? (
            <>
              <div className="band-note">
                {Store.world?.getByNetId(band.masterId)?.objectNameInWorld ?? `#${band.masterId}`}
              </div>
              <button type="button" className="band-btn" onClick={leaveBand}>
                {t('instrument.leave')}
              </button>
            </>
          ) : Band.role === 'master' && band ? (
            band.members.map(m => (
              <div key={m.netId} className="band-note">
                {Store.world?.getByNetId(m.netId)?.objectNameInWorld ?? `#${m.netId}`} -{' '}
                {t(instrumentById(m.instrument).labelKey)}
              </div>
            ))
          ) : nearby.length === 0 ? (
            <div className="band-note">{t('instrument.none')}</div>
          ) : (
            nearby.map(p => (
              <div key={p.netId} className="band-row">
                <span className="band-name">
                  {p.name} - {p.instrument}
                </span>
                <button
                  type="button"
                  className="band-btn"
                  disabled={playing || paused}
                  onClick={() => {
                    // Double the master's song on this instrument, every channel.
                    joinBand(p.netId);
                  }}
                >
                  {t('instrument.join')}
                </button>
              </div>
            ))
          )}
        </div>

        <div className="band-row band-bottom">
          <button type="button" className="band-btn" onClick={putAwayInstrument}>
            {t('instrument.putAway')}
          </button>
          {!Band.available && !Store.isOffline && (
            <span className="band-note">{t('instrument.unavailable')}</span>
          )}
        </div>
      </div>

      <div className="band-close" data-no-drag="true" onClick={() => toggleInstrumentWindow(false)} />
    </div>
  );
});

