import { isKey } from '../../../../../common/keyBindings';
import { t, type TextKey } from '../../../../../i18n';
import './style.less';
import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { runInAction } from 'mobx';
import { Store } from '../../../../../store';
import {
  GUILD_SECURITY_CODE_MAX,
  Social,
  type GuildTab,
} from '../../../../../social';
import { useEventBus } from '../../../../../hooks/useEventBus';
import { playUiSound, uiClick } from '../../../../../libs/sfx';
import { MuButton } from '../../../../components/muButton';
import { MuSpriteFrame } from '../../../../components/muSprite';
import { MuItemWindow, MuTableFrame } from '../../../../components/muWindow';
import { GuildMemberRoleEnum } from '../../../../../common/packets/ServerToClientPackets';
import { GuildRelationshipTypeEnum } from '../../../../../common/packets/ClientToServerPackets';
import {
  GUILD_MARK_PALETTE,
  GUILD_MARK_SIZE,
  guildMarkDataUrl,
  packGuildMark,
} from '../../../../../common/guildMark';
import { TEXT_COLOR } from '../../../../pages/serversPage/layout';
import {
  BACK_SPRITE,
  BTN_BOTH_CANCEL_X,
  BTN_BOTH_OK_X,
  BTN_HEIGHT,
  BTN_WIDTH,
  BTN_Y,
  CANCEL_SPRITE,
  OK_SPRITE,
  WIN_HEIGHT,
  WIN_WIDTH,
} from '../../../../components/msgWindow/layout';
import { useNearbyPlayers } from '../nearbyPlayers';

/**
 * `CNewUIGuildInfoWindow` (Guild/NewUIGuildInfoWindow.cpp) - the three tabs
 * of the guild window on the original's art and coordinates
 * (`GuildConstants::UILayout`):
 *
 * - **Guild** (`GuildTab::INFO`): the mark, the creation date, the score, the
 *   member count, the hostile guild and the announcement box, with the
 *   Disband / Leave button.
 * - **Members** (`GuildTab::MEMBERS`): name / position / server, with the
 *   master's Position, Dissolve and Release buttons - `SendGuildRoleAssign`
 *   and `SendGuildKickPlayer`.
 * - **Alliance** (`GuildTab::UNION`): the guilds in the alliance, with the
 *   alliance and hostility offers a master can send to another master
 *   standing next to the hero (`SendGuildRelationShipChange`) and the two
 *   dissolve buttons.
 *
 * Plus the two guild-master NPC dialogs: ShowGuildMasterDialog ("found a
 * guild?") and ShowGuildCreationDialog (name + 8x8 emblem, `CreateGuildMark`'s
 * 16-colour palette).
 */

const WINDOW_ID = 'guild-window';
const HOT_KEY = 'guild';

const TITLE_Y = 12;
/** The X in the frame art. `left`/`top`, not `x`/`y`: those are not CSS on a div. */
const HEAD_CLOSE = { left: 169, top: 7, width: 13, height: 12 };
/** `Render_Text`: the guild name and score, centred over 120px at y 48. */
const NAME_LINE = { x: 35, y: 48, width: 120 };
// GuildConstants::UILayout.
const TAB = { x: 12, y: 68, width: 166, height: 22 };
const TAB_WIDTH = 56;
const TAB_LABEL_Y = 76;
/** `Render_Guild_History`: the 49x49 frame the 39x39 mark sits inside. */
const MARK_BOX = { x: 70, y: 104, width: 49, height: 48 };
const MARK_PX = 39;
/** The stats box under the mark, and the announcement box under that. */
const STATS_BOX = { x: 10, y: 159, width: 171, height: 70 };
const NOTICE_BOX = { x: 10, y: 260, width: 171, height: 88 };
const NOTICE_TAB = { x: 11, y: 237, width: 63, height: 25 };
const STATS_X = 22;
const STATS_Y = 169;
const STATS_STEP = 13;
const MEMBER_HEAD_Y = 112;
const MEMBER_BOX = { x: 13, y: 123, width: 160, height: 225 };
const UNION_HEAD_Y = 115;
const UNION_BOX = { x: 13, y: 126, width: 160, height: 90 };
const NEARBY_BOX = { x: 13, y: 262, width: 160, height: 86 };
const BUTTON = { width: 64, height: 29 };
const BUTTON_ROW_Y = 360;
const UNION_BUTTON_Y = 230;
const EXIT_BUTTON = { x: 13, y: 392, width: 36, height: 29 };

