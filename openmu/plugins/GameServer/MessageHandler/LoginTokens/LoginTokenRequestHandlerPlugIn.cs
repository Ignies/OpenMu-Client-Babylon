// <copyright file="LoginTokenRequestHandlerPlugIn.cs" company="MUnique">
// Licensed under the MIT License. See LICENSE file in the project root for full license information.
// </copyright>

namespace MUnique.OpenMU.GameServer.MessageHandler.LoginTokens;

using System.Runtime.InteropServices;
using MUnique.OpenMU.GameLogic;
using MUnique.OpenMU.GameLogic.LoginTokens;
using MUnique.OpenMU.GameServer.MessageHandler.Marketplace;
using MUnique.OpenMU.PlugIns;

/// <summary>
/// Handler for the login token request (C1 04 E7 03), sent by the web client at the character list after a password login.
/// </summary>
[PlugIn]
[Display(Name = "Login Token Request Handler", Description = "Issues the web client a login token for its saved login.")]
[Guid("61084ea8-5d68-42b1-a434-404d393f2158")]
[BelongsToGroup(MarketplaceGroupHandler.GroupKey)]
internal class LoginTokenRequestHandlerPlugIn : ISubPacketHandlerPlugIn
{
    private readonly LoginTokenAction _action = new();

    /// <inheritdoc />
    public bool IsEncryptionExpected => false;

    /// <inheritdoc />
    public byte Key => 0x03;

    /// <inheritdoc />
    public ValueTask HandlePacketAsync(Player player, Memory<byte> packet) => this._action.IssueAsync(player);
}
