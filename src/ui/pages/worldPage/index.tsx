import './style.less';
import { lazy, Suspense } from 'react';
import { observer } from 'mobx-react-lite';
import { runInAction } from 'mobx';
import { Store } from '../../../store';
import { isKey } from '../../../common/keyBindings';
import { useEventBus } from '../../../hooks/useEventBus';
import { WorldObjects } from '../../components/worldObjects';
import { DamageNumbers } from '../../components/damageNumbers';
import { TargetHealthBar } from '../../components/targetHealthBar';
import { MoveCommandWindow } from './components/moveCommandWindow';
import { BottomBar } from './components/bottomBar';
import { CharacterInfo } from './components/characterInfo';
import { PetInfoWindow } from './components/petInfo';
import { MuHelperWindow } from './components/muHelper';
import { CashShop } from './components/cashShop';
import { MarketplaceWindow } from './components/marketplace';
import { Inventory } from './components/inventory';
import { NpcShop } from './components/npcShop';
import { Vault } from './components/vault';
import { ChaosMachine } from './components/chaosMachine';
import { TradeWindow } from './components/trade';
import { MyShop, ShopBrowser } from './components/personalShop';
import {
  EconomyPrompts,
  TradePrompt,
} from './components/economyPrompts';
import { PickedItemCursor } from '../../components/pickedItem';
import { BuffBar } from '../../components/buffBar';
import { EmoteMenu } from './components/emoteMenu';
import { ChatWindow } from './components/chat';
import { CommandWindow } from './components/commandWindow';
import { QuickCommandWindow } from './components/quickCommandWindow';
import { PartyWindow } from './components/party';
import {
  GuildCreationDialog,
  GuildKickPasswordDialog,
  GuildMasterDialog,
  GuildWindow,
} from './components/guild';
import { QuestWindows } from './components/quests';
import { FriendWindow } from './components/friends';
import { ChatRoomWindow } from './components/chatRoom';
import { SocialPrompts } from './components/socialPrompts';
import { Minimap } from './components/minimap';
import { loadVersionUi } from '../../../version';
import { SkillListWindow } from './components/skills';
import { EventWindows } from './components/events';
import { SoccerScoreHud } from './components/soccerScore';
import { DuelWindows } from './components/duel';
import { Notices } from '../../components/notices';
import { MapNameBanner } from './components/mapNameBanner';
import { SessionStatsWindow } from './components/sessionStats';
import { SlideHelpBar } from '../../components/slideHelp';
import { DebugMenuWindow } from '../../components/debugMenu';
import { MobileControls } from './components/mobileControls';

// The active version's take on the windows that differ per version. Lazy so
// the version UI chunk evaluates after the core app modules, not before.
const MasterSkillsWindow = lazy(async () => ({
  default: (await loadVersionUi()).MasterSkillsWindow,
}));

const HUD = observer(() => {
  return (
    <div className="hud">
      <TargetHealthBar />
      <MapNameBanner />
      <Notices />
      <SlideHelpBar />
      <BuffBar />
      <BottomBar />
      {}
      <Inventory />
      <NpcShop />
      {}
      <Vault />
      <ChaosMachine />
      <TradeWindow />
      <MyShop />
      <ShopBrowser />
      <CharacterInfo />
      <PetInfoWindow />
      <MuHelperWindow />
      <CashShop />
      <MarketplaceWindow />
      <MoveCommandWindow />
      <EmoteMenu />
      <ChatWindow />
      <CommandWindow />
      <QuickCommandWindow />
      <PartyWindow />
      <GuildWindow />
      <SkillListWindow />
      <Suspense fallback={null}>
        <MasterSkillsWindow />
      </Suspense>
      <QuestWindows />
      <FriendWindow />
      <ChatRoomWindow />
      <SocialPrompts />
      <TradePrompt />
      <EconomyPrompts />
      <GuildMasterDialog />
      <GuildCreationDialog />
      <GuildKickPasswordDialog />
      <EventWindows />
      <SoccerScoreHud />
      <DuelWindows />
      <SessionStatsWindow />
      <Minimap />
      {/* Offline only: renders null online (F9). */}
      <DebugMenuWindow />
      {}
      {/* Touch clients only: renders null on a mouse. */}
      <MobileControls />
      {}
      <PickedItemCursor />
    </div>
  );
});

export const WorldPage = observer(() => {
  // The screenshot key: the whole HUD layer off, the world untouched.
  useEventBus('keyPressed', key => {
    if (isKey('hideUi', key)) {
      runInAction(() => (Store.hudHidden = !Store.hudHidden));
    }
  });

  return (
    <div className="world-page">
      <WorldObjects />
      <DamageNumbers />
      {!Store.hudHidden && <HUD />}
    </div>
  );
});