const EXIT_SPRITE = 'newui_exit_00.OZT';
const BUTTON_SPRITE = 'newui_btn_empty_small.OZT';
const TAB_STRIP_SPRITE = 'newui_guild_tab01.OZT';
const TAB_ON_SPRITE = 'newui_guild_tab02.OZT';
const TAB_HEAD_SPRITE = 'newui_guild_tab03.OZT';

/** GlobalText 1300 / 1301 / 1302 / 1330. */
const ROLE_LABEL_KEYS: Record<number, TextKey> = {
  [GuildMemberRoleEnum.GuildMaster]: 'guild.role.master',
  [GuildMemberRoleEnum.AssistantMaster]: 'guild.role.assistant',
  [GuildMemberRoleEnum.BattleMaster]: 'guild.role.battleMaster',
  [GuildMemberRoleEnum.NormalMember]: 'guild.role.member',
};

/** GlobalText 180 / 1330 / 1352. */
const TABS: { key: GuildTab; labelKey: TextKey }[] = [
  { key: 'info', labelKey: 'guild.tab.info' },
  { key: 'members', labelKey: 'guild.tab.members' },
  { key: 'alliance', labelKey: 'guild.tab.alliance' },
];

const frameOf = (r: { x: number; y: number; width: number; height: number }) => (
  <>
    <div
      className="table-fill"
      style={{ left: r.x, top: r.y, width: r.width, height: r.height }}
    />
    <MuTableFrame left={r.x} top={r.y} width={r.width} height={r.height} />
  </>
);

const GuildButton = ({
  x,
  y,
  label,
  disabled,
  title,
  onClick,
}: {
  x: number;
  y: number;
  label: string;
  disabled?: boolean;
  title?: string;
  onClick: () => void;
}) => (
  <div
    data-no-drag="true"
    title={title}
    style={{ position: 'absolute', left: x, top: y }}
  >
    <MuButton
      file={BUTTON_SPRITE}
      width={BUTTON.width}
      height={BUTTON.height}
      frames={{ up: 0, active: 1, down: 2 }}
      color={TEXT_COLOR.brightGray}
      activeColor={TEXT_COLOR.white}
      label={label}
      disabled={disabled}
      onClick={onClick}
      labelStyle={{ fontSize: 10 }}
    />
  </div>
);

const TabStrip = observer(() => (
  <>
    <MuSpriteFrame
      file={TAB_STRIP_SPRITE}
      width={TAB.width}
      height={TAB.height}
      className="guild-tab-strip"
      style={{ left: TAB.x, top: TAB.y, backgroundSize: '100% 100%' }}
    />
    {TABS.map((tab, i) => (
      <div
        key={tab.key}
        className={`guild-tab${Social.guildTab === tab.key ? ' active' : ''}`}
        data-no-drag="true"
        style={{
          left: TAB.x + i * TAB_WIDTH,
          top: TAB.y,
          width: TAB_WIDTH,
          height: TAB.height,
        }}
        onClick={uiClick(() => selectTab(tab.key))}
      >
        {Social.guildTab === tab.key && (
          <MuSpriteFrame
            file={TAB_ON_SPRITE}
            width={TAB_WIDTH}
            height={TAB.height}
            style={{ position: 'absolute', left: 0, top: 0, backgroundSize: '100% 100%' }}
          />
        )}
        <span style={{ top: TAB_LABEL_Y - TAB.y - 8 }}>{t(tab.labelKey)}</span>
      </div>
    ))}
  </>
));

function selectTab(tab: GuildTab): void {
  runInAction(() => {
    Social.guildTab = tab;
  });
  if (tab === 'members') Social.requestGuildList();
  if (tab === 'alliance') Social.requestAllianceList();
}

