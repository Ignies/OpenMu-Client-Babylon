import { t } from '../../../i18n';
import './style.less';
import { useMemo, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Store } from '../../../store';
import { ConnectionInfoRequestPacket } from '../../../common/packets/ConnectServerPackets';
import { MuButton } from '../../components/muButton';
import { MuSpriteFrame } from '../../components/muSprite';
import { ServerItem } from './ServerItem';
import { DescriptionBar } from './DescriptionBar';
import {
  CENTER_GROUP_X,
  CENTER_GROUP_Y,
  DECO,
  GROUP_BASE_Y,
  GROUP_BTN_HEIGHT,
  GROUP_BTN_WIDTH,
  LEFT_GROUP_MAX,
  LEFT_GROUP_X,
  RIGHT_GROUP_MAX,
  RIGHT_GROUP_X,
  SERVER_BTN_HEIGHT,
  SERVER_BTN_X,
  SERVER_MAX,
  SPRITE,
  TEXT_COLOR,
  WIN_HEIGHT,
  WIN_WIDTH,
  serverListTop,
} from './layout';

type Server = { ServerId: number; LoadPercentage: number };

type ServerGroup = {
  id: number;
  name: string;
  servers: Server[];
};

function groupServers(servers: Server[]): ServerGroup[] {
  const byGroup = new Map<number, Server[]>();

  for (const server of servers) {
    const groupId = server.ServerId >> 8;
    const existing = byGroup.get(groupId);

    if (existing) existing.push(server);
    else byGroup.set(groupId, [server]);
  }

  return [...byGroup.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([id, list]) => ({
      id,
      name: `Server ${id + 1}`,
      servers: list.sort((a, b) => a.ServerId - b.ServerId),
    }));
}

export const ServersPage = observer(() => {
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);

  const groups = useMemo(
    () => groupServers(Store.serverList),
    [Store.serverList]
  );

  const activeGroup =
    groups.find(g => g.id === selectedGroup) ?? (groups.length ? groups[0] : null);

  const onConnectClick = async (serverId: number) => {
    // `SetSelectServer`: what the login window prints under its title.
    const group = groups.find(g => g.servers.some(s => s.ServerId === serverId));
    Store.selectedServer = {
      name: group?.name ?? `Server ${(serverId >> 8) + 1}`,
      channel: (group?.servers.findIndex(s => s.ServerId === serverId) ?? 0) + 1,
    };
    const packet = ConnectionInfoRequestPacket.createPacket();
    packet.ServerId = serverId;

    Store.sendToCS(packet.buffer);
  };

const leftGroups = groups.slice(0, LEFT_GROUP_MAX);
  const rightGroups = groups.slice(
    LEFT_GROUP_MAX,
    LEFT_GROUP_MAX + RIGHT_GROUP_MAX
  );

  const listTop = serverListTop(activeGroup?.servers.length ?? 0);

  const renderGroup = (group: ServerGroup, x: number, index: number) => (
    <MuButton
      key={group.id}
      file={SPRITE.groupButton}
      width={GROUP_BTN_WIDTH}
      height={GROUP_BTN_HEIGHT}
      frames={{ up: 0, active: 1, down: 2, check: 3 }}
      color={TEXT_COLOR.brightGray}
      activeColor={TEXT_COLOR.white}
      checked={activeGroup?.id === group.id}
      label={group.name}
      onClick={() => setSelectedGroup(group.id)}
      style={{
        position: 'absolute',
        left: x,
        top: GROUP_BASE_Y + GROUP_BTN_HEIGHT * index,
      }}
      labelStyle={{
        fontSize: 11,
        textShadow: '1px 1px 0 rgba(0, 0, 0, 0.85)',
      }}
    />
  );

  const selectedIndex = activeGroup
    ? groups.findIndex(g => g.id === activeGroup.id)
    : -1;

  const arrow =
    selectedIndex < 0
      ? null
      : selectedIndex < LEFT_GROUP_MAX
        ? {
            rect: DECO.arrowLeft,
            left: LEFT_GROUP_X + GROUP_BTN_WIDTH,
            top: GROUP_BASE_Y + GROUP_BTN_HEIGHT * selectedIndex,
          }
        : {
            rect: DECO.arrowRight,
            left: RIGHT_GROUP_X - DECO.arrowRight.width,
            top:
              GROUP_BASE_Y +
              GROUP_BTN_HEIGHT * (selectedIndex - LEFT_GROUP_MAX),
          };

  return (
    <div className="servers-page">
      <div className="server-sel-win" style={{ width: WIN_WIDTH, height: WIN_HEIGHT }}>
        {Store.connectionLost && (
          <div className="servers-notice">{t('servers.connectionLost')}</div>
        )}
        {groups.length === 0 ? (
          <div className="servers-loading">{t('servers.loading')}</div>
        ) : (
          <>
            {}
            {leftGroups.length > 0 && (
              <MuSpriteFrame
                file={SPRITE.deco}
                {...DECO.left}
                style={{
                  position: 'absolute',
                  left: LEFT_GROUP_X,
                  top: GROUP_BASE_Y,
                  pointerEvents: 'none',
                }}
              />
            )}
            {rightGroups.length > 0 && (
              <MuSpriteFrame
                file={SPRITE.deco}
                {...DECO.right}
                style={{
                  position: 'absolute',
                  left: RIGHT_GROUP_X + GROUP_BTN_WIDTH - DECO.right.width,
                  top: GROUP_BASE_Y,
                  pointerEvents: 'none',
                }}
              />
            )}

            {leftGroups.map((group, i) => renderGroup(group, LEFT_GROUP_X, i))}
            {rightGroups.map((group, i) =>
              renderGroup(group, RIGHT_GROUP_X, i)
            )}

            {arrow && (
              <MuSpriteFrame
                file={SPRITE.deco}
                {...arrow.rect}
                style={{
                  position: 'absolute',
                  left: arrow.left,
                  top: arrow.top,
                  pointerEvents: 'none',
                }}
              />
            )}

            <div
              style={{
                position: 'absolute',
                left: SERVER_BTN_X,
                top: listTop,
                width: 0,
                height: 0,
              }}
            >
              {activeGroup?.servers.slice(0, SERVER_MAX).map((server, i) => (
                <ServerItem
                  key={server.ServerId}
                  name={`Server ${(server.ServerId & 0xff) + 1}`}
                  load={server.LoadPercentage}
                  top={SERVER_BTN_HEIGHT * i}
                  onClick={() => onConnectClick(server.ServerId)}
                />
              ))}
            </div>

            <DescriptionBar
              text={
                activeGroup
                  ? `${activeGroup.name} - ${activeGroup.servers.length} channel${
                      activeGroup.servers.length === 1 ? '' : 's'
                    }`
                  : undefined
              }
            />
          </>
        )}
      </div>
    </div>
  );
});

export const TEST_SERVER_SLOT = { x: CENTER_GROUP_X, y: CENTER_GROUP_Y };
