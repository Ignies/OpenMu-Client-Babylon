// <copyright file="MarketplaceEscrowResultPlugIn.cs" company="MUnique">
// Licensed under the MIT License. See LICENSE file in the project root for full license information.
// </copyright>

namespace MUnique.OpenMU.GameServer.RemoteView.Marketplace;

using System.Buffers.Binary;
using System.Runtime.InteropServices;
using MUnique.OpenMU.GameLogic.Marketplace;
using MUnique.OpenMU.GameLogic.Views.Marketplace;
using MUnique.OpenMU.GameServer.MessageHandler.Marketplace;
using MUnique.OpenMU.Network;
using MUnique.OpenMU.PlugIns;

/// <summary>
/// Sends the escrow result (C1 E7 02) to the client.
/// </summary>
/// <remarks>
/// Layout: C1 len E7 02 operation(1) status(1) listingId(16) boxId(16) amount(8) itemLength(1) item(itemLength).
/// The item is the serializer's own bytes, so the window shows exactly what the server holds.
/// </remarks>
[PlugIn]
[Display(Name = "Marketplace Escrow Result", Description = "Tells the client how a marketplace escrow request ended.")]
[Guid("5f8a1b2c-3d4e-4f60-8a7b-9c0d1e2f3a13")]
public class MarketplaceEscrowResultPlugIn : IMarketplaceEscrowResultPlugIn
{
    private const byte SubCode = 0x02;
    private const int FixedLength = 4 + 1 + 1 + 16 + 16 + 8 + 1;

    private readonly RemotePlayer _player;

    public MarketplaceEscrowResultPlugIn(RemotePlayer player) => this._player = player;

    /// <inheritdoc />
    public async ValueTask ShowEscrowResultAsync(EscrowResult result)
    {
        var connection = this._player.Connection;
        if (connection is null)
        {
            return;
        }

        int Write()
        {
            var serializer = this._player.ItemSerializer;
            var size = FixedLength + (result.Item is null ? 0 : serializer.NeededSpace);
            var span = connection.Output.GetSpan(size)[..size];
            span.Clear();
            span[0] = 0xC1;
            span[2] = MarketplaceGroupHandler.GroupKey;
            span[3] = SubCode;
            span[4] = (byte)result.Operation;
            span[5] = (byte)result.Status;
            result.ListingId.TryWriteBytes(span.Slice(6, 16));
            result.BoxId.TryWriteBytes(span.Slice(22, 16));
            BinaryPrimitives.WriteInt64LittleEndian(span.Slice(38, 8), result.Amount);
            var itemLength = 0;
            if (result.Item is { } item)
            {
                itemLength = serializer.SerializeItem(span.Slice(FixedLength), item);
            }

            span[46] = (byte)itemLength;
            var actualSize = FixedLength + itemLength;
            span[1] = (byte)actualSize;
            return actualSize;
        }

        await connection.SendAsync(Write).ConfigureAwait(false);
    }
}