/** `Render_Guild_History` + the stats block of `Render_Text`. */
const InfoTab = observer(() => {
  const mine = Social.myGuild!;
  const guild = Store.guilds.get(mine.id);
  const logo = guild?.logo ?? [];
  const war = Social.guildWar;

  const lines = [
    // GlobalText 1332 has no value in OpenMU's GuildList, so it prints the
    // guild name instead of a date we were never sent.
    t('guild.stat.guild', { name: guild?.name ?? '...' }),
    t('guild.stat.score', { score: Social.guildTotalScore }),
    Social.isGuildMaster
      ? t('guild.stat.membersMaster', {
          count: Social.guildMembers.length,
          max: Store.playerData.level
            ? Math.min(80, Math.trunc(Store.playerData.level / 10))
            : 0,
        })
      : t('guild.stat.members', { count: Social.guildMembers.length }),
    t('guild.hostility', { name: Social.guildRivalName || t('common.none') }),
  ];

  return (
    <>
      {frameOf(MARK_BOX)}
      {logo.length > 0 && (
        <img
          className="guild-mark"
          src={guildMarkDataUrl(logo)}
          width={MARK_PX}
          height={MARK_PX}
          alt=""
          style={{ left: MARK_BOX.x + 4, top: MARK_BOX.y + 2, width: MARK_PX, height: MARK_PX }}
        />
      )}

      {frameOf(STATS_BOX)}
      {lines.map((line, i) => (
        <div
          key={i}
          className="guild-stat"
          style={{ left: STATS_X, top: STATS_Y + i * STATS_STEP }}
        >
          {line}
        </div>
      ))}

      {/* GlobalText 1323 on the `newui_guild_tab03` head. */}
      <MuSpriteFrame
        file={TAB_HEAD_SPRITE}
        width={NOTICE_TAB.width}
        height={NOTICE_TAB.height}
        className="guild-notice-head"
        style={{ left: NOTICE_TAB.x, top: NOTICE_TAB.y, backgroundSize: '100% 100%' }}
      >
        <span>{t('guild.notice')}</span>
      </MuSpriteFrame>
      {frameOf(NOTICE_BOX)}
      <div
        className="guild-notice"
        data-no-drag="true"
        style={{
          left: NOTICE_BOX.x + 6,
          top: NOTICE_BOX.y + 8,
          width: NOTICE_BOX.width - 12,
          height: NOTICE_BOX.height - 16,
        }}
      >
        {war ? (
          <>
            <div className="guild-war">
              {war.soccer ? t('guild.battleSoccer') : t('guild.war')} vs{' '}
              {war.enemyGuild}
            </div>
            <div className="guild-war-score">
              {war.ownScore} : {war.enemyScore}
            </div>
          </>
        ) : (
          <div className="guild-hint">{t('guild.noAnnouncement')}</div>
        )}
      </div>

      <GuildButton
        x={100}
        y={350}
        label={Social.isGuildMaster ? t('guild.disband') : t('guild.leave')}
        onClick={() => Social.promptGuildKick(Store.playerData.name)}
      />
    </>
  );
});

