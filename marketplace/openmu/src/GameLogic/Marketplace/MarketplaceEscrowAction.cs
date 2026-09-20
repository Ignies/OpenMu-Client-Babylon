// <copyright file="MarketplaceEscrowAction.cs" company="MUnique">
// Licensed under the MIT License. See LICENSE file in the project root for full license information.
// </copyright>

namespace MUnique.OpenMU.GameLogic.Marketplace;

using System.Collections;
using System.Reflection;
using System.Text;
using Microsoft.Extensions.Logging;
using MUnique.OpenMU.DataModel;
using MUnique.OpenMU.DataModel.Configuration;
using MUnique.OpenMU.DataModel.Configuration.Items;
using MUnique.OpenMU.DataModel.Entities;
using MUnique.OpenMU.GameLogic.Views.Inventory;
using MUnique.OpenMU.GameLogic.Views.Marketplace;
using MUnique.OpenMU.Persistence;

/// <summary>
/// Moves items and Zen between a player and marketplace escrow boxes.
/// </summary>
/// <remarks>
/// An escrow box is a plain <see cref="ItemStorage"/> row owned by no account. Every move
/// happens inside the acting player's own persistence context and lands with one
/// <see cref="Player.SaveProgressAsync"/>, so the item row changes owner in a single
/// transaction and nothing is ever written to an account whose live state somebody else holds.
/// The marketplace service reads the outcome back from the database; this code never calls it.
/// </remarks>
public class MarketplaceEscrowAction
{
    private const int MaximumMoney = 2_000_000_000;

    private static readonly byte[] Secret = ReadSecret();

    private static readonly PropertyInfo? StorageIdProperty = FindStorageIdProperty();

    /// <summary>
    /// Runs the operation the token names, after checking the token against the player.
    /// </summary>
    /// <param name="player">The player who sent the token.</param>
    /// <param name="tokenBytes">The token, as minted by the marketplace service.</param>
    public async ValueTask HandleAsync(Player player, ReadOnlyMemory<byte> tokenBytes)
    {
        var token = EscrowToken.TryParse(tokenBytes.Span, Secret);
        if (token is null)
        {
            await this.AnswerAsync(player, new EscrowResult(EscrowOperation.List, EscrowStatus.BadToken, Guid.Empty, Guid.Empty, null, 0)).ConfigureAwait(false);
            return;
        }

        var refusal = this.Check(player, token);
        if (refusal is { } status)
        {
            await this.AnswerAsync(player, new EscrowResult(token.Operation, status, token.ListingId, token.BoxId, null, 0)).ConfigureAwait(false);
            return;
        }

        EscrowResult result;
        try
        {
            result = token.Operation switch
            {
                EscrowOperation.List => await this.ListAsync(player, token).ConfigureAwait(false),
                EscrowOperation.Cancel => await this.TakeOutAsync(player, token, 0).ConfigureAwait(false),
                EscrowOperation.Buy => await this.TakeOutAsync(player, token, (int)token.Amount).ConfigureAwait(false),
                EscrowOperation.Collect => await this.CollectAsync(player, token).ConfigureAwait(false),
                _ => new EscrowResult(token.Operation, EscrowStatus.BadToken, token.ListingId, token.BoxId, null, 0),
            };
        }
        catch (Exception ex)
        {
            player.Logger.LogError(ex, "Marketplace escrow {Operation} failed for {Player}, listing {ListingId}", token.Operation, player, token.ListingId);
            result = new EscrowResult(token.Operation, EscrowStatus.Failed, token.ListingId, token.BoxId, null, 0);
        }

        await this.AnswerAsync(player, result).ConfigureAwait(false);
    }

    private static byte[] ReadSecret()
    {
        var configured = Environment.GetEnvironmentVariable("MARKETPLACE_ESCROW_SECRET");
        if (string.IsNullOrEmpty(configured))
        {
            // Without a secret no token can ever verify, so the escrow is simply off.
            return Array.Empty<byte>();
        }

        return Encoding.UTF8.GetBytes(configured);
    }

