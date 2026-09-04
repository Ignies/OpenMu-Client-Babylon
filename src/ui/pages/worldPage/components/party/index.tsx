import { isKey } from '../../../../../common/keyBindings';
import { t } from '../../../../../i18n';
import './style.less';
import { observer } from 'mobx-react-lite';
import { runInAction } from 'mobx';
import { Store } from '../../../../../store';
import { MAX_PARTY_MEMBERS, Social } from '../../../../../social';
import { Economy } from '../../../../../economy';
import { useEventBus } from '../../../../../hooks/useEventBus';
import { uiClick } from '../../../../../libs/sfx';
import { MuButton } from '../../../../components/muButton';
import { MuSpriteFrame } from '../../../../components/muSprite';
import { MuItemWindow, MuTableFrame } from '../../../../components/muWindow';
import { useNearbyPlayers } from '../nearbyPlayers';

/**
 * `CNewUIPartyInfoWindow`: the party list in an item-window frame. Each row
 * is a member with the HP bar the server pushes through PartyHealthUpdate,
 * the leader's flag on row 0, and an X to leave (own row) or kick (leader).
 * The original invites from the command window on a clicked character; here
 * the reachable players are listed under the members, with the same three
 * actions that window offers - Invite, Trade and, for a player with a stall
 * up, Shop.
 */

const WINDOW_ID = 'party-window';
const HOT_KEY = 'party';

const TITLE_Y = 12;
/** The X in the frame art. `left`/`top`, not `x`/`y`: those are not CSS on a div. */
const HEAD_CLOSE = { left: 169, top: 7, width: 13, height: 12 };
const TABLE = { x: 12, y: 48, width: 166, height: 150 };
const ROW_X = 16;
const ROW_Y0 = 56;
const ROW_HEIGHT = 28;
const ROW_WIDTH = 151;
/**
 * `RenderMemberStatue` (NewUIPartyInfoWindow.cpp:271): the 151x8 trough with
 * the 147x4 fill inset by two pixels on the left and two from the top. The
 * fill is `RenderImage(..., iHP, 4)`, so the original scales the whole
 * texture into the filled width rather than cropping it - `backgroundSize:
 * 100% 100%` below does the same.
 */
const HP_BACK = { width: 151, height: 8 };
const HP_FILL = { width: 147, height: 4, insetX: 2, insetY: 2 };
const NEARBY = { x: 12, y: 204, width: 166, height: 180 };
const EXIT_BUTTON = { x: 13, y: 392, width: 36, height: 29 };

const FLAG_SPRITE = 'newui_Party_flag.OZT';
const X_SPRITE = 'newui_Party_X.OZT';
const EXIT_SPRITE = 'newui_exit_00.OZT';
const HP_BACK_SPRITE = 'newui_Party_Lifebar01.OZJ';
const HP_FILL_SPRITE = 'newui_Party_Lifebar02.OZJ';

const FLAG_SIZE = 12;
const X_SIZE = 10;

const MemberRow = observer(({ index }: { index: number }) => {
  const member = Social.partyMembers[index];
  if (!member) return null;

  const isMe = member.name === Store.playerData.name;
  const ratio =
    member.healthStep >= 0
      ? member.healthStep / 10
      : member.maximumHealth > 0
        ? member.currentHealth / member.maximumHealth
        : 1;
  // `int iHP = (currHP * 147) / maxHP` — an integer number of filled pixels.
  const filled = Math.max(0, Math.min(HP_FILL.width, Math.trunc(ratio * HP_FILL.width)));
  const canRemove = isMe || Social.isPartyLeader;

  return (
    <div
      className="party-row"
      data-no-drag="true"
      style={{ left: ROW_X, top: ROW_Y0 + index * ROW_HEIGHT, width: ROW_WIDTH }}
    >
      {index === 0 && (
        <MuSpriteFrame
          file={FLAG_SPRITE}
          width={FLAG_SIZE}
          height={FLAG_SIZE}
          className="party-flag"
          title={t('party.leader')}
        />
      )}
      <div className={`party-name${isMe ? ' me' : ''}`}>{member.name}</div>
      {canRemove && (
        <MuSpriteFrame
          file={X_SPRITE}
          width={X_SIZE}
          height={X_SIZE}
          className="party-x"
          title={
            isMe ? t('party.leave') : t('party.kick', { name: member.name })
          }
          onClick={uiClick(() =>
            isMe ? Social.partyLeave() : Social.partyKick(member.index)
          )}
        />
      )}
      <MuSpriteFrame
        file={HP_BACK_SPRITE}
        width={HP_BACK.width}
        height={HP_BACK.height}
        className="party-hp"
        title={`${member.currentHealth} / ${member.maximumHealth}`}
        style={{ backgroundSize: '100% 100%' }}
      >
        {filled > 0 && (
          <MuSpriteFrame
            file={HP_FILL_SPRITE}
            width={filled}
            height={HP_FILL.height}
            className="party-hp-fill"
            style={{
              left: HP_FILL.insetX,
              top: HP_FILL.insetY,
              backgroundSize: '100% 100%',
            }}
          />
        )}
      </MuSpriteFrame>
    </div>
  );
});

