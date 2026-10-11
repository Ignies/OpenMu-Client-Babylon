// <copyright file="LoginTokenViewPlugIn.cs" company="MUnique">
// Licensed under the MIT License. See LICENSE file in the project root for full license information.
// </copyright>

namespace MUnique.OpenMU.GameServer.RemoteView.LoginTokens;

using System.Reflection;
using System.Runtime.InteropServices;
using MUnique.OpenMU.GameLogic.LoginTokens;
using MUnique.OpenMU.GameLogic.Views.LoginTokens;
using MUnique.OpenMU.GameServer.MessageHandler.Marketplace;
using MUnique.OpenMU.Network;
using MUnique.OpenMU.PlugIns;

/// <summary>
/// Sends a login token to the web client.
/// </summary>
/// <remarks>Layout: C1 25 E7 04 status(1) token(32); the token is zeros unless the status is Ok.</remarks>
[PlugIn]
[Display(Name = "Login Token", Description = "Hands the web client a login token for its saved login.")]
[Guid("e6b44379-6df9-49aa-ae55-4c96f5c6e891")]
public class LoginTokenViewPlugIn : ILoginTokenViewPlugIn
{
    private const byte SubCode = 0x04;
    private const int Size = 5 + LoginTokenStore.TokenLength;

    /// <summary>`RemotePlayer.Connection` is internal to OpenMU; a plugin outside it reads it once by reflection.</summary>
    private static readonly PropertyInfo ConnectionProperty =
        typeof(RemotePlayer).GetProperty("Connection", BindingFlags.Instance | BindingFlags.NonPublic | BindingFlags.Public)
        ?? throw new MissingMemberException(nameof(RemotePlayer), "Connection");

    private readonly RemotePlayer _player;

    public LoginTokenViewPlugIn(RemotePlayer player) => this._player = player;

    /// <inheritdoc />
    public async ValueTask SendLoginTokenAsync(LoginTokenStatus status, ReadOnlyMemory<byte> token)
    {
        if (ConnectionProperty.GetValue(this._player) is not IConnection connection)
        {
            return;
        }

        int Write()
        {
            var span = connection.Output.GetSpan(Size)[..Size];
            span.Clear();
            span[0] = 0xC1;
            span[1] = Size;
            span[2] = MarketplaceGroupHandler.GroupKey;
            span[3] = SubCode;
            span[4] = (byte)status;
            if (status == LoginTokenStatus.Ok && token.Length == LoginTokenStore.TokenLength)
            {
                token.Span.CopyTo(span[5..]);
            }

            return Size;
        }

        await connection.SendAsync(Write).ConfigureAwait(false);
    }
}