    private static PropertyInfo? FindStorageIdProperty()
    {
        var persistedItemType = AppDomain.CurrentDomain.GetAssemblies()
            .Where(a => a.GetName().Name == "MUnique.OpenMU.Persistence.EntityFramework")
            .SelectMany(a => a.GetTypes())
            .FirstOrDefault(t => t.Name == nameof(Item) && t.IsSubclassOf(typeof(Item)));
        return persistedItemType?.GetProperty("ItemStorageId");
    }

    private static bool IsBagSlot(byte slot)
        => slot >= InventoryConstants.EquippableSlotsCount && slot < InventoryConstants.FirstStoreItemSlotIndex;

    private static bool HasId(object entity, Guid expected)
        => entity is IIdentifiable identifiable && identifiable.Id == expected;

    /// <summary>
    /// The storage an item row points at, read straight off the persistence model. This is the
    /// one fact every move is decided on, because a deleted box cascades to whatever points at it.
    /// </summary>
    private static Guid? StorageIdOf(Item item)
        => StorageIdProperty?.GetValue(item) as Guid?;

    private static T? SameAs<T>(IEnumerable<T> pool, T? instance)
        where T : class
    {
        if (instance is not IIdentifiable wanted)
        {
            return instance;
        }

        return pool.FirstOrDefault(candidate => candidate is IIdentifiable id && id.Id == wanted.Id) ?? instance;
    }

    /// <summary>
    /// The typed loader hands back shallow copies of configuration rows. The game compares those by
    /// reference, so every one is swapped for the instance the game configuration already holds.
    /// </summary>
    private static void Rehome(Item item, GameConfiguration configuration)
    {
        if (item.Definition is { } definition)
        {
            item.Definition = SameAs(configuration.Items, definition);
        }

        var options = configuration.ItemOptions.SelectMany(o => o.PossibleOptions).ToList();
        foreach (var link in item.ItemOptions)
        {
            if (link.ItemOption is { } option)
            {
                link.ItemOption = SameAs(options, option);
            }
        }

        if (item.GetType().GetProperty("JoinedItemSetGroups")?.GetValue(item) is not IEnumerable joins)
        {
            return;
        }

        var setItems = configuration.ItemSetGroups.SelectMany(g => g.Items).ToList();
        foreach (var join in joins)
        {
            var property = join.GetType().GetProperty("ItemOfItemSet");
            if (property?.GetValue(join) is ItemOfItemSet current)
            {
                property.SetValue(join, SameAs(setItems, current));
            }
        }
    }

    private EscrowStatus? Check(Player player, EscrowToken token)
    {
        if (Secret.Length == 0 || StorageIdProperty is null)
        {
            return EscrowStatus.BadToken;
        }

        if (token.ExpiresAt < DateTimeOffset.UtcNow)
        {
            return EscrowStatus.Expired;
        }

        if (player.Account?.LoginName is not { } account
            || player.SelectedCharacter?.Name is not { } character
            || !account.Equals(token.Account, StringComparison.OrdinalIgnoreCase)
            || !character.Equals(token.Character, StringComparison.Ordinal))
        {
            return EscrowStatus.WrongPlayer;
        }

        if (player.PlayerState.CurrentState != PlayerState.EnteredWorld
            || player.Inventory is null
            || player.ShopStorage?.StoreOpen == true)
        {
            return EscrowStatus.NotInWorld;
        }

        return null;
    }

