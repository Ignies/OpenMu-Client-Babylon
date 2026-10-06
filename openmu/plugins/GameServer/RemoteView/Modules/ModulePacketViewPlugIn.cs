// <copyright file="ModulePacketViewPlugIn.cs" company="MUnique">
// Licensed under the MIT License. See LICENSE file in the project root for full license information.
// </copyright>

namespace MUnique.OpenMU.GameServer.RemoteView.Modules;

using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;
using MUnique.OpenMU.GameLogic.Views.Modules;
using MUnique.OpenMU.GameServer.MessageHandler.Modules;
using MUnique.OpenMU.Network;
using MUnique.OpenMU.PlugIns;

/// <summary>
/// Sends a module packet (0xE8) to the client: one module's payload, named by the module's id.
/// </summary>
/// <remarks>
/// Layout: C1 len E8 idLength id payload, or C2 lenHigh lenLow E8 idLength id payload when the frame does not
/// fit 255 bytes: the same rule as the client (src/modules/_api/packetWire.ts).
/// </remarks>
[PlugIn]
[Display(Name = "Module Packet", Description = "Sends a client module a payload from its server half (0xE8).")]
[Guid("a79ca01a-5498-4a66-a8b0-e21c80534ef0")]
public class ModulePacketViewPlugIn : IModulePacketViewPlugIn
{
    private const int MaximumFrame = 0xFFFF;

    /// <summary>`RemotePlayer.Connection` is internal to OpenMU; a plugin outside it reads it once by reflection.</summary>
    private static readonly PropertyInfo ConnectionProperty =
        typeof(RemotePlayer).GetProperty("Connection", BindingFlags.Instance | BindingFlags.NonPublic | BindingFlags.Public)
        ?? throw new MissingMemberException(nameof(RemotePlayer), "Connection");

    private readonly RemotePlayer _player;

    public ModulePacketViewPlugIn(RemotePlayer player) => this._player = player;

    /// <inheritdoc />
    public async ValueTask SendModulePacketAsync(string moduleId, ReadOnlyMemory<byte> payload)
    {
        if (!ModulePacketHandlerPlugIn.IsModuleId(moduleId))
        {
            throw new ArgumentException($"Not a module id: {moduleId}", nameof(moduleId));
        }

        var head = 4 + moduleId.Length + payload.Length <= 0xFF ? 2 : 3;
        var size = head + 2 + moduleId.Length + payload.Length;
        if (size > MaximumFrame)
        {
            throw new ArgumentOutOfRangeException(nameof(payload), $"A module packet of {size} bytes is over {MaximumFrame}.");
        }

        var connection = ConnectionProperty.GetValue(this._player) as IConnection;
        if (connection is null)
        {
            return;
        }

        int Write()
        {
            var span = connection.Output.GetSpan(size)[..size];
            if (head == 2)
            {
                span[0] = 0xC1;
                span[1] = (byte)size;
            }
            else
            {
                span[0] = 0xC2;
                span[1] = (byte)(size >> 8);
                span[2] = (byte)size;
            }

            span[head] = ModulePacketHandlerPlugIn.Code;
            span[head + 1] = (byte)moduleId.Length;
            Encoding.ASCII.GetBytes(moduleId, span.Slice(head + 2, moduleId.Length));
            payload.Span.CopyTo(span[(head + 2 + moduleId.Length)..]);
            return size;
        }

        await connection.SendAsync(Write).ConfigureAwait(false);
    }
}
