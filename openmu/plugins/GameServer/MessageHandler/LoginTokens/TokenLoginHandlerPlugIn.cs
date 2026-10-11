// <copyright file="TokenLoginHandlerPlugIn.cs" company="MUnique">
// Licensed under the MIT License. See LICENSE file in the project root for full license information.
// </copyright>

namespace MUnique.OpenMU.GameServer.MessageHandler.LoginTokens;

using System.Runtime.InteropServices;
using System.Text;
using MUnique.OpenMU.GameLogic;
using MUnique.OpenMU.GameLogic.LoginTokens;
using MUnique.OpenMU.GameServer.MessageHandler.Marketplace;
using MUnique.OpenMU.GameServer.RemoteView;
using MUnique.OpenMU.Network;
using MUnique.OpenMU.Network.Packets;
using MUnique.OpenMU.Network.Xor;
using MUnique.OpenMU.PlugIns;

/// <summary>
/// Handler for the token login (C3 33 E7 05), which the web client sends instead of the login packet.
/// </summary>
/// <remarks>
/// Layout: C3 33 E7 05 username(10, Xor3 as in the login) token(32) clientVersion(5). A C3 like the login, so it
/// arrives through the same SimpleModulus decryption; a C1 copy is dropped (<see cref="IsEncryptionExpected"/>).
/// </remarks>
[PlugIn]
[Display(Name = "Token Login Handler", Description = "Logs the web client in with the token of its saved login, as OpenMU's login does with a password.")]
[Guid("ba642eb7-9bdf-4cf5-82da-cb7c6c72dd5a")]
[BelongsToGroup(MarketplaceGroupHandler.GroupKey)]
internal class TokenLoginHandlerPlugIn : ISubPacketHandlerPlugIn
{
    private const int Length = 51;

    private readonly ISpanDecryptor _decryptor = new Xor3Decryptor(0);

    private readonly LoginTokenAction _action = new();

    /// <inheritdoc />
    public bool IsEncryptionExpected => true;

    /// <inheritdoc />
    public byte Key => 0x05;

    /// <inheritdoc />
    public async ValueTask HandlePacketAsync(Player player, Memory<byte> packet)
    {
        if (packet.Length < Length)
        {
            return;
        }

        var username = this.ReadName(packet.Span.Slice(4, 10));
        var token = packet.Span.Slice(14, LoginTokenStore.TokenLength).ToArray();
        var version = ClientVersionResolver.Resolve(packet.Span.Slice(46, 5));

        await this._action.LoginAsync(player, username, token).ConfigureAwait(false);
        if (player is RemotePlayer remotePlayer)
        {
            // As OpenMU's login handler: the version picks the view plugins from here on.
            remotePlayer.ClientVersion = version;
        }
    }

    private string ReadName(Span<byte> name)
    {
        this._decryptor.Decrypt(name);
        return name.ExtractString(0, name.Length, Encoding.UTF8);
    }
}