    /// <summary>
    /// Loads the box with its items and hands the graph to the player's context, the way a trade
    /// hands items over. A context rooted at <see cref="ItemStorage"/> is the one kind that reads
    /// player items by id: the configuration-aware contexts answer <see cref="Item"/> lookups from
    /// the merchant stores only, and a player's account context leaves the collection empty.
    /// </summary>
    private async ValueTask<(ItemStorage? Box, Item? Item)> AdoptAsync(Player player, EscrowToken token)
    {
        var configuration = player.GameContext.Configuration;
        using var loader = player.GameContext.PersistenceContextProvider.CreateNewTypedContext(typeof(ItemStorage), true, configuration);
        var box = await loader.GetByIdAsync<ItemStorage>(token.BoxId).ConfigureAwait(false);
        if (box is null)
        {
            return (null, null);
        }

        var item = token.ItemId == Guid.Empty ? null : box.Items.FirstOrDefault(i => HasId(i, token.ItemId));
        if (item is not null && StorageIdOf(item) != token.BoxId)
        {
            item = null;
        }

        loader.Detach(box);
        foreach (var boxed in box.Items)
        {
            loader.Detach(boxed);
            Rehome(boxed, configuration);
        }

        player.PersistenceContext.Attach(box);
        return (box, item);
    }

    private async ValueTask<EscrowResult> ListAsync(Player player, EscrowToken token)
    {
        var inventory = player.Inventory!;
        if (!IsBagSlot(token.Slot) || inventory.GetItem(token.Slot) is not { } item)
        {
            return new EscrowResult(token.Operation, EscrowStatus.NoSuchItem, token.ListingId, token.BoxId, null, 0);
        }

        if (item.Definition is null || item.Definition.IsBoundToCharacter)
        {
            return new EscrowResult(token.Operation, EscrowStatus.NotTradable, token.ListingId, token.BoxId, null, 0);
        }

        if (token.Fee < 0 || token.Fee > MaximumMoney || player.Money < token.Fee)
        {
            return new EscrowResult(token.Operation, EscrowStatus.NotEnoughMoney, token.ListingId, token.BoxId, null, 0);
        }

        var context = player.PersistenceContext;
        var box = context.CreateNew<ItemStorage>();
        if (box is IIdentifiable identifiable)
        {
            // The service minted the box id before the move, so a box it never hears about is still findable.
            identifiable.Id = token.BoxId;
        }

        var slot = item.ItemSlot;
        await inventory.RemoveItemAsync(item).ConfigureAwait(false);
        item.ItemSlot = 0;
        box.Items.Add(item);
        var fee = (int)token.Fee;
        player.Money -= fee;

        if (!await player.SaveProgressAsync().ConfigureAwait(false))
        {
            // Nothing reached the database; put everything back the way it was.
            box.Items.Remove(item);
            await inventory.AddItemAsync(slot, item).ConfigureAwait(false);
            player.Money += fee;
            await context.DeleteAsync(box).ConfigureAwait(false);
            return new EscrowResult(token.Operation, EscrowStatus.Failed, token.ListingId, token.BoxId, null, 0);
        }

        await player.InvokeViewPlugInAsync<IItemRemovedPlugIn>(p => p.RemoveItemAsync(slot)).ConfigureAwait(false);

        // The box is not this player's any more: another session may move its item or its money
        // while this one is still logged in, and a tracked stale copy would write over that.
        context.Detach(item);
        context.Detach(box);
        return new EscrowResult(token.Operation, EscrowStatus.Ok, token.ListingId, token.BoxId, item, fee);
    }

