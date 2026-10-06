// <copyright file="IModulePacketPlugIn.cs" company="MUnique">
// Licensed under the MIT License. See LICENSE file in the project root for full license information.
// </copyright>

namespace MUnique.OpenMU.GameLogic.Modules;

using System.Runtime.InteropServices;
using MUnique.OpenMU.PlugIns;

/// <summary>
/// The server half of a client module: handles the module packets (0xE8) its client half sends. Found by
/// the module's id (<see cref="IStrategyPlugIn{TKey}.Key"/>), the same id the client's module API uses.
/// It answers through <see cref="Views.Modules.IModulePacketViewPlugIn"/>.
/// </summary>
[Guid("01cb2242-e2d9-4da5-b051-e55ab44307e9")]
[PlugInPoint("Module packets", "The server half of a client module, by the module's id: handles the module packets (0xE8) its client half sends.")]
public interface IModulePacketPlugIn : IStrategyPlugIn<string>
{
    /// <summary>
    /// Handles one payload from the player's client.
    /// </summary>
    /// <param name="player">The player whose client sent it.</param>
    /// <param name="payload">The payload: what follows the module id in the frame.</param>
    ValueTask HandlePacketAsync(Player player, ReadOnlyMemory<byte> payload);
}