/** `Render_Guild_Enum`: name / position / server, with the master's buttons. */
const MembersTab = observer(() => {
  const master = Social.isGuildMaster;
  const me = Store.playerData.name;
  const [selected, setSelected] = useState('');
  const row = Social.guildMembers.find(m => m.name === selected);
  const canAct = master && !!row && row.name !== me;

  return (
    <>
      <div className="guild-col-head" style={{ left: 24, top: MEMBER_HEAD_Y }}>
        {t('guild.col.name')}
      </div>
      <div className="guild-col-head" style={{ left: 89, top: MEMBER_HEAD_Y }}>
        {t('guild.col.position')}
      </div>
      <div className="guild-col-head" style={{ left: 126, top: MEMBER_HEAD_Y }}>
        {t('guild.col.server')}
      </div>

      {frameOf(MEMBER_BOX)}
      <div
        className="guild-list"
        data-no-drag="true"
        style={{
          left: MEMBER_BOX.x + 8,
          top: MEMBER_BOX.y + 8,
          width: MEMBER_BOX.width - 16,
          height: MEMBER_BOX.height - 16,
        }}
      >
        {Social.guildMembers.map(m => {
          const online = m.server >= 0;
          return (
            <div
              key={m.name}
              className={`guild-row${selected === m.name ? ' selected' : ''}${
                online ? '' : ' offline'
              }`}
              onClick={uiClick(() => setSelected(m.name))}
            >
              <span className={`guild-row-name${m.name === me ? ' me' : ''}`}>
                {m.name}
              </span>
              <span className="guild-row-role">
                {ROLE_LABEL_KEYS[m.role] ? t(ROLE_LABEL_KEYS[m.role]) : ''}
              </span>
              <span className="guild-row-server">{online ? m.server : '-'}</span>
            </div>
          );
        })}
      </div>

      {/* GlobalText 1307 / 1308 / 1309: appoint, demote, kick. */}
      <GuildButton
        x={3}
        y={BUTTON_ROW_Y}
        label={t('guild.position')}
        title={t('guild.appointAssistant')}
        disabled={!canAct}
        onClick={() =>
          Social.guildAssignRole(selected, GuildMemberRoleEnum.AssistantMaster)
        }
      />
      <GuildButton
        x={64}
        y={BUTTON_ROW_Y}
        label={t('guild.dissolve')}
        title={t('guild.cannotAppoint')}
        disabled={!canAct}
        onClick={() =>
          Social.guildAssignRole(selected, GuildMemberRoleEnum.NormalMember)
        }
      />
      <GuildButton
        x={125}
        y={BUTTON_ROW_Y}
        label={t('guild.release')}
        title={t('guild.kick', {
          name: selected || t('guild.selectedMember'),
        })}
        disabled={!canAct}
        onClick={() => Social.promptGuildKick(selected)}
      />
      {master && (
        <GuildButton
          x={3}
          y={BUTTON_ROW_Y - 31}
          label={t('guild.role.battleMaster')}
          title={t('guild.appointBattleMaster')}
          disabled={!canAct}
          onClick={() =>
            Social.guildAssignRole(selected, GuildMemberRoleEnum.BattleMaster)
          }
        />
      )}
    </>
  );
});

/**
 * `Render_Guild_Info` (the union tab). The alliance and hostility offers go to
 * a *player* - the other guild's master - so the masters standing next to the
 * hero are listed under the alliance, the way the party window lists players
 * to invite.
 */
