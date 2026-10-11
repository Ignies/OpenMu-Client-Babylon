/** English text of the `chat_room` window. See src/i18n/readme.md. */

const en = {
  'chatRoom.title': 'Chat Room',
  'chatRoom.connecting': 'Connecting to the chat server...',
  'chatRoom.closed': 'Disconnected',
  'chatRoom.members': 'Members ({count})',
  'chatRoom.invite': 'Invite',
  'chatRoom.inviteEmpty': 'No other friends are online.',
  'chatRoom.inputPlaceholder': 'Type a message',
  'chatRoom.waiting': 'Waiting for {name} to join...',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'versions/shared/ui/windows/chat_room': typeof en;
  }
}
