# party

Party packets from the game server. The party state and the party actions live in the
`Social` store ([../social/readme.md](../social/readme.md)); this folder only has the handlers.

## Public API
- none. `installNet()` in `net.ts` registers its handlers (`module.ts`, installed by `src/app/logic.ts`).

## How it works
- The handlers port `ReceiveParty*` (`WSclient.cpp:6839`) and write into `Social`:
  `partyRequest`, `partyMembers` (via `setPartyMembers`, `removePartyMember`, `setPartyHealth`)
  and `partyWindowEnabled`.
- Joining a party (empty list before, members after) prints a system line and opens the party
  window.
- Outgoing packets are `Social` actions: `partyInvite` (leader-only and five-member checks,
  `CommandParty`), `partyRespond`, `requestPartyList`, `partyKick`, `partyLeave`.

## Packets
- `PartyRequest`: someone invites the hero; sets `Social.partyRequest`.
- `PartyList`: the full member list (name, map, position, health).
- `RemovePartyMember`: removes one member; the hero's own index clears the list.
- `PartyHealthUpdate`: each member's health in tenths.

## Depends on / used by
- uses: `social/social.ts`, `chat/chat.ts` (`cleanName`), `_shared/net_helpers.ts`
  (`playerNameById`), `src/i18n`.
- used by: `src/app/logic.ts`. The window is `versions/shared/ui/windows/party/`; `chat/commands.ts`
  (`/party`) and `mu_helper/loop.ts` read `Social.partyMembers`.

## Change it
- handle a new party packet: add an `EventBus.on(...)` here, keep state in `Social`.
- change what the window shows: `versions/shared/ui/windows/party/index.tsx`.

## Tests
- none yet.
