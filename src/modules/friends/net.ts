import { AddLetterLetterStateEnum, AddLetterPacket, ChatRoomConnectionInfoPacket, FriendAddedPacket, FriendDeletedPacket, FriendInvitationResultPacket, FriendOnlineStateUpdatePacket, FriendRequestPacket, LetterSendResponseLetterSendRequestResultEnum, LetterSendResponsePacket, MessengerInitializationPacket, OpenLetterPacket, RemoveLetterPacket } from '@versions/shared/packets/ServerToClientPackets';
import { ChatRooms } from '../chat/chatRooms';
import { EventBus } from '@/core/eventBus';
import { FRIEND_OFFLINE } from './friendList';
import { Messenger } from './messenger';
import { Social } from '../social/social';
import { t, type TextKey } from '@/i18n';
import { UI_BUS, playSfx } from '@/controllers/sound/sfx';
import { cleanName } from '../chat/chat';
import { runInAction } from 'mobx';

// ---- friends & letters (`ReceiveFriend*` / `ReceiveLetter*`) ----------------

/** The friend `Server` byte: 0xFF is offline, anything else a game server. */
const friendServer = (serverId: number) =>
  serverId === FRIEND_OFFLINE ? -1 : serverId;

/**
 * MessengerInitialization (C2 0xC0): sent right after entering the game with
 * the whole friend list and the size of the letter box. The letters
 * themselves follow one AddLetter at a time.
 */
EventBus.on('MessengerInitialization', packet => {
  const p = new MessengerInitializationPacket(packet);
  Messenger.setFriends(
    p.getFriends().map(f => ({
      name: cleanName(f.Name),
      server: friendServer(f.ServerId),
    }))
  );
  runInAction(() => {
    Messenger.maxLetters = p.MaximumLetterCount;
    Messenger.letters = [];
  });
});

EventBus.on('FriendAdded', packet => {
  const p = new FriendAddedPacket(packet);
  const name = cleanName(p.FriendName);
  Messenger.addFriend(name, friendServer(p.ServerId));
  Social.systemMessage(t('friends.added', { name }));
});

EventBus.on('FriendDeleted', packet => {
  const p = new FriendDeletedPacket(packet);
  Messenger.removeFriend(cleanName(p.FriendName));
});

EventBus.on('FriendOnlineStateUpdate', packet => {
  const p = new FriendOnlineStateUpdatePacket(packet);
  Messenger.setFriendState(cleanName(p.FriendName), friendServer(p.ServerId));
});

/** FriendRequest (0xC2): another player wants to add the hero. */
EventBus.on('FriendRequest', packet => {
  const p = new FriendRequestPacket(packet);
  // ReceiveRequestAcceptAddFriend (WSclient.cpp:9786): SOUND_FRIEND_LOGIN_ALERT.
  playSfx('Sound/iFLogInAlert', null, { bus: UI_BUS, channels: 1 });
  runInAction(() => {
    Messenger.friendRequest = { name: cleanName(p.Requester) };
  });
});

/**
 * FriendInvitationResult (C3 0xCB): the answer to ChatRoomInvitationRequest,
 * echoing the RequestId the invite went out with. Anything with an unknown
 * id is kept on the old friend-request path.
 */
EventBus.on('FriendInvitationResult', packet => {
  const p = new FriendInvitationResultPacket(packet);
  if (ChatRooms.inviteResult(p.Success, p.RequestId)) return;
  if (!p.Success) Social.errorMessage(t('friends.requestFailed'));
});

/**
 * ChatRoomConnectionInfo (C3 0xCA): the game server brokered a chat room on
 * the separate chat server and hands over host, room id and token. The
 * packet carries no port; OpenMU's chat server listens on 55980.
 */
EventBus.on('ChatRoomConnectionInfo', packet => {
  const p = new ChatRoomConnectionInfoPacket(packet);
  ChatRooms.onConnectionInfo({
    host: cleanName(p.ChatServerIp),
    roomId: p.ChatRoomId,
    token: p.AuthenticationToken,
    friendName: cleanName(p.FriendName),
    success: p.Success,
  });
});

/** AddLetter (C3 0xC6): one row of the letter box. */
EventBus.on('AddLetter', packet => {
  const p = new AddLetterPacket(packet);
  const isNew = p.State === AddLetterLetterStateEnum.New;
  Messenger.addLetter({
    index: p.LetterIndex,
    sender: cleanName(p.SenderName),
    subject: cleanName(p.Subject),
    timestamp: p.Timestamp.replace(/\0+$/, '').trim(),
    read: p.State === AddLetterLetterStateEnum.Read,
    isNew,
  });
  // `New` means it landed while the hero was online, so it is announced
  // (ReceiveLetter, WSclient.cpp:9925: SOUND_FRIEND_MAIL_ALERT).
  if (isNew) {
    playSfx('Sound/iFMailAlert', null, { bus: UI_BUS, channels: 1 });
    Social.systemMessage(
      t('friends.letterArrived', { name: cleanName(p.SenderName) })
    );
  }
});

/** OpenLetter (C4 0xC7): the body of the letter that was asked for. */
EventBus.on('OpenLetter', packet => {
  const p = new OpenLetterPacket(packet);
  Messenger.setLetterBody(p.LetterIndex, p.Message.replace(/\0+$/, ''));
});

EventBus.on('RemoveLetter', packet => {
  const p = new RemoveLetterPacket(packet);
  if (p.RequestSuccessful) Messenger.removeLetter(p.LetterIndex);
  else Social.errorMessage(t('friends.letterDeleteFailed'));
});

const LETTER_SEND_RESULTS: Record<
  LetterSendResponseLetterSendRequestResultEnum,
  TextKey
> = {
  [LetterSendResponseLetterSendRequestResultEnum.Success]: 'friends.letterSent',
  [LetterSendResponseLetterSendRequestResultEnum.TryAgain]: 'friends.letterTryAgain',
  [LetterSendResponseLetterSendRequestResultEnum.MailboxFull]: 'friends.mailboxFull',
  [LetterSendResponseLetterSendRequestResultEnum.ReceiverNotExists]:
    'friends.noSuchCharacter',
  [LetterSendResponseLetterSendRequestResultEnum.CantSendToYourself]:
    'friends.cannotLetterSelf',
  [LetterSendResponseLetterSendRequestResultEnum.NotEnoughMoney]:
    'friends.letterNeedsZen',
};

EventBus.on('LetterSendResponse', packet => {
  const p = new LetterSendResponsePacket(packet);
  const ok = p.Result === LetterSendResponseLetterSendRequestResultEnum.Success;
  Messenger.sendFinished(ok);
  const text = t(LETTER_SEND_RESULTS[p.Result] ?? 'friends.letterFailed');
  if (ok) Social.systemMessage(text);
  else Social.errorMessage(text);
});
