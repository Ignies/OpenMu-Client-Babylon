import { observer } from 'mobx-react-lite';
import { t, type TextKey } from '../../../i18n';
import { AdminFeed } from '../../../admin/feed';
import type { TrackedPlayer } from '../../../common/adminProtocol';

/** Pieces more than one tab uses. */

const HERO_STATE: Record<number, TextKey> = {
  0: 'gm.heroState.new',
  1: 'gm.heroState.hero',
  2: 'gm.heroState.hero',
  3: 'gm.heroState.normal',
  4: 'gm.heroState.outlaw',
  5: 'gm.heroState.murderer',
  6: 'gm.heroState.murderer',
};

export function heroStateLabel(state: number): string {
  return HERO_STATE[state] ? t(HERO_STATE[state]) : String(state);
}

/** "3m", "1h 12m", "2d 4h": how long a socket has been on. */
export function sinceText(since: number): string {
  const seconds = Math.max(0, Math.floor((Date.now() - since) / 1000));
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

/** "14:05:33" in the reader's clock. */
export function clockText(at: number): string {
  return new Date(at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function playerMatches(player: TrackedPlayer, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return (
    (player.character ?? '').toLowerCase().includes(needle) ||
    (player.account ?? '').toLowerCase().includes(needle) ||
    (player.guild ?? '').toLowerCase().includes(needle)
  );
}

/** Why the tabs that need the stream are empty, when they are. */
export const FeedNotice = observer(() => {
  switch (AdminFeed.status) {
    case 'open':
    case 'idle':
      return null;
    case 'connecting':
      return <p className="gm-notice">{t('gm.feed.connecting')}</p>;
    case 'refused':
      return (
        <p className="gm-notice is-bad">
          {AdminFeed.reason === 'not-gm'
            ? t('gm.feed.refusedGm')
            : AdminFeed.reason === 'origin'
              ? t('gm.feed.refusedOrigin')
              : t('gm.feed.refusedSession')}
        </p>
      );
    case 'closed':
      return <p className="gm-notice">{t('gm.feed.closed')}</p>;
    case 'error':
      return <p className="gm-notice is-bad">{t('gm.feed.offline')}</p>;
  }
});
