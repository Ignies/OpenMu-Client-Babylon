# Handle a packet

1. Find the feature it belongs to: party packets in `src/features/party/net.ts`, inventory in
   `src/features/inventory/net.ts`, objects entering view in `src/features/scope/net.ts`, and so on.
2. Write the test first: build the packet bytes, emit them on the event bus, assert the feature's
   state.
3. Add the handler to that `net.ts`:

   ```ts
   EventBus.on('PartyList', p => { ... });
   ```

4. A new feature gets `src/features/<feature>/net.ts` and one import line in `src/app/logic.ts`.
   Order in `logic.ts` is listener order for packets several features handle; keep it.
5. A packet the generated codecs do not know yet: add it to
   `versions/shared/packets/packetsDefinitions/*.xml` and run `bun run generate`.
