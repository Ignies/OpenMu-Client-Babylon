// <copyright file="IMarketplaceEscrowResultPlugIn.cs" company="MUnique">
// Licensed under the MIT License. See LICENSE file in the project root for full license information.
// </copyright>

namespace MUnique.OpenMU.GameLogic.Views.Marketplace;

using MUnique.OpenMU.GameLogic.Marketplace;

/// <summary>
/// View plugin which tells the client how a marketplace escrow request ended.
/// </summary>
public interface IMarketplaceEscrowResultPlugIn : IViewPlugIn
{
    /// <summary>
    /// Sends the result of an escrow request.
    /// </summary>
    /// <param name="result">The result.</param>
    ValueTask ShowEscrowResultAsync(EscrowResult result);
}
