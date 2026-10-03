/** English text of the `server_select` page. See src/i18n/readme.md. */

const en = {
  'servers.connectionLost': 'Connection to the server was lost.',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'versions/shared/ui/pages/server_select': typeof en;
  }
}
