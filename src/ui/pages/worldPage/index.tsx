import './style.less';
import { observer } from 'mobx-react-lite';
import { WorldObjects } from '../../components/worldObjects';
import { DamageNumbers } from '../../components/damageNumbers';
import { TargetHealthBar } from '../../components/targetHealthBar';
import { MoveCommandWindow } from './components/moveCommandWindow';
import { BottomBar } from './components/bottomBar';
import { CharacterInfo } from './components/characterInfo';
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
import { PartyWindow } from './components/party';
import {
  GuildCreationDialog,
  GuildKickPasswordDialog,
  GuildMasterDialog,
  GuildWindow,
} from './components/guild';
import { QuestWindows } from './components/quests';
import { FriendWindow } from './components/friends';
import { SocialPrompts } from './components/socialPrompts';
import { Minimap } from './components/minimap';
import { MasterSkillsWindow } from '@version/ui';
import { SkillListWindow } from './components/skills';
import { EventWindows } from './components/events';
import { Notices } from '../../components/notices';
import { SlideHelpBar } from '../../components/slideHelp';

const HUD = observer(() => {
  return (
    <div className="hud">
      <TargetHealthBar />
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
      <MoveCommandWindow />
      <EmoteMenu />
      <ChatWindow />
      <CommandWindow />
      <PartyWindow />
      <GuildWindow />
      <SkillListWindow />
      <MasterSkillsWindow />
      <QuestWindows />
      <FriendWindow />
      <SocialPrompts />
      <TradePrompt />
      <EconomyPrompts />
      <GuildMasterDialog />
      <GuildCreationDialog />
      <GuildKickPasswordDialog />
      <EventWindows />
      <Minimap />
      {}
      <PickedItemCursor />
    </div>
  );
});

export const WorldPage = observer(() => {
  return (
    <div className="world-page">
      <WorldObjects />
      <DamageNumbers />
      <HUD />
    </div>
  );
});
