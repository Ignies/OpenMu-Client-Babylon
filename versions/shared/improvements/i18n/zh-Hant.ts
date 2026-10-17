/** zh-Hant text of `versions/shared/improvements`. */

import type en from './en';

export default {
  'fidelity.otherPlayersOwnSpeed': '其他玩家依自身速度行動',
  'fidelity.otherPlayersOwnSpeed.hint': '其他玩家以自己的攻擊速度與魔法速度揮擊和施法。經典：與原版相同，所有人都以你的速度行動。',
  'fidelity.masterBuffCancel': '大師增益取消即結束',
  'fidelity.masterBuffCancel.hint': '大師或格鬥家的增益在伺服器取消時立即消失。經典：持續到計時結束。',
  'fidelity.archangelFeathers': '大天使的羽毛',
  'fidelity.archangelFeathers.hint': '血色城堡的大天使會飄落羽毛，地面的光暈也更大。經典：原版的小光暈，沒有羽毛。',
  'fidelity.loginChandeliers': '登入畫面吊燈點亮',
  'fidelity.loginChandeliers.hint': '登入畫面的吊燈會燃燒。經典：與原版相同，吊燈是熄滅的。',
  'fidelity.torchCrackle': '火把聲音',
  'fidelity.torchCrackle.hint': '靠近燃燒的火把時會聽到劈啪聲。經典：火把沒有聲音。',
  'fidelity.loginWallTorches': '登入畫面壁掛火把點亮',
  'fidelity.loginWallTorches.hint': '登入畫面的壁掛火把會燃起火焰並照亮地面。經典：與原版相同，只有光暈。',
  'fidelity.fortressLights': '帝國要塞的燈光',
  'fidelity.fortressLights.hint': '帝國要塞的壁掛火把、吊燈與火盆會照亮周圍的地面。經典：與原版相同，沒有燈光。',
  'fidelity.lampFlares': '燈光與光暈',
  'fidelity.lampFlares.hint': '路燈、蠟燭、壁爐與火盆會發出光暈，蠟燭會燃燒，部分燈火會照亮周圍的地面。經典：只顯示原版繪製的內容。',
  'fidelity.roofFade': '透視屋頂',
  'fidelity.roofFade.hint': '站在屋頂下時屋頂會淡出，讓你看見室內。經典：屋頂永遠顯示。',
  'fidelity.openRooms': '開放式房間',
  'fidelity.openRooms.hint': '在房間內時，周圍的城鎮仍然可見，不會變黑。經典：房間外的一切都是黑的。',
  'fidelity.requestTimeout': '請求20秒後逾期',
  'fidelity.requestTimeout.hint': '未回應的交易、組隊或決鬥請求會在20秒後自動拒絕。經典：一直等到你回應。',
  'fidelity.noticeLinks': '伺服器公告中的連結',
  'fidelity.noticeLinks.hint': '伺服器公告中的網址會顯示為加底線的連結，點擊後在新分頁開啟。經典：與原版相同，只是純文字。',
  'fidelity.cameraKeepsView': '傳送後保留鏡頭',
  'fidelity.cameraKeepsView.hint':
    '傳送或切換地圖時，鏡頭的縮放、旋轉與傾斜維持不變；視角被移動時會顯示「重設鏡頭」按鈕。經典：與原版相同，每次切換地圖都會重設鏡頭。',
  'fidelity.swingFill': '揮擊動作填滿出手間隔',
  'fidelity.swingFill.hint':
    '攻擊速度很高時，命中後的揮擊動作會放慢播放，一直持續到下一次揮擊，角色不會在中間僵住。命中時機不變。經典：與原版相同，動作提早結束，角色原地站著。',
  'fidelity.drawnClothShadows': '整齊的布料陰影',
  'fidelity.drawnClothShadows.hint': '只有角色正在顯示的披風、長袍與頭髮會投下陰影。經典：與原版相同，角色已不再顯示的布料仍會在原處留下陰影。',
  'fidelity.loginTokens': '儲存登入',
  'fidelity.loginTokens.hint': '在支援此功能的世界中，「記住我」會儲存登入憑證而非密碼，下次登入不必輸入密碼。經典：與原版相同，每次都要輸入密碼。',
  'fidelity.teleportLandsEarly': '瞬移立即落地',
  'fidelity.teleportLandsEarly.hint':
    '你自己的 Teleport 會在身影淡出後立即落到目標格，不等伺服器回應。經典：與原版相同，在伺服器回應前你會一直隱身停在原本的格子上。',
  'fidelity.soccerBoardClock': '記分板上的足球計時',
  'fidelity.soccerBoardClock.hint': '戰盟足球賽的時間會以時鐘顯示在記分板上，而不是畫面中央的一行字。經典：與原版相同，剩餘時間寫在畫面中央。',
  'fidelity.enhancedSkillEffects': '強化技能特效',
  'fidelity.enhancedSkillEffects.hint':
    '部分技能採用我們自己的外觀，例如帶有煙霧與暗幕的 Evil Spirit 群靈。也就是「技能特效」選項。經典：所有技能都依原版繪製。',
  'fidelity.restAnyWall': '倚靠任何牆壁休息',
  'fidelity.restAnyWall.hint': '點擊筆直的牆壁或圍欄，角色會走到旁邊倚靠，就像在倚靠點一樣。經典：與原版相同，只能在地圖指定的地點倚靠。',
} satisfies Partial<Record<keyof typeof en, string>>;
