import { chatEmojiBubbleOf, type ChatEmojiBubble } from './chatEmojis';
import { ChatLineType, classifyInboundChat, cleanName } from './chat';
import { ChatMessageChatMessageTypeEnum, ChatMessagePacket, ObjectMessagePacket, ServerMessagePacket } from '@versions/shared/packets/ServerToClientPackets';
import { EMOJI_CATALOG } from './emojis';
import { matchEmojiBubbleWord, type EmojiBubbleId } from './emojiBubbles';
import { EventBus } from '@/core/eventBus';
import { GameOptions } from '@/controllers/settings';
import { NetStats } from '@/controllers/net/roundTrip';
import { Notices } from './notices';
import { SlideHelp } from '@/controllers/interface/slideHelp';
import { Social } from '../social/social';
import { Hero } from '@/modules/hero';
import { Ecs } from '@/ecs/current';

import { playUiSound } from '@/controllers/sound/sfx';
import { runInAction } from 'mobx';
import { startEmojiBubble } from '@/ecs/systems/emojiBubbleSystem';
import { translateServerText } from '@/i18n/serverText';
import { noteServerLine } from './serverLines';

/**
 * Play an inbound emoji bubble over the player with this name.
 *
 * The hero is skipped: the bubble was popped the moment the wheel was clicked
 * (or the token typed), and the server echoes our own chat back, which would
 * restart the pop-in a round trip late - the same reason ObjectAnimation
 * ignores its own echo.
 */
function popEmojiBubble(name: string, id: EmojiBubbleId | ChatEmojiBubble): void {
  const world = Ecs.world;
  if (!world) return;
  const obj = world.netObjsQuery.entities.find(
    e => e.playerAnimation && e.objectNameInWorld === name
  );
  if (!obj || obj.localPlayer || obj.objOutOfScope) return;
  startEmojiBubble(world, obj, id);
}

/** Raise the GM flag on the player in scope with this name, if any. */
function markAsGm(name: string): void {
  const world = Ecs.world;
  if (!world) return;
  const obj = world.netObjsQuery.entities.find(
    e => e.playerAnimation && e.objectNameInWorld === name
  );
  if (obj && !obj.isGm) world.addComponent(obj, 'isGm', true);
}

