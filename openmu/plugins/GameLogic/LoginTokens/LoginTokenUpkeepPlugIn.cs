// <copyright file="LoginTokenUpkeepPlugIn.cs" company="MUnique">
// Licensed under the MIT License. See LICENSE file in the project root for full license information.
// </copyright>

namespace MUnique.OpenMU.GameLogic.LoginTokens;

using System.Runtime.InteropServices;
using Microsoft.Extensions.Logging;
using MUnique.OpenMU.GameLogic.PlugIns;
using MUnique.OpenMU.PlugIns;

/// <summary>
/// Creates the login token table when a game server starts (if it is missing) and drops expired tokens once an hour.
/// </summary>
[PlugIn]
[Display(Name = "Login Token Upkeep", Description = "Creates the login token table at start and drops expired tokens hourly.")]
[Guid("16b3e999-9163-4750-b9ee-77014e322879")]
public class LoginTokenUpkeepPlugIn : IPeriodicTaskPlugIn
{
    private static readonly TimeSpan Interval = TimeSpan.FromHours(1);

    private DateTime _nextRunUtc = DateTime.UtcNow;

    /// <inheritdoc />
    public async ValueTask ExecuteTaskAsync(GameContext gameContext)
    {
        if (DateTime.UtcNow < this._nextRunUtc)
        {
            return;
        }

        this._nextRunUtc = DateTime.UtcNow + Interval;
        try
        {
            await LoginTokenStore.Instance.DropExpiredAsync().ConfigureAwait(false);
        }
        catch (Exception ex)
        {
            // Retried in a minute; the token requests create the table themselves too.
            this._nextRunUtc = DateTime.UtcNow + TimeSpan.FromMinutes(1);
            gameContext.LoggerFactory.CreateLogger(this.GetType().Name).LogWarning(ex, "Login token upkeep failed.");
        }
    }

    /// <inheritdoc />
    public void ForceStart() => this._nextRunUtc = DateTime.UtcNow;
}