const AllianceTab = observer(() => {
  const master = Social.isGuildMaster;
  const players = useNearbyPlayers();
  const masters = players.filter(
    p => p.guildRole === GuildMemberRoleEnum.GuildMaster && p.guildId !== undefined
  );
  const [selected, setSelected] = useState('');

  return (
    <>
      <div className="guild-col-head" style={{ left: 34, top: UNION_HEAD_Y }}>
        {t('guild.col.nameUpper')}
      </div>
      <div className="guild-col-head" style={{ left: 130, top: UNION_HEAD_Y }}>
        {t('guild.col.members')}
      </div>

      {frameOf(UNION_BOX)}
      <div
        className="guild-list"
        data-no-drag="true"
        style={{
          left: UNION_BOX.x + 8,
          top: UNION_BOX.y + 8,
          width: UNION_BOX.width - 16,
          height: UNION_BOX.height - 16,
        }}
      >
        {Social.allianceGuilds.length === 0 && (
          <div className="guild-hint">{t('guild.noAlliance')}</div>
        )}
        {Social.allianceGuilds.map(g => (
          <div
            key={g.name}
            className={`guild-row${selected === g.name ? ' selected' : ''}`}
            onClick={uiClick(() => setSelected(g.name))}
          >
            {g.logo.length > 0 && (
              <img className="guild-row-mark" src={guildMarkDataUrl(g.logo)} alt="" />
            )}
            <span className="guild-row-name">{g.name}</span>
            <span className="guild-row-server">{g.memberCount}</span>
          </div>
        ))}
      </div>

      {/* GlobalText 1422 / 1324. */}
      <GuildButton
        x={30}
        y={UNION_BUTTON_Y}
        label={t('guild.leave')}
        title={t('guild.allianceLeave')}
        disabled={!master || Social.allianceGuilds.length === 0}
        onClick={() => Social.removeAllianceGuild(selected || Social.allianceGuilds[0]?.name || '')}
      />
      <GuildButton
        x={100}
        y={UNION_BUTTON_Y}
        label={t('guild.disband')}
        title={t('guild.allianceDisband')}
        disabled={!master || !selected}
        onClick={() => Social.removeAllianceGuild(selected)}
      />

      <div className="guild-col-head" style={{ left: 24, top: NEARBY_BOX.y - 11 }}>
        {t('guild.nearbyMasters')}
      </div>
      {frameOf(NEARBY_BOX)}
      <div
        className="guild-list"
        data-no-drag="true"
        style={{
          left: NEARBY_BOX.x + 8,
          top: NEARBY_BOX.y + 8,
          width: NEARBY_BOX.width - 16,
          height: NEARBY_BOX.height - 16,
        }}
      >
        {masters.length === 0 && (
          <div className="guild-hint">{t('guild.nearbyHint')}</div>
        )}
        {masters.map(p => (
          <div key={p.netId} className="guild-row">
            <span className="guild-row-name">{p.name}</span>
            <button
              type="button"
              title={t('guild.alliance')}
              disabled={!master}
              onClick={uiClick(() =>
                Social.guildRelationRequestSend(
                  p,
                  GuildRelationshipTypeEnum.Alliance,
                  true
                )
              )}
            >
              {t('guild.ally')}
            </button>
            <button
              type="button"
              title={t('guild.hostilityShort')}
              disabled={!master}
              onClick={uiClick(() =>
                Social.guildRelationRequestSend(
                  p,
                  GuildRelationshipTypeEnum.Hostility,
                  true
                )
              )}
            >
              {t('guild.rival')}
            </button>
          </div>
        ))}
      </div>
    </>
  );
});

/** `RenderNoneGuild`: GlobalText 185-187, plus the masters we can ask. */
const NoGuild = observer(() => {
  const players = useNearbyPlayers();
  const masters = players.filter(
    p => p.guildRole === GuildMemberRoleEnum.GuildMaster && p.guildId !== undefined
  );

  return (
    <>
      {frameOf(MEMBER_BOX)}
      <div
        className="guild-list"
        data-no-drag="true"
        style={{
          left: MEMBER_BOX.x + 8,
          top: MEMBER_BOX.y + 8,
          width: MEMBER_BOX.width - 16,
          height: MEMBER_BOX.height - 16,
        }}
      >
        <div className="guild-hint">{t('guild.joinHint')}</div>
        {masters.map(p => (
          <div key={p.netId} className="guild-row">
            <span className="guild-row-name">{p.name}</span>
            <span className="guild-row-role">
              {Store.guilds.get(p.guildId!)?.name ?? ''}
            </span>
            <button
              type="button"
              onClick={uiClick(() =>
                Social.guildJoin({ netId: p.netId, name: p.name, role: p.guildRole })
              )}
            >
              {t('guild.join')}
            </button>
          </div>
        ))}
      </div>
    </>
  );
});

