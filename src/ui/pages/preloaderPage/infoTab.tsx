import { observer } from 'mobx-react-lite';
import { MuText } from '../../components/muText';
import { TEXT_COLOR } from '../serversPage/layout';
import { t } from '../../../i18n';
import {
  displayAddress,
  effective,
  playableHere,
  ServerConfig,
  type ServerProfile,
} from '../../../common/serverConfig';
import { ServerAccounts } from '../../../common/serverAccounts';
import { ServerProbe } from '../../../common/serverProbe';
import { versionTags } from '../../../version';
import { CardArt, CardStone, REACH_TEXT } from './worldsTab';
import {
  CONTENT_WIDTH,
  CONTENT_X,
  INFO_ART_HEIGHT,
  INFO_ART_WIDTH,
  INFO_FACTS_X,
  INFO_FACT_STEP,
  INFO_SERVER_ROWS,
  INFO_SERVER_STEP,
  infoMetrics,
} from './layout';

/**
 * What the chosen world says about itself, before a single packet is sent.
 *
 * The published list carries more than a card has room for - the world's own
 * blurb, the client it wants, the domain everything else about it hangs off,
 * and the names it gave its game servers and their channels. That last part
 * exists nowhere else: the connect server's `ServerListResponse` is ids and
 * load percentages with no text in it at all, so without this tab a player
 * cannot know what they are about to pick until they are already connected.
 *
 * The account line is here for the same reason. One client plays every world,
 * so "do I have a character over there" is a question about this world and not
 * about the client, and it is the question that decides whether Enter leads to
 * a login or to a signup.
 */

const FACT_WIDTH = CONTENT_WIDTH - INFO_ART_WIDTH - 4;

const Fact = ({
  label,
  value,
  top,
  color = TEXT_COLOR.brightGray,
  face,
}: {
  label?: string;
  value: string;
  top: number;
  color?: string;
  face?: 'fix';
}) => (
  // The column is 193 wide and a proxy URL is not, so the value is clipped and
  // the whole of it hangs off the row as a tooltip.
  <div
    className="info-fact"
    style={{ left: INFO_FACTS_X, top, width: FACT_WIDTH }}
    title={label ? `${label}: ${value}` : value}
  >
    {label && <span className="info-fact-label">{label}</span>}
    <MuText face={face} color={color} className="info-fact-value" text={value} />
  </div>
);

/** `Valhalla - Peaceful, Hard`, or the numbered default for an unnamed group. */
function serverLine(server: { id: number; name: string; channels: { name: string }[] }) {
  const name = server.name || t('servers.serverName', { number: server.id });
  const channels = server.channels.map(c => c.name).join(', ');

  return channels ? `${name} - ${channels}` : name;
}

export const InfoTab = observer(({ world }: { world: ServerProfile }) => {
  const metrics = infoMetrics();
  const live = effective(world);
  const account = ServerAccounts.of(world.id);
  const reach = ServerProbe.of(world.id);
  const playable = playableHere(world);
  const servers = world.servers ?? [];
  // The overflow line costs a row of its own, so it only ever replaces the
  // last world that would have fitted rather than being squeezed in after it.
  const shown =
    servers.length > INFO_SERVER_ROWS
      ? servers.slice(0, INFO_SERVER_ROWS - 1)
      : servers;
  const hidden = servers.length - shown.length;

  const facts: { label?: string; value: string; color?: string; face?: 'fix' }[] = [
    {
      value: world.name.trim() || t('server.unnamed'),
      color: TEXT_COLOR.brightYellow,
    },
    {
      label: t('info.client'),
      value: playable
        ? world.version || t('info.anyClient')
        : t('worlds.needsClient', {
            world: world.version ?? '',
            client: versionTags().join(', '),
          }),
      color: playable ? TEXT_COLOR.brightGray : '#ff6a6a',
    },
    {
      label: t('info.address'),
      value: displayAddress(world),
      face: 'fix',
    },
    {
      label: t('info.route'),
      value: `${live.wsUrl} → ${live.csHost}:${live.csPort}`,
      face: 'fix',
    },
    {
      label: t('info.status'),
      value: reach === 'unknown' ? t('info.notChecked') : t(REACH_TEXT[reach]),
      color:
        reach === 'up'
          ? '#8ad48a'
          : reach === 'down'
            ? '#ff6a6a'
            : TEXT_COLOR.brightGray,
    },
    {
      label: t('info.account'),
      value: account.username || t('info.noAccount'),
      color: account.username ? TEXT_COLOR.brightYellow : TEXT_COLOR.brightGray,
    },
    {
      label: t('info.lastLogin'),
      value: account.lastLoginAt
        ? new Date(account.lastLoginAt).toLocaleDateString()
        : world.id === ServerConfig.lastPlayedId
          ? t('worlds.lastPlayed')
          : t('info.never'),
    },
  ];

  return (
    <>
      <div
        className="info-art"
        style={{ left: CONTENT_X, top: metrics.factsTop - 2 }}
      >
        {world.image ? (
          <CardArt
            key={world.image}
            src={world.image}
            width={INFO_ART_WIDTH}
            height={INFO_ART_HEIGHT}
          />
        ) : (
          <CardStone width={INFO_ART_WIDTH} height={INFO_ART_HEIGHT} />
        )}
      </div>

      {facts.map((fact, i) => (
        <Fact
          key={fact.label ?? 'name'}
          {...fact}
          top={metrics.factsTop + INFO_FACT_STEP * i}
        />
      ))}

      {/* The world's own blurb, under both columns and given two lines: it is
          the one field on this tab written for a player to read rather than
          for the client to dial. */}
      <div
        className="info-desc"
        style={{ left: CONTENT_X, top: metrics.descY, width: CONTENT_WIDTH }}
      >
        {world.description || t('info.noDescription')}
      </div>

      <span
        className="setup-label"
        style={{ left: CONTENT_X, top: metrics.serversLabelY }}
      >
        {t('info.gameServers')}
      </span>

      {servers.length ? (
        <>
          {shown.map((server, i) => (
            <div
              key={server.id}
              className="info-server"
              style={{
                left: CONTENT_X,
                top: metrics.serversTop + INFO_SERVER_STEP * i,
                width: CONTENT_WIDTH,
              }}
            >
              {serverLine(server)}
            </div>
          ))}
          {hidden > 0 && (
            <div
              className="info-server info-server-more"
              style={{
                left: CONTENT_X,
                top: metrics.serversTop + INFO_SERVER_STEP * shown.length,
                width: CONTENT_WIDTH,
              }}
            >
              {t('info.moreServers', { count: hidden })}
            </div>
          )}
        </>
      ) : (
        <div
          className="info-server info-server-more"
          style={{
            left: CONTENT_X,
            top: metrics.serversTop,
            width: CONTENT_WIDTH,
          }}
        >
          {t('info.noGameServers')}
        </div>
      )}
    </>
  );
});
