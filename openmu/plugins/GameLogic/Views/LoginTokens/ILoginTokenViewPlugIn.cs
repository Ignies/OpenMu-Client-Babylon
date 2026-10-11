// <copyright file="ILoginTokenViewPlugIn.cs" company="MUnique">
// Licensed under the MIT License. See LICENSE file in the project root for full license information.
// </copyright>

namespace MUnique.OpenMU.GameLogic.Views.LoginTokens;

/// <summary>
/// How a login token request ended. Sent to the client as one byte.
/// </summary>
public enum LoginTokenStatus : byte
{
    /// <summary>A token was issued.</summary>
    Ok = 0,

    /// <summary>Not logged in, a template account, or a token was already issued on this connection.</summary>
    Refused = 1,

    /// <summary>The token could not be stored.</summary>
    Failed = 2,
}

/// <summary>
/// View plugin which hands the web client a new login token (C1 E7 04).
/// </summary>
public interface ILoginTokenViewPlugIn : IViewPlugIn
{
    /// <summary>
    /// Sends the answer to a token request, or the replacement token after a token login.
    /// </summary>
    /// <param name="status">How it ended.</param>
    /// <param name="token">The token when <paramref name="status"/> is <see cref="LoginTokenStatus.Ok"/>; empty otherwise.</param>
    ValueTask SendLoginTokenAsync(LoginTokenStatus status, ReadOnlyMemory<byte> token);
}