export const GuildWindow = observer(() => {
  const toggle = () => {
    runInAction(() => {
      Social.guildWindowEnabled = !Social.guildWindowEnabled;
    });
    if (Social.guildWindowEnabled && Social.myGuild) Social.requestGuildList();
  };
  const close = () =>
    runInAction(() => {
      Social.guildWindowEnabled = false;
    });

  useEventBus('keyPressed', key => {
    if (isKey(HOT_KEY, key) && Store.world?.playerEntity) toggle();
  });

  if (!Social.guildWindowEnabled) return null;

  const mine = Social.myGuild;
  const guild = mine ? Store.guilds.get(mine.id) : undefined;
  const tab = Social.guildTab;

  return (
    <MuItemWindow
      id={WINDOW_ID}
      className="guild-window"
      column={2}
      label={t('guild.title')}
      onClose={close}
    >
      <div className="guild-title" style={{ top: TITLE_Y }}>
        {t('guild.title')}
      </div>
      <div className="head-close" data-no-drag="true" style={HEAD_CLOSE} onClick={close} />

      {mine ? (
        <>
          {/* `%ls ( Score:%d )` in (200, 255, 100). */}
          <div
            className="guild-name-line"
            style={{ left: NAME_LINE.x, top: NAME_LINE.y, width: NAME_LINE.width }}
          >
            {t('guild.nameScore', {
              name: guild?.name ?? '...',
              score: Social.guildTotalScore,
            })}
          </div>
          <TabStrip />
          {tab === 'info' && <InfoTab />}
          {tab === 'members' && <MembersTab />}
          {tab === 'alliance' && <AllianceTab />}
        </>
      ) : (
        <>
          <div
            className="guild-name-line"
            style={{ left: NAME_LINE.x, top: NAME_LINE.y, width: NAME_LINE.width }}
          >
            {t('guild.notInGuild')}
          </div>
          <NoGuild />
        </>
      )}

      <div
        data-no-drag="true"
        style={{ position: 'absolute', left: EXIT_BUTTON.x, top: EXIT_BUTTON.y }}
      >
        <MuButton
          file={EXIT_SPRITE}
          width={EXIT_BUTTON.width}
          height={EXIT_BUTTON.height}
          frames={{ up: 0, down: 1 }}
          onClick={close}
        />
      </div>
    </MuItemWindow>
  );
});

/** ShowGuildMasterDialog: the NPC asks whether the hero wants to found a guild. */
export const GuildMasterDialog = observer(() => {
  const open = Social.guildMasterDialog;

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter') Social.guildMasterAnswer(true);
      else if (e.key === 'Escape') Social.guildMasterAnswer(false);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  if (!open) return null;

  return (
    <div className="guild-dialog-layer">
      <MuSpriteFrame file={BACK_SPRITE} width={WIN_WIDTH} height={WIN_HEIGHT} className="guild-dialog">
        <div className="guild-dialog-text">
          {t('guild.foundQuestion')}
          <br />
          {t('guild.foundCost')}
        </div>
        <MuButton
          file={OK_SPRITE}
          width={BTN_WIDTH}
          height={BTN_HEIGHT}
          frames={{ up: 0, active: 1, down: 2 }}
          color={TEXT_COLOR.brightGray}
          activeColor={TEXT_COLOR.white}
          onClick={() => Social.guildMasterAnswer(true)}
          style={{ position: 'absolute', left: BTN_BOTH_OK_X, top: BTN_Y }}
        />
        <MuButton
          file={CANCEL_SPRITE}
          width={BTN_WIDTH}
          height={BTN_HEIGHT}
          frames={{ up: 0, active: 1, down: 2 }}
          color={TEXT_COLOR.brightGray}
          activeColor={TEXT_COLOR.white}
          onClick={() => Social.guildMasterAnswer(false)}
          style={{ position: 'absolute', left: BTN_BOTH_CANCEL_X, top: BTN_Y }}
        />
      </MuSpriteFrame>
    </div>
  );
});

/**
 * `CGuildBreakPasswordMsgBoxLayout` (NewUICustomMessageBox.cpp:7110): the
 * account's security code, asked before every guild kick - GlobalText 427 and
 * 428 over a masked input, OK / Cancel. OpenMU checks it against
 * `Account.SecurityCode`; without it the server only answers "Wrong Security
 * Code.".
 */
