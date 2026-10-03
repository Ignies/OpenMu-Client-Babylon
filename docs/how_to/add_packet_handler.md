# Handle a packet

1. Find the module it belongs to: party packets in `src/modules/party/net.ts`, inventory in
   `src/modules/inventory/net.ts`, objects entering view in `src/modules/scope/net.ts`, and so on.
2. Write the test first: build the packet bytes, emit them on the event bus, assert the module's
   state.
3. Add the handler to that `net.ts`:

   ```ts
   EventBus.on('PartyList', p => { ... });
   ```

4. A new module gets `src/modules/<module>/net.ts` (`installNet`), a `module.ts` and one line in `src/modules/modules.ts`.
   Order in `modules.ts` is listener order for packets several modules handle; keep it.
5. A packet the generated codecs do not know yet: add it to
   `versions/shared/packets/packetsDefinitions/*.xml` and run `bun run generate`.
