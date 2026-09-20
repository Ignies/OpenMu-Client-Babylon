// <copyright file="MarketplaceGroupHandler.cs" company="MUnique">
// Licensed under the MIT License. See LICENSE file in the project root for full license information.
// </copyright>

namespace MUnique.OpenMU.GameServer.MessageHandler.Marketplace;

using System.Runtime.InteropServices;
using Microsoft.Extensions.Logging;
using MUnique.OpenMU.PlugIns;

/// <summary>
/// Packet group 0xE7: the marketplace escrow. Unused by the original protocol in either direction.
/// </summary>
[PlugIn]
[Display(Name = "Marketplace Group Handler", Description = "Handles the marketplace escrow packets (0xE7).")]
[Guid("3c6d0a5e-8f7b-4e31-9d2a-6b1f5c0e7a11")]
internal class MarketplaceGroupHandler : GroupPacketHandlerPlugIn
{
    /// <summary>The packet code of the group.</summary>
    internal const byte GroupKey = 0xE7;

    public MarketplaceGroupHandler(IClientVersionProvider clientVersionProvider, PlugInManager manager, ILoggerFactory loggerFactory)
        : base(clientVersionProvider, manager, loggerFactory)
    {
    }

    /// <inheritdoc />
    public override bool IsEncryptionExpected => false;

    /// <inheritdoc />
    public override byte Key => GroupKey;
}