export const GuildKickPasswordDialog = observer(() => {
  const target = Social.guildKickPrompt;
  const [code, setCode] = useState('');

  useEffect(() => {
    if (target) setCode('');
  }, [target]);

  if (!target) return null;

  const send = () => {
    Social.confirmGuildKick(code);
    playUiSound('click');
  };

  return (
    <div className="guild-dialog-layer">
      <div className="guild-create guild-password">
        <div className="guild-create-title">
          {target.self ? t('guild.leaveTitle') : t('guild.kick', { name: target.name })}
        </div>
        <div className="guild-password-text">
          {target.self ? t('guild.breakHint') : t('guild.kickHint', { name: target.name })}
          <br />
          {t('guild.enterSecurityCode')}
        </div>
        <label className="guild-create-name">
          {t('guild.securityCode')}
          <input
            autoFocus
            type="password"
            maxLength={GUILD_SECURITY_CODE_MAX}
            value={code}
            spellCheck={false}
            onChange={e => setCode(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') send();
              else if (e.key === 'Escape') Social.cancelGuildKick();
            }}
          />
        </label>
        <div className="guild-create-buttons">
          <button type="button" onClick={uiClick(send)}>
            {t('common.ok')}
          </button>
          <button type="button" onClick={uiClick(() => Social.cancelGuildKick())}>
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
});

const PIXELS = GUILD_MARK_SIZE * GUILD_MARK_SIZE;
const CELL = 16;

/** ShowGuildCreationDialog: name (8 chars) and the 8x8 emblem editor. */
export const GuildCreationDialog = observer(() => {
  const open = Social.guildCreationDialog;
  const pending = Social.guildCreationPending;
  const [name, setName] = useState('');
  const [pixels, setPixels] = useState<number[]>(() => new Array(PIXELS).fill(0));
  const [color, setColor] = useState(1);

  useEffect(() => {
    if (!open) return;
    setName('');
    setPixels(new Array(PIXELS).fill(0));
    setColor(1);
  }, [open]);

  if (!open) return null;

  const paint = (i: number) =>
    setPixels(prev => {
      const next = prev.slice();
      next[i] = color;
      return next;
    });

  const create = () => {
    if (pending) return;
    if (!Social.guildCreate(name, packGuildMark(pixels))) return;
    playUiSound('click');
  };

  return (
    <div className="guild-dialog-layer">
      <div className="guild-create">
        <div className="guild-create-title">{t('guild.found')}</div>
        <label className="guild-create-name">
          {t('guild.createName')}
          <input
            autoFocus
            maxLength={8}
            value={name}
            spellCheck={false}
            onChange={e => setName(e.target.value.replace(/[^A-Za-z0-9]/g, ''))}
            onKeyDown={e => {
              if (e.key === 'Enter') create();
              else if (e.key === 'Escape') Social.cancelGuildCreation();
            }}
          />
        </label>
        <div className="guild-create-editor">
          <div
            className="guild-create-grid"
            style={{ width: CELL * GUILD_MARK_SIZE, height: CELL * GUILD_MARK_SIZE }}
          >
            {pixels.map((p, i) => (
              <div
                key={i}
                className="guild-create-cell"
                style={{ width: CELL, height: CELL, backgroundColor: GUILD_MARK_PALETTE[p] }}
                onMouseDown={() => paint(i)}
                onMouseEnter={e => {
                  if (e.buttons & 1) paint(i);
                }}
              />
            ))}
          </div>
          <div className="guild-create-palette">
            {GUILD_MARK_PALETTE.map((c, i) => (
              <div
                key={i}
                className={`guild-create-swatch${color === i ? ' active' : ''}`}
                title={
                  i === 0 ? t('guild.markErase') : t('guild.markColour', { index: i })
                }
                style={{ backgroundColor: c }}
                onClick={() => setColor(i)}
              />
            ))}
          </div>
          <img
            className="guild-create-preview"
            alt=""
            width={MARK_PX}
            height={MARK_PX}
            style={{ width: MARK_PX, height: MARK_PX }}
            src={guildMarkDataUrl(packGuildMark(pixels))}
          />
        </div>
        <div className="guild-create-buttons">
          <button type="button" disabled={pending || !name} onClick={uiClick(create)}>
            {pending ? t('common.creating') : t('common.create')}
          </button>
          <button type="button" onClick={uiClick(() => Social.cancelGuildCreation())}>
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
});