    /// <summary>
    /// Cancel and buy are the same move: the item leaves the box for the player's bag. A buy also
    /// pays, and leaves the seller's share in the box.
    /// </summary>
    private async ValueTask<EscrowResult> TakeOutAsync(Player player, EscrowToken token, int price)
    {
        if (price < 0 || token.Amount > MaximumMoney || token.Fee < 0 || token.Fee > token.Amount || token.ItemId == Guid.Empty)
        {
            return new EscrowResult(token.Operation, EscrowStatus.BadToken, token.ListingId, token.BoxId, null, 0);
        }

        if (player.Money < price)
        {
            return new EscrowResult(token.Operation, EscrowStatus.NotEnoughMoney, token.ListingId, token.BoxId, null, 0);
        }

        var context = player.PersistenceContext;
        var (box, item) = await this.AdoptAsync(player, token).ConfigureAwait(false);
        if (box is null || item is null)
        {
            if (box is not null)
            {
                context.Detach(box);
            }

            return new EscrowResult(token.Operation, EscrowStatus.BoxGone, token.ListingId, token.BoxId, null, 0);
        }

        var inventory = player.Inventory!;
        if (inventory.CheckInvSpace(item) is null)
        {
            context.Detach(box);
            return new EscrowResult(token.Operation, EscrowStatus.NoRoom, token.ListingId, token.BoxId, null, 0);
        }

        box.Items.Remove(item);
        if (!await inventory.AddItemAsync(item).ConfigureAwait(false))
        {
            box.Items.Add(item);
            context.Detach(box);
            return new EscrowResult(token.Operation, EscrowStatus.NoRoom, token.ListingId, token.BoxId, null, 0);
        }

        var proceeds = (int)(token.Amount - token.Fee);
        if (price > 0)
        {
            // The seller's share waits in the box until they collect it; the commission is burned.
            player.Money -= price;
            box.Money = proceeds;
        }
        else
        {
            await context.DeleteAsync(box).ConfigureAwait(false);
        }

        if (!await player.SaveProgressAsync().ConfigureAwait(false))
        {
            await inventory.RemoveItemAsync(item).ConfigureAwait(false);
            player.Money += price;
            context.Detach(item);
            context.Detach(box);
            return new EscrowResult(token.Operation, EscrowStatus.Failed, token.ListingId, token.BoxId, null, 0);
        }

        await player.InvokeViewPlugInAsync<IItemAppearPlugIn>(p => p.ItemAppearAsync(item)).ConfigureAwait(false);
        if (price > 0)
        {
            context.Detach(box);
        }

        return new EscrowResult(token.Operation, EscrowStatus.Ok, token.ListingId, token.BoxId, item, price);
    }

    private async ValueTask<EscrowResult> CollectAsync(Player player, EscrowToken token)
    {
        if (token.ItemId == Guid.Empty)
        {
            return new EscrowResult(token.Operation, EscrowStatus.BadToken, token.ListingId, token.BoxId, null, 0);
        }

        var context = player.PersistenceContext;
        var (box, item) = await this.AdoptAsync(player, token).ConfigureAwait(false);
        if (box is null)
        {
            return new EscrowResult(token.Operation, EscrowStatus.BoxGone, token.ListingId, token.BoxId, null, 0);
        }

        if (item is not null || box.Items.Any())
        {
            // Something still points at the box: not sold. Deleting it now would take the item with it.
            context.Detach(box);
            return new EscrowResult(token.Operation, EscrowStatus.NotSold, token.ListingId, token.BoxId, null, 0);
        }

        var amount = box.Money;
        if (amount <= 0)
        {
            context.Detach(box);
            return new EscrowResult(token.Operation, EscrowStatus.BoxGone, token.ListingId, token.BoxId, null, 0);
        }

        if ((long)player.Money + amount > MaximumMoney)
        {
            context.Detach(box);
            return new EscrowResult(token.Operation, EscrowStatus.MoneyCap, token.ListingId, token.BoxId, null, 0);
        }

        box.Money = 0;
        await context.DeleteAsync(box).ConfigureAwait(false);
        player.Money += amount;
        if (!await player.SaveProgressAsync().ConfigureAwait(false))
        {
            player.Money -= amount;
            context.Detach(box);
            return new EscrowResult(token.Operation, EscrowStatus.Failed, token.ListingId, token.BoxId, null, 0);
        }

        return new EscrowResult(token.Operation, EscrowStatus.Ok, token.ListingId, token.BoxId, null, amount);
    }

    private ValueTask AnswerAsync(Player player, EscrowResult result)
        => player.InvokeViewPlugInAsync<IMarketplaceEscrowResultPlugIn>(p => p.ShowEscrowResultAsync(result));
}
