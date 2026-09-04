/**
 * Season 6 sprite preloads: the sheets to decode up front, in two waves.
 *
 * The lists moved here from `libs/mu/preloadSprites.ts` unchanged - the
 * loader still owns when and how, the version owns which files. A period
 * tree shares almost no interface file names with this one, which is why
 * this is version property (versions/v097d/ui/preload.ts).
 */
import { CURSOR_SPRITES } from '../../../src/ui/components/gameCursor/cursors';
import { MU_WINDOW_SPRITES } from '../../../src/ui/components/muWindow';
import { INVENTORY_SPRITES } from '../../../src/ui/pages/worldPage/components/inventory/layout';
import { NPC_SHOP_SPRITES } from '../../../src/ui/pages/worldPage/components/npcShop/layout';
import { CHARACTER_INFO_SPRITES } from '../../../src/ui/pages/worldPage/components/characterInfo/layout';
import { VAULT_SPRITES } from '../../../src/ui/pages/worldPage/components/vault/layout';
import { CHAOS_MACHINE_SPRITES } from '../../../src/ui/pages/worldPage/components/chaosMachine/layout';
import { TRADE_SPRITES } from '../../../src/ui/pages/worldPage/components/trade/layout';
import { PERSONAL_SHOP_SPRITES } from '../../../src/ui/pages/worldPage/components/personalShop/layout';
import type { VersionPreload } from '../../../src/version/uiContract';

const PREGAME_SPRITES = [
  ...CURSOR_SPRITES,

  'LSBg01.OZJ',
  'LSBg02.OZJ',
  'LSBg03.OZJ',
  'LSBg04.OZJ',
  'Progress.OZJ',
  'Progress_Back.OZJ',

  'cha_bt.OZT',
  'server_b2_all.OZT',
  'server_b2_loding.OZJ',
  'server_deco_all.OZT',
  'server_ex01.OZT',
  'server_ex02.OZJ',
  'server_ex03.OZT',

  'login_back.OZT',
  'login_me.OZT',
  'message_ok_b_all.OZT',
  'loding_cancel_b_all.OZT',
  'op2_ch.OZT',

  'message_back.OZT',
  'delete_secret_number.OZT',

  'cha_id.OZT',

  'op1_stone.OZJ',
  'op1_back2.OZT',
  'op1_back3.OZJ',
  'op1_back4.OZJ',
  'op1_b_all.OZT',
  'op2_back1.OZT',
  'op2_volume1.OZT',
  'op2_volume2.OZJ',
  'op2_volume3.OZT',
];

/**
 * World sprites no window layout lists: the HUD, chat, minimap, party,
 * guild, quest, master tree, buff, skill and number sheets. Without them
 * each window decoded its sheets on first open (an empty first paint per
 * `MuSpriteFrame`, one state update each).
 */
