// <copyright file="EscrowResult.cs" company="MUnique">
// Licensed under the MIT License. See LICENSE file in the project root for full license information.
// </copyright>

namespace MUnique.OpenMU.GameLogic.Marketplace;

using MUnique.OpenMU.DataModel.Entities;

/// <summary>
/// How an escrow request ended. Sent back to the client as one byte.
/// </summary>
public enum EscrowStatus : byte
{
    Ok = 0,
    BadToken = 1,
    Expired = 2,
    WrongPlayer = 3,
    NotInWorld = 4,
    NoSuchItem = 5,
    NotTradable = 6,
    NoRoom = 7,
    NotEnoughMoney = 8,
    BoxGone = 9,
    MoneyCap = 10,
    Failed = 11,
    NotSold = 12,
}

/// <summary>
/// The answer to an escrow request, as the client sees it.
/// </summary>
/// <param name="Operation">What was asked.</param>
/// <param name="Status">How it ended.</param>
/// <param name="ListingId">The listing the token named.</param>
/// <param name="BoxId">The escrow box that holds, held or will hold the item.</param>
/// <param name="Item">The item that moved, when one did; serialized into the answer.</param>
/// <param name="Amount">Zen that moved: the proceeds collected, the price paid.</param>
public sealed record EscrowResult(EscrowOperation Operation, EscrowStatus Status, Guid ListingId, Guid BoxId, Item? Item, long Amount);
