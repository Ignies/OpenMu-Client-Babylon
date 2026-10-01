// <copyright file="MarketplaceEscrowRequestHandlerPlugIn.cs" company="MUnique">
// Licensed under the MIT License. See LICENSE file in the project root for full license information.
// </copyright>

namespace MUnique.OpenMU.GameServer.MessageHandler.Marketplace;

using System.Runtime.InteropServices;
using MUnique.OpenMU.GameLogic;
using MUnique.OpenMU.GameLogic.Marketplace;
using MUnique.OpenMU.PlugIns;

/// <summary>
/// Handler for the escrow request (C1 E7 01): the payload is a token minted by the
/// marketplace service, relayed by the client untouched.
/// </summary>
[PlugIn]
[Display(Name = "Marketplace Escrow Request Handler", Description = "Lists, cancels, buys and collects marketplace listings through escrow boxes.")]
[Guid("9b4e2f70-1c3d-4a8e-b6f5-2d7c8e9a0b12")]
[BelongsToGroup(MarketplaceGroupHandler.GroupKey)]
internal class MarketplaceEscrowRequestHandlerPlugIn : ISubPacketHandlerPlugIn
{
    /// <summary>The sub code of the request.</summary>
    internal const byte SubCode = 0x01;

    private const int HeaderLength = 4;

    private readonly MarketplaceEscrowAction _action = new();

    /// <inheritdoc />
    public bool IsEncryptionExpected => false;

    /// <inheritdoc />
    public byte Key => SubCode;

    /// <inheritdoc />
    public async ValueTask HandlePacketAsync(Player player, Memory<byte> packet)
    {
        if (packet.Length <= HeaderLength)
        {
            return;
        }

        await this._action.HandleAsync(player, packet[HeaderLength..]).ConfigureAwait(false);
    }
}
