// <copyright file="ModulePacketHandlerPlugIn.cs" company="MUnique">
// Licensed under the MIT License. See LICENSE file in the project root for full license information.
// </copyright>

namespace MUnique.OpenMU.GameServer.MessageHandler.Modules;

using System.Collections.Concurrent;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;
using MUnique.OpenMU.GameLogic;
using MUnique.OpenMU.GameLogic.Modules;
using MUnique.OpenMU.PlugIns;

/// <summary>
/// The module packet (0xE8): one client module's payload, named by the module's id. Unused by OpenMU and the
/// original protocol in either direction. The payload goes to the <see cref="IModulePacketPlugIn"/> registered
/// for that id, found the way OpenMU finds chat commands (<c>PlugInManager.GetStrategy</c>).
/// </summary>
/// <remarks>
/// Layout: C1 len E8 idLength id payload, or C2 lenHigh lenLow E8 idLength id payload
/// (the client's src/modules/_api/packetWire.ts). A frame for an id with no plugin is dropped.
/// </remarks>
[PlugIn]
[Display(Name = "Module Packet Handler", Description = "Hands module packets (0xE8) to the plugin of the module they name.")]
[Guid("efc4f74e-7be6-448b-802b-977cabb17b08")]
internal class ModulePacketHandlerPlugIn : IPacketHandlerPlugIn
{
    /// <summary>The packet code of module packets, the same in both directions.</summary>
    internal const byte Code = 0xE8;

    /// <summary>How many ids without a plugin are logged, so a client cannot grow the set.</summary>
    private const int MaximumReported = 64;

    /// <summary>The client's module id rule (src/modules/_api/contract.ts, MODULE_ID).</summary>
    private static readonly Regex ModuleId = new("^[a-z][a-z0-9_]{0,39}$", RegexOptions.Compiled);

    /// <summary>The ids already logged as having no plugin: each is logged once.</summary>
    private static readonly ConcurrentDictionary<string, bool> Reported = new();

    /// <summary>The states before the world and after it; every other state is in the world (trade, dialogs, dead).</summary>
    private static readonly HashSet<State> OutsideTheWorld =
    [
        PlayerState.Initial, PlayerState.LoginScreen, PlayerState.Authenticated, PlayerState.CharacterSelection,
        PlayerState.Disconnected, PlayerState.Finished,
    ];

    /// <inheritdoc />
    public bool IsEncryptionExpected => false;

    /// <inheritdoc />
    public byte Key => Code;

    /// <summary>Whether <paramref name="id"/> is a module id the client can name.</summary>
    internal static bool IsModuleId(string id) => ModuleId.IsMatch(id);

    /// <inheritdoc />
    public async ValueTask HandlePacketAsync(Player player, Memory<byte> packet)
    {
        if (OutsideTheWorld.Contains(player.PlayerState.CurrentState))
        {
            // A module belongs to a character in the world; before that its packets are dropped unread.
            return;
        }

        var head = packet.Span[0] % 2 == 1 ? 2 : 3;
        if (packet.Length < head + 2)
        {
            return;
        }

        var payloadStart = head + 2 + packet.Span[head + 1];
        if (payloadStart > packet.Length)
        {
            return;
        }

        var id = Encoding.ASCII.GetString(packet.Span[(head + 2)..payloadStart]);
        if (!IsModuleId(id))
        {
            return;
        }

        if (player.GameContext.PlugInManager.GetStrategy<IModulePacketPlugIn>(id) is not { } plugIn)
        {
            if (Reported.Count < MaximumReported && Reported.TryAdd(id, true))
            {
                player.Logger.LogWarning("Module packet for {ModuleId} dropped: no module packet plugin has that id.", id);
            }

            return;
        }

        await plugIn.HandlePacketAsync(player, packet[payloadStart..]).ConfigureAwait(false);
    }
}