const HUD_SPRITES = [
  // bottom bar, orbs, hot keys, exp
  'newui_menu01.OZJ',
  'newui_menu02.OZJ',
  'partCharge1/newui_menu03.OZJ',
  'partCharge1/newui_menu_Bt01.OZJ',
  'partCharge1/newui_menu_Bt02.OZJ',
  'partCharge1/newui_menu_Bt03.OZJ',
  'partCharge1/newui_menu_Bt04.OZJ',
  'partCharge1/newui_menu_Bt05.OZJ',
  'newui_menu_red.OZJ',
  'newui_menu_SD.OZJ',
  'newui_menu_AG.OZJ',
  'newui_menu_blue.OZJ',
  'newui_Exbar.OZJ',
  'Exbar_Master.OZJ',
  'newui_number1.OZT',
  'FontTest.OZT',
  // skills, buffs
  'newui_skill.OZJ',
  'newui_skill2.OZJ',
  'newui_skill3.OZJ',
  'newui_non_skill.OZJ',
  'newui_non_skill2.OZJ',
  'newui_non_skill3.OZJ',
  'newui_command.OZJ',
  'newui_non_command.OZJ',
  'newui_skillbox.OZJ',
  'newui_skillbox2.OZJ',
  'newui_statusicon.OZJ',
  'newui_statusicon2.OZJ',
  'newui_statusicon3.OZJ',
  // chat
  'newui_chat_back.OZJ',
  'newui_chat_btn_alpha.OZJ',
  'newui_chat_btn_size.OZJ',
  'newui_chat_chat_on.OZJ',
  'newui_chat_frame_on.OZJ',
  'newui_chat_gens_on.OZJ',
  'newui_chat_guild_on.OZJ',
  'newui_chat_normal_on.OZJ',
  'newui_chat_party_on.OZJ',
  'newui_chat_system_on.OZJ',
  'newui_chat_whisper_on.OZJ',
  'newui_Bt_Chat_guild.OZJ',
  'newui_Bt_Chat_normal.OZJ',
  'newui_Bt_Chat_party.OZJ',
  'newui_Bt_Chat_system.OZJ',
  'newui_Scrollbar_stretch.OZJ',
  'newui_scroll_off.OZT',
  'newui_scroll_on.OZT',
  'newui_scrollbar_down.OZT',
  'newui_scrollbar_m.OZT',
  'newui_scrollbar_up.OZT',
  // minimap, party, guild, quest, master tree, misc windows
  'mini_map_ui_cancel.OZT',
  'mini_map_ui_cha.OZT',
  'mini_map_ui_corner.OZT',
  'mini_map_ui_line.OZJ',
  'mini_map_ui_npc.OZT',
  'mini_map_ui_party.OZT',
  'mini_map_ui_portal.OZT',
  'newui_Party_Lifebar01.OZJ',
  'newui_Party_Lifebar02.OZJ',
  'newui_Party_X.OZT',
  'newui_Party_flag.OZT',
  'newui_guild_tab01.OZT',
  'newui_guild_tab02.OZT',
  'newui_guild_tab03.OZT',
  'Quest_Bt_cast.OZT',
  'Quest_Bt_open.OZT',
  'Quest_bt_L.OZT',
  'Quest_bt_R.OZT',
  'Quest_tab01.OZT',
  'Quest_tab02.OZT',
  'Quest_tab03.OZT',
  'newui_myquest_Line.OZT',
  'new_Master_Icon.OZJ',
  'new_Master_non_Icon.OZJ',
  'new_Master_back01.OZJ',
  'new_Master_back02.OZJ',
  'new_Master_box.OZT',
  'new_Master_exit.OZJ',
  'new_Master_arrow01.OZT',
  'new_Master_arrow02.OZT',
  'new_Master_arrow03.OZT',
  'new_Master_arrow04.OZT',
  'new_Master_arrow05.OZT',
  'new_Master_arrow06.OZT',
  'new_Master_arrow07.OZT',
  'new_Master_arrow08.OZT',
  'newui_msgbox_back.OZJ',
  'newui_btn_empty.OZT',
  'newui_btn_empty_big.OZT',
  'newui_btn_empty_small.OZT',
  'newui_btn_empty_very_small.OZT',
  'newui_cha_textbox02.OZT',
  'newui_chainfo_btn_level.OZT',
  'newui_chainfo_btn_master.OZT',
  'newui_chainfo_btn_pet.OZT',
  'newui_chainfo_btn_quest.OZT',
  'newui_Cursorid_wnd.OZJ',
  'newui_Account_title.OZT',
  'newui_Box_openTitle.OZT',
  'newui_Figure_blood.OZT',
  'newui_Figure_ground.OZT',
  'newui_expansion_btn.OZT',
  'newui_exit_00.OZT',
  'newui_repair_00.OZT',
  'server_menu_b_all.OZT',
];

const WORLD_SPRITES = [
  ...new Set([
    ...MU_WINDOW_SPRITES,
    ...INVENTORY_SPRITES,
    ...CHARACTER_INFO_SPRITES,
    ...NPC_SHOP_SPRITES,
    ...VAULT_SPRITES,
    ...CHAOS_MACHINE_SPRITES,
    ...TRADE_SPRITES,
    ...PERSONAL_SHOP_SPRITES,
    ...HUD_SPRITES,
  ]),
];

export const season6Preload: VersionPreload = {
  pregameSprites: PREGAME_SPRITES,
  worldSprites: WORLD_SPRITES,
};
