/// <summary>
/// The constants for the players inventory.
/// </summary>
export class InventoryConstants {
  /// <summary>
  /// The first equippable item slot index.
  /// </summary>
  static readonly FirstEquippableItemSlotIndex = 0;

  /// <summary>
  /// The last equippable item slot index.
  /// </summary>
  static readonly LastEquippableItemSlotIndex = 11;

  /// <summary>
  /// The equippable slots count.
  /// </summary>
  static readonly EquippableSlotsCount =
    this.LastEquippableItemSlotIndex - this.FirstEquippableItemSlotIndex + 1;

  /// <summary>
  /// The left hand inventory slot index.
  /// </summary>
  static readonly LeftHandSlot = 0;

  /// <summary>
  /// The right hand inventory slot index.
  /// </summary>
  static readonly RightHandSlot = 1;

  /// <summary>
  /// The helm inventory slot index.
  /// </summary>
  static readonly HelmSlot = 2;

  /// <summary>
  /// The armor inventory slot index.
  /// </summary>
  static readonly ArmorSlot = 3;

  /// <summary>
  /// The pants inventory slot index.
  /// </summary>
  static readonly PantsSlot = 4;

  /// <summary>
  /// The gloves inventory slot index.
  /// </summary>
  static readonly GlovesSlot = 5;

  /// <summary>
  /// The boots inventory slot index.
  /// </summary>
  static readonly BootsSlot = 6;

  /// <summary>
  /// The wings inventory slot index.
  /// </summary>
  static readonly WingsSlot = 7;

  /// <summary>
  /// The pet inventory slot index.
  /// </summary>
  static readonly PetSlot = 8;

  /// <summary>
  /// The pendant inventory slot index.
  /// </summary>
  static readonly PendantSlot = 9;

  /// <summary>
  /// The first ring inventory slot index.
  /// </summary>
  static readonly Ring1Slot = 10;

  /// <summary>
  /// The second ring inventory slot index.
  /// </summary>
  static readonly Ring2Slot = 11;

  /// <summary>
  /// The size of a row.
  /// </summary>
  static readonly RowSize = 8;

  /// <summary>
  /// Number of rows in the inventory.
  /// </summary>
  static readonly InventoryRows = 8;

  /// <summary>
  /// The maximum number of extensions.
  /// </summary>
  static readonly MaximumNumberOfExtensions = 4;

  /// <summary>
  /// The number of rows of one extension.
  /// </summary>
  static readonly RowsOfOneExtension = 4;

  /// <summary>
  /// Number of rows of the inventory extension.
  /// </summary>
  static readonly AllInventoryExtensionRows =
    this.MaximumNumberOfExtensions * this.RowsOfOneExtension;

  /// <summary>
  /// Index of the first personal store slot.
  /// 12 = number of wearable item slots
  /// 64 = number of inventory slots
  /// </summary>
  static readonly FirstExtensionItemSlotIndex =
    this.EquippableSlotsCount + // 12
    this.InventoryRows * this.RowSize; // 64

  /// <summary>
  /// Index of the first personal store slot.
  /// 12 = number of wearable item slots
  /// 64 = number of inventory slots
  /// 128 = number of extended inventory slots (64 are hidden in game, S6E3).
  /// </summary>
  /// <remarks>
  /// TODO: This is only valid in season 6! Before, there are no extensions and the store begins earlier.
  /// </remarks>
  static readonly FirstStoreItemSlotIndex =
    this.EquippableSlotsCount + // 12
    this.InventoryRows * this.RowSize + // 64
    this.AllInventoryExtensionRows * this.RowSize; // 128

  /// <summary>
  /// The number of personal store rows.
  /// </summary>
  static readonly StoreRows = 4;

  /// <summary>
  /// The size of the personal store.
  /// </summary>
  static readonly StoreSize = this.StoreRows * this.RowSize;

  /// <summary>
  /// The number of temporary storage rows.
  /// </summary>
  static readonly TemporaryStorageRows = 4;

  /// <summary>
  /// The number of temporary storage slots.
  /// </summary>
  static readonly TemporaryStorageSize =
    this.TemporaryStorageRows * this.RowSize;

  /// <summary>
  /// The number of rows in the warehouse (vault).
  /// </summary>
  static readonly WarehouseRows = 15;

  /// <summary>
  /// The number of warehouse item slots.
  /// </summary>
  static readonly WarehouseSize = this.WarehouseRows * this.RowSize;

  /// <summary>
  /// Gets the size of the inventory with the specified number of extensions.
  /// </summary>
  /// <param name="numberOfExtensions">The number of inventory extensions.</param>
  /// <returns>The size of the inventory.</returns>
  static GetInventorySize(numberOfExtensions: number) {
    const size =
      this.EquippableSlotsCount +
      this.InventoryRows * this.RowSize +
      this.RowsOfOneExtension *
        this.RowSize *
        Math.max(
          Math.min(numberOfExtensions, this.MaximumNumberOfExtensions),
          0
        );

    return size;
  }

  /// <summary>
  /// Determines whether the item slot is of an defending item.
  /// </summary>
  /// <param name="itemSlot">The item slot.</param>
  /// <returns><see langword="true"/>, if the slot is of an defending item.</returns>
  static IsDefenseItemSlot(itemSlot: number) {
    return (
      (itemSlot >= this.HelmSlot && itemSlot <= this.WingsSlot) ||
      itemSlot == this.Ring1Slot ||
      itemSlot == this.Ring2Slot
    );
  }
}
