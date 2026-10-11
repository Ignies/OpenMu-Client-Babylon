/** Korean text of the `inventory` module. */

import type en from './en';

export default {
  'item.takeItemOffFirst': '강화하기 전에 아이템을 벗으세요',
  'item.jewelNotAJewel': '그 아이템은 다른 아이템에 사용할 수 없습니다',
  'item.jewelNotUpgradable': '그 아이템은 강화할 수 없습니다',
  'item.jewelBlessLimit': '블레스 보석은 +6까지만 됩니다',
  'item.jewelSoulLimit': '소울 보석은 +9까지만 됩니다',
  'item.jewelHarmonyAncient': '하모니 보석은 고대 아이템에 쓸 수 없습니다',
  'item.jewelHarmonySocket': '하모니 보석은 소켓 아이템에 쓸 수 없습니다',
  'item.refineStoneSocket': '정련석은 소켓 아이템에 쓸 수 없습니다',
  'item.jewelWrongTarget': '그 아이템은 다른 아이템에 쓸 수 없습니다',
  'notify.cannotStore': '이 아이템은 보관할 수 없습니다',
  'notify.cannotTrade': '이 아이템은 거래할 수 없습니다',
  'notify.noInventoryRoom': '인벤토리에 공간이 없습니다',
  'notify.noRoomForItem': '그 아이템을 넣을 공간이 없습니다',
  'notify.inventorySorted': '인벤토리를 정리했습니다',
  'notify.itemsMoved': '아이템 {count}개를 옮겼습니다',
  'notify.itemsBought': '{count}개 구매',
  'notify.cannotMoveItem': '그 아이템은 거기로 옮길 수 없습니다',
  'notify.cannotUseItem': '그 아이템은 그렇게 쓸 수 없습니다',
} satisfies Partial<Record<keyof typeof en, string>>;
