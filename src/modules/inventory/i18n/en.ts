/** English text of the `inventory` module. See src/i18n/readme.md. */

const en = {
  'item.takeItemOffFirst': 'Take the item off before upgrading it',
  'item.jewelNotAJewel': 'That item cannot be used on another item',
  'item.jewelNotUpgradable': 'That item cannot be upgraded',
  'item.jewelBlessLimit': 'Jewel of Bless only works up to +6',
  'item.jewelSoulLimit': 'Jewel of Soul only works up to +9',
  'item.jewelHarmonyAncient':
    'Jewel of Harmony cannot be applied to ancient items',
  'item.jewelHarmonySocket':
    'Jewel of Harmony cannot be applied to socket items',
  'item.refineStoneSocket': 'Refining stones cannot be applied to socket items',
  'item.jewelWrongTarget': 'That item cannot be used on another item',
  'notify.cannotStore': 'This item cannot be stored',
  'notify.cannotTrade': 'This item cannot be traded',
  'notify.noInventoryRoom': 'There is no room in the inventory',
  'notify.noRoomForItem': 'There is no room for that item',
  'notify.inventorySorted': 'Inventory arranged',
  'notify.itemsMoved': '{count} items moved',
  'notify.itemsBought': '{count} bought',
  'notify.cannotMoveItem': "Can't move that item there",
  'notify.cannotUseItem': 'That item cannot be used like that',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'src/modules/inventory': typeof en;
  }
}
