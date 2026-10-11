/** English text of the `vault` window. See src/i18n/readme.md. */

const en = {
  'vault.depositJewels': 'Jewels',
  'vault.depositJewelsHint': 'Move every jewel from the inventory into the vault',

  'vault.title': 'Vault',
  'vault.unlocked': 'Unlocked',
  'vault.locked': 'Locked',
  'vault.fee': 'Fee',
  'vault.deposit': 'Store Zen',
  'vault.withdraw': 'Take Zen',
  'vault.pin': 'Vault pin',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'versions/shared/ui/windows/vault': typeof en;
  }
}
