import './style.less';
import { lazy, Suspense } from 'react';
import { observer } from 'mobx-react-lite';
import { runInAction } from 'mobx';
import { Store } from '@/app/store';
import { isKey } from '@/controllers/interface/keyBindings';
import { useEventBus } from '@/controllers/interface/hooks/useEventBus';
import { WorldObjects } from '../../hud/world_objects';
import { DamageNumbers } from '../../hud/damage_numbers';
import { TargetHealthBar } from '../../hud/target_health_bar';
import { MoveCommandWindow } from '../../windows/move_command_window';
import { BottomBar } from '../../hud/bottom_bar';
import { CharacterInfo } from '../../windows/character_info';
import { PetInfoWindow } from '../../windows/pet_info';
import { MuHelperWindow } from '../../windows/mu_helper';
import { CashShop } from '../../windows/cash_shop';
import { MarketplaceWindow } from '../../windows/marketplace';
import { Inventory } from '../../windows/inventory';
import { NpcShop } from '../../windows/npc_shop';
import { Vault } from '../../windows/vault';
import { ChaosMachine } from '../../windows/chaos_machine';
import { TradeWindow } from '../../windows/trade';
import { MyShop, ShopBrowser } from '../../windows/personal_shop';
import {
  EconomyPrompts,
  TradePrompt,
} from '../../windows/economy_prompts';
import { MsgWindow } from '@/controllers/interface/components/msg_window';
import { PickedItemCursor } from '@/controllers/interface/components/picked_item';
import { BuffBar } from '../../hud/buff_bar';
import { EmoteMenu } from '../../windows/emote_menu';
import { InstrumentWindow } from '../../windows/instrument_window';
import { ChatWindow } from '../../hud/chat';
import { CommandWindow } from '../../windows/command_window';
import { QuickCommandWindow } from '../../windows/quick_command_window';
import { PartyWindow } from '../../windows/party';
import {
  GuildCreationDialog,
  GuildKickPasswordDialog,
  GuildMasterDialog,
  GuildWindow,
} from '../../windows/guild';
import { QuestTracker, QuestWindows } from '../../windows/quests';
import { BalgassEntryWindow } from '../../windows/balgass_entry';
import { FriendWindow } from '../../windows/friends';
import { ChatRoomWindow } from '../../windows/chat_room';
import { SocialPrompts } from '../../windows/social_prompts';
import { Minimap } from '../../hud/minimap';
import { loadVersionUi } from '@/version';
import { SkillListWindow } from '../../windows/skills';
import { EventWindows } from '../../windows/events';
import { SoccerScoreHud } from '../../hud/soccer_score';
import { DuelWindows } from '../../windows/duel';
import { Notices } from '../../hud/notices';
import { MapNameBanner } from '../../hud/map_name_banner';
import { SessionStatsWindow } from '../../windows/session_stats';
import { PerfReadout } from '../../hud/perf_readout';
import { SlideHelpBar } from '../../hud/slide_help';
import { DebugMenuWindow } from '../../windows/debug_menu';
import { GmPanelWindow } from '../../windows/gm_panel';
import { MobileControls } from '../../hud/mobile_controls';
import { LowHealthOverlay } from '../../hud/low_health_overlay';

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
      <PerfReadout />
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
      <InstrumentWindow />
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
      {/* The original's message box, in the world for the item confirmations. */}
      <MsgWindow />
      <GuildMasterDialog />
      <GuildCreationDialog />
      <GuildKickPasswordDialog />
      <EventWindows />
      <BalgassEntryWindow />
      <SoccerScoreHud />
      <DuelWindows />
      <SessionStatsWindow />
      <Minimap />
      <QuestTracker />
      {/* Offline only: renders null online (F9). */}
      <DebugMenuWindow />
      {/* Game masters only: renders null for everyone else (F8). */}
      <GmPanelWindow />
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
      {/* Over the world, under everything drawn on it, and outside the HUD:
          a warning is not chrome, so the hide-interface key leaves it up. */}
      <LowHealthOverlay />
      <WorldObjects />
      <DamageNumbers />
      {!Store.hudHidden && <HUD />}
    </div>
  );
});
