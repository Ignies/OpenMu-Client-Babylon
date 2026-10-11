// <copyright file="MarketplaceGroupHandler.cs" company="MUnique">
// Licensed under the MIT License. See LICENSE file in the project root for full license information.
// </copyright>

namespace MUnique.OpenMU.GameServer.MessageHandler.Marketplace;

using System.Reflection;
using System.Runtime.InteropServices;
using Microsoft.Extensions.Logging;
using MUnique.OpenMU.GameLogic;
using MUnique.OpenMU.PlugIns;

/// <summary>
/// Packet group 0xE7, ours: the marketplace escrow (01, 02) and the login tokens (03 to 05). Unused by the original protocol in either direction.
/// The same dispatch as OpenMU's internal <c>GroupPacketHandlerPlugIn</c>, which a plugin outside OpenMU cannot extend.
/// </summary>
[PlugIn]
[Display(Name = "Marketplace Group Handler", Description = "Handles our packet group 0xE7: the marketplace escrow and the login tokens.")]
[Guid("3c6d0a5e-8f7b-4e31-9d2a-6b1f5c0e7a11")]
internal class MarketplaceGroupHandler : PacketHandlerPlugInContainer<ISubPacketHandlerPlugIn>, IPacketHandlerPlugIn
{
    /// <summary>The packet code of the group.</summary>
    internal const byte GroupKey = 0xE7;

    public MarketplaceGroupHandler(IClientVersionProvider clientVersionProvider, PlugInManager manager, ILoggerFactory loggerFactory)
        : base(clientVersionProvider, manager, loggerFactory)
    {
        // OpenMU's CreatePlugIn initializes only its own GroupPacketHandlerPlugIn; without this the group has no sub-handlers.
        this.Initialize();
    }

    /// <inheritdoc />
    public bool IsEncryptionExpected => false;

    /// <inheritdoc />
    public byte Key => GroupKey;

    /// <inheritdoc />
    public async ValueTask HandlePacketAsync(Player player, Memory<byte> packet)
    {
        var subTypeIndex = packet.Span[0] % 2 == 1 ? 3 : 4;
        await this.HandlePacketAsync(player, packet, this[packet.Span[subTypeIndex]]).ConfigureAwait(false);
    }

    /// <inheritdoc />
    protected override void BeforeActivatePlugInType(Type plugInType)
    {
        if (plugInType.GetCustomAttribute<BelongsToGroupAttribute>()?.GroupKey == GroupKey)
        {
            base.BeforeActivatePlugInType(plugInType);
        }
    }
}
