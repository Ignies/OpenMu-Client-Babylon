// <copyright file="EscrowToken.cs" company="MUnique">
// Licensed under the MIT License. See LICENSE file in the project root for full license information.
// </copyright>

namespace MUnique.OpenMU.GameLogic.Marketplace;

using System.Buffers.Binary;
using System.Security.Cryptography;
using System.Text;

/// <summary>
/// What the marketplace escrow can be asked to do.
/// </summary>
public enum EscrowOperation : byte
{
    /// <summary>Move an item from the seller's bag into a new escrow box.</summary>
    List = 1,

    /// <summary>Move an item from its escrow box back into the seller's bag.</summary>
    Cancel = 2,

    /// <summary>Take the price from the buyer, move the item into the buyer's bag, leave the proceeds in the box.</summary>
    Buy = 3,

    /// <summary>Move the proceeds of sold boxes into the seller's wallet.</summary>
    Collect = 4,
}

/// <summary>
/// An instruction minted by the marketplace service and signed with the secret it shares
/// with this plugin (MARKETPLACE_ESCROW_SECRET). The client relays it verbatim; the plugin
/// trusts nothing but the signature, the expiry, and the player it is talking to.
/// </summary>
/// <remarks>
/// Layout, little endian:
///   version(1) op(1) expiresAt(8) listingId(16) boxId(16) itemId(16) amount(8) fee(8)
///   slot(1) accountLen(1) account(n) characterLen(1) character(n) hmac(32)
/// </remarks>
public sealed class EscrowToken
{
    private const byte Version = 1;
    private const int MacLength = 32;
    private const int FixedLength = 1 + 1 + 8 + 16 + 16 + 16 + 8 + 8 + 1;

    private EscrowToken()
    {
    }

    public EscrowOperation Operation { get; private set; }

    public DateTimeOffset ExpiresAt { get; private set; }

    public Guid ListingId { get; private set; }

    public Guid BoxId { get; private set; }

    public Guid ItemId { get; private set; }

    /// <summary>The price on Buy and List, the amount on Collect.</summary>
    public long Amount { get; private set; }

    /// <summary>The listing fee on List, the commission on Buy.</summary>
    public long Fee { get; private set; }

    public byte Slot { get; private set; }

    public string Account { get; private set; } = string.Empty;

    public string Character { get; private set; } = string.Empty;

    /// <summary>
    /// Parses and verifies a token. Returns null when the bytes are malformed or the signature is wrong.
    /// The expiry is left to the caller so it can answer with a distinct status.
    /// </summary>
    public static EscrowToken? TryParse(ReadOnlySpan<byte> data, byte[] secret)
    {
        if (data.Length < FixedLength + 2 + MacLength || data[0] != Version)
        {
            return null;
        }

        var body = data[..^MacLength];
        var mac = data[^MacLength..];
        Span<byte> expected = stackalloc byte[MacLength];
        HMACSHA256.HashData(secret, body, expected);
        if (!CryptographicOperations.FixedTimeEquals(mac, expected))
        {
            return null;
        }

        var offset = 1;
        var token = new EscrowToken { Operation = (EscrowOperation)body[offset++] };
        token.ExpiresAt = DateTimeOffset.FromUnixTimeSeconds(BinaryPrimitives.ReadInt64LittleEndian(body.Slice(offset, 8)));
        offset += 8;
        token.ListingId = new Guid(body.Slice(offset, 16));
        offset += 16;
        token.BoxId = new Guid(body.Slice(offset, 16));
        offset += 16;
        token.ItemId = new Guid(body.Slice(offset, 16));
        offset += 16;
        token.Amount = BinaryPrimitives.ReadInt64LittleEndian(body.Slice(offset, 8));
        offset += 8;
        token.Fee = BinaryPrimitives.ReadInt64LittleEndian(body.Slice(offset, 8));
        offset += 8;
        token.Slot = body[offset++];

        var accountLength = body[offset++];
        if (accountLength > 10 || offset + accountLength + 1 > body.Length)
        {
            return null;
        }

        token.Account = Encoding.ASCII.GetString(body.Slice(offset, accountLength));
        offset += accountLength;
        var characterLength = body[offset++];
        if (characterLength > 10 || offset + characterLength != body.Length)
        {
            return null;
        }

        token.Character = Encoding.ASCII.GetString(body.Slice(offset, characterLength));
        return token;
    }
}
