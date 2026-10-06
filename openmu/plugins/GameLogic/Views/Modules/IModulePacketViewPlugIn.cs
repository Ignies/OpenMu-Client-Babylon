// <copyright file="IModulePacketViewPlugIn.cs" company="MUnique">
// Licensed under the MIT License. See LICENSE file in the project root for full license information.
// </copyright>

namespace MUnique.OpenMU.GameLogic.Views.Modules;

/// <summary>
/// View plugin which sends one module of the player's client a payload from its server half (0xE8).
/// </summary>
public interface IModulePacketViewPlugIn : IViewPlugIn
{
    /// <summary>
    /// Sends a payload to module <paramref name="moduleId"/> of this player's client.
    /// </summary>
    /// <param name="moduleId">The module's id: lower case letters, digits and '_', at most 40, starting with a letter.</param>
    /// <param name="payload">The payload: at most 65535 bytes for the whole frame (5 + the id's length + the payload).</param>
    ValueTask SendModulePacketAsync(string moduleId, ReadOnlyMemory<byte> payload);
}