/** Registers this module's packet listeners (see ../module.ts). */
export function installNet(): void {
  /**
   * ChatMessage: `ReceiveChat` / `ReceiveChatWhisper` (WSclient.cpp:1435).
   * Party / guild / alliance lines arrive as normal chat with a prefix that
   * picks the log colour; only plain chat (and GM shouts) gets a balloon
   * (`AssignChat`, ZzzInterface.cpp:1183).
   */
  EventBus.on('ChatMessage', packet => {
    const p = new ChatMessagePacket(packet);
    const sender = cleanName(p.Sender);
    // The reader decodes the UTF-8 (core/binaryUtils readWireString): accents and emoji come back whole.
    const message = p.Message.replace(/\0+$/, '');

    // Our own line coming back is the answer to the one we sent: that pair is
    // what the round-trip figure is measured on (controllers/net/roundTrip.ts).
    if (
      p.Type !== ChatMessageChatMessageTypeEnum.Whisper &&
      sender === Hero.name
    ) {
      NetStats.markAnswered('chat');
    }

    if (p.Type === ChatMessageChatMessageTypeEnum.Whisper) {
      // SOUND_WHISPER for an incoming whisper; the name is offered as the next
      // whisper target (`RegistWhisperID`).
      if (Social.blockWhisper) return;
      // `IsWhisperSound()` (NewUIChatLogWindow.cpp:360).
      if (GameOptions.whisperBeep) playUiSound('whisper');
      Social.addChatLine(sender, message, ChatLineType.Whisper);
      runInAction(() => {
        Social.lastWhisperFrom = sender;
      });
      if (!Social.whisperTarget) Social.setWhisperTarget(sender);
      return;
    }

    // OpenMU's `/post` arrives from the pseudo-sender "[POST]" as a Gens-type
    // message; it is a server-wide shout, so it takes the gens colour.
    if (sender === '[POST]') {
      Social.addChatLine(sender, message, ChatLineType.Gens);
      return;
    }

    const { type, text, balloon } = classifyInboundChat(message);
    Social.addChatLine(sender, text, type);

    // A plain chat line that is nothing but an emoji token is a bubble, not
    // speech (modules/chat/emojiBubbles.ts): pop it over the sender and drop the
    // balloon, or the glyph and the text it stands for would sit on top of each
    // other. The log line stays - it is what a client that draws no bubbles
    // shows, and it is what the player actually sent.
    //
    // Only `Chat`: party / guild / gens lines reach members anywhere on the
    // server, and a GM shout is an announcement that has to stay readable.
    const bubble =
      type === ChatLineType.Chat ? matchEmojiBubbleWord(text) : null;
    if (bubble) {
      popEmojiBubble(sender, bubble);
      return;
    }

    // A line of nothing but chat emojis pops the first over the sender, the
    // same way (modules/chat/chatEmojis.ts); a line with words keeps its balloon,
    // which draws the emojis among them.
    if (type === ChatLineType.Chat && GameOptions.chatEmojis) {
      const shown = chatEmojiBubbleOf(text, EMOJI_CATALOG);
      if (shown.bubble) {
        popEmojiBubble(sender, shown.bubble);
        return;
      }
    }

    // `bGmMode` (RenderBoolean): the original reads `CtlCode` off its character
    // structure, which OpenMU never sends. A `#` shout is the one GM signal it
    // does give, so the sender's balloon turns into the GM one from here on.
    if (type === ChatLineType.GM) markAsGm(sender);

    if (!balloon) return;
    EventBus.emit('chatMessage', { sender, message: text, whisper: false });
  });

  EventBus.on('ObjectMessage', packet => {
    const p = new ObjectMessagePacket(packet);
    // What an NPC says over its own head (`IShowMessageOfObjectPlugIn`) is
    // server-built English like every other sentence it sends, so it goes
    // through the same catalogue as `ServerMessage`; unknown text passes through.
    EventBus.emit('objectMessage', {
      netId: p.ObjectId & 0x7fff,
      message: translateServerText(cleanName(p.Message)),
    });
  });

  EventBus.on('ServerMessage', packet => {
    const p = new ServerMessagePacket(packet);
    // The text is server-built; only its packet padding is ours to strip -
    // plus OpenMU's nine-zero prefix (`ShowMessagePlugIn.cs`: "000000000" +
    // message for every Season > 0 client), which the original client skips.
    const text = cleanName(p.Message).replace(/^0{9}/, '');

    // `ReceiveNotice` (WSclient.cpp:1605): 0 = golden notice banner, 1 = the
    // system log line, 2 = guild notice (banner in green + the guild window).
    // 10..15 are the slide-help marquee, which has no window here yet.
    switch (p.Type) {
      case 0:
        Notices.create(translateServerText(text));
        break;
      case 1:
        // OpenMU's only self-defense signal is this blue line
        // (SelfDefensePlugIn.cs); keep the state alongside showing it. It reads
        // the server's English, so it has to run before the line is translated.
        Social.trackSelfDefense(text);
        // An event entry refused right after explains itself from it (serverLines.ts).
        noteServerLine(text);
        Social.systemMessage(translateServerText(text));
        break;
      case 2:
        Notices.createGuildNotice(text);
        Social.systemMessage(text);
        break;
      default:
        if (p.Type >= 10 && p.Type <= 15) {
          // `PRECEIVE_NOTICE` (WSclient.h:471): for the slide types the
          // message is preceded by Count (BYTE), Delay (WORD seconds), Color
          // (DWORD, R + G<<8 + B<<16 + A<<24) and Speed (BYTE, tenths).
          const b = p.buffer;
          const count = b.getUint8(4);
          const delay = b.getUint16(5, true);
          const color = b.getUint32(7, true);
          const speed = b.getUint8(11);
          let end = 12;
          while (end < b.byteLength && b.getUint8(end) !== 0) end++;
          const slideText = new TextDecoder('utf-8').decode(
            new Uint8Array(b.buffer, b.byteOffset + 12, end - 12)
          );
          SlideHelp.add(count, delay, slideText, p.Type - 10, speed / 10, color);
          break;
        }
        console.log(`ServerMessage type ${p.Type}: ${text}`);
        Social.systemMessage(translateServerText(text));
        break;
    }
  });
}