const NearbyList = observer(() => {
  const players = useNearbyPlayers();
  const canInvite =
    (!Social.inParty || Social.isPartyLeader) &&
    Social.partyMembers.length < MAX_PARTY_MEMBERS;
  const inParty = new Set(Social.partyMembers.map(m => m.name));
  const candidates = players.filter(p => !inParty.has(p.name));

  return (
    <div
      className="party-nearby"
      data-no-drag="true"
      style={{ left: NEARBY.x + 8, top: NEARBY.y + 8, width: NEARBY.width - 16 }}
    >
      <div className="party-nearby-title">{t('party.nearby')}</div>
      {candidates.length === 0 && (
        <div className="party-nearby-empty">{t('party.nearbyEmpty')}</div>
      )}
      {}
      {candidates.map(p => (
        <div key={p.netId} className="party-nearby-row">
          <span className="party-nearby-name">{p.name}</span>
          <button
            type="button"
            disabled={!canInvite}
            onClick={uiClick(() => Social.partyInvite(p))}
          >
            Invite
          </button>
          <button
            type="button"
            title={t('party.tradeWith', { name: p.name })}
            disabled={Economy.tradeOpen}
            onClick={uiClick(() => Economy.requestTrade(p))}
          >
            Trade
          </button>
          {Economy.shopTitles.has(p.netId) && (
            <button
              type="button"
              title={Economy.shopTitles.get(p.netId)}
              onClick={uiClick(() => Economy.browseShop(p))}
            >
              Shop
            </button>
          )}
        </div>
      ))}
    </div>
  );
});

export const PartyWindow = observer(() => {
  const toggle = () => {
    runInAction(() => {
      Social.partyWindowEnabled = !Social.partyWindowEnabled;
    });
    if (Social.partyWindowEnabled) Social.requestPartyList();
  };
  const close = () =>
    runInAction(() => {
      Social.partyWindowEnabled = false;
    });

  useEventBus('keyPressed', key => {
    if (isKey(HOT_KEY, key) && Store.world?.playerEntity) toggle();
  });

  if (!Social.partyWindowEnabled) return null;

  return (
    <MuItemWindow
      id={WINDOW_ID}
      className="party-window"
      column={1}
      label={t('party.title')}
      onClose={close}
    >
      <div className="party-title" style={{ top: TITLE_Y }}>
        Party
      </div>
      <div
        className="head-close"
        data-no-drag="true"
        style={HEAD_CLOSE}
        onClick={close}
      />

      <div
        className="table-fill"
        style={{ left: TABLE.x, top: TABLE.y, width: TABLE.width, height: TABLE.height }}
      />
      <MuTableFrame {...{ left: TABLE.x, top: TABLE.y, width: TABLE.width, height: TABLE.height }} />
      {Social.partyMembers.length === 0 && (
        <div className="party-empty" style={{ left: ROW_X, top: ROW_Y0 + 6, width: ROW_WIDTH }}>
          {t('party.notInParty')}
        </div>
      )}
      {Array.from({ length: MAX_PARTY_MEMBERS }, (_, i) => (
        <MemberRow key={i} index={i} />
      ))}

      <div
        className="table-fill"
        style={{ left: NEARBY.x, top: NEARBY.y, width: NEARBY.width, height: NEARBY.height }}
      />
      <MuTableFrame {...{ left: NEARBY.x, top: NEARBY.y, width: NEARBY.width, height: NEARBY.height }} />
      <NearbyList />

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
