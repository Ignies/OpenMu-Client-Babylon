// <copyright file="LoginTokenStore.cs" company="MUnique">
// Licensed under the MIT License. See LICENSE file in the project root for full license information.
// </copyright>

namespace MUnique.OpenMU.GameLogic.LoginTokens;

using System.Security.Cryptography;
using System.Text;
using MUnique.OpenMU.Persistence.EntityFramework;
using Npgsql;

/// <summary>
/// The saved logins of the web client: tokens in a table of our own, <c>mu_plugins.login_token</c>, in OpenMU's
/// database (so OpenMU's own backup of the database carries them). A token is 32 random bytes; only its SHA-256
/// is stored, with the account, the issue time and a fingerprint of the account's password hash at issue, so a
/// password change voids every token of the account without a hook.
/// </summary>
public sealed class LoginTokenStore
{
    /// <summary>The length of a token, in bytes.</summary>
    public const int TokenLength = 32;

    /// <summary>The tokens one account keeps (one per browser); issuing more drops the oldest.</summary>
    private const int MaximumPerAccount = 10;

    private const string CreateSql = """
        CREATE SCHEMA IF NOT EXISTS mu_plugins;
        CREATE TABLE IF NOT EXISTS mu_plugins.login_token (
            token_hash bytea PRIMARY KEY,
            account_id uuid NOT NULL,
            issued_at timestamptz NOT NULL DEFAULT now(),
            password_fingerprint bytea NOT NULL);
        CREATE INDEX IF NOT EXISTS login_token_account ON mu_plugins.login_token (account_id);
        """;

    private readonly object _sync = new();

    private Task? _created;

    private string? _connectionString;

    private LoginTokenStore()
    {
    }

    /// <summary>How long a token works after it was issued.</summary>
    public static TimeSpan Lifetime { get; } = TimeSpan.FromDays(30);

    /// <summary>Gets the store of this process.</summary>
    public static LoginTokenStore Instance { get; } = new();

    /// <summary>OpenMU's admin connection, read the way OpenMU reads it (ConnectionSettings.xml, DB_HOST, DB_ADMIN_PW).</summary>
    private string ConnectionString => this._connectionString ??=
        new ConfigFileDatabaseConnectionStringProvider().GetConnectionSetting(typeof(EntityDataContext)).ConnectionString
        ?? throw new InvalidOperationException("OpenMU has no admin connection string.");

    /// <summary>The fingerprint of an account's password hash: a new password, a new fingerprint.</summary>
    public static byte[] Fingerprint(string passwordHash) => SHA256.HashData(Encoding.UTF8.GetBytes(passwordHash));

    /// <summary>Creates the schema and the table when they are missing; once per process, again after a failure.</summary>
    public Task EnsureCreatedAsync()
    {
        lock (this._sync)
        {
            if (this._created is null || this._created.IsFaulted || this._created.IsCanceled)
            {
                this._created = this.CreateAsync();
            }

            return this._created;
        }
    }

    /// <summary>
    /// Issues a new token for the account. When <paramref name="replacing"/> is given, that token stops working in the
    /// same transaction. Expired tokens of the account and the oldest beyond the per-account limit are dropped too.
    /// </summary>
    public async ValueTask<byte[]> IssueAsync(Guid accountId, string passwordHash, byte[]? replacing = null)
    {
        await this.EnsureCreatedAsync().ConfigureAwait(false);
        var token = RandomNumberGenerator.GetBytes(TokenLength);
        await using var connection = await this.OpenAsync().ConfigureAwait(false);
        await using var transaction = await connection.BeginTransactionAsync().ConfigureAwait(false);
        if (replacing is not null)
        {
            await using var delete = new NpgsqlCommand("DELETE FROM mu_plugins.login_token WHERE token_hash = @hash", connection, transaction);
            delete.Parameters.AddWithValue("hash", SHA256.HashData(replacing));
            await delete.ExecuteNonQueryAsync().ConfigureAwait(false);
        }

        await using (var insert = new NpgsqlCommand("INSERT INTO mu_plugins.login_token (token_hash, account_id, password_fingerprint) VALUES (@hash, @account, @fingerprint)", connection, transaction))
        {
            insert.Parameters.AddWithValue("hash", SHA256.HashData(token));
            insert.Parameters.AddWithValue("account", accountId);
            insert.Parameters.AddWithValue("fingerprint", Fingerprint(passwordHash));
            await insert.ExecuteNonQueryAsync().ConfigureAwait(false);
        }

        await using (var trim = new NpgsqlCommand(
            """
            DELETE FROM mu_plugins.login_token WHERE account_id = @account AND (issued_at < now() - @lifetime OR token_hash NOT IN (
                SELECT token_hash FROM mu_plugins.login_token WHERE account_id = @account ORDER BY issued_at DESC LIMIT @keep))
            """,
            connection,
            transaction))
        {
            trim.Parameters.AddWithValue("account", accountId);
            trim.Parameters.AddWithValue("lifetime", Lifetime);
            trim.Parameters.AddWithValue("keep", MaximumPerAccount);
            await trim.ExecuteNonQueryAsync().ConfigureAwait(false);
        }

        await transaction.CommitAsync().ConfigureAwait(false);
        return token;
    }

    /// <summary>The account a token was issued to and the password fingerprint it was issued with, while it is unexpired.</summary>
    public async ValueTask<(Guid AccountId, byte[] Fingerprint)?> FindAsync(byte[] token)
    {
        await this.EnsureCreatedAsync().ConfigureAwait(false);
        await using var connection = await this.OpenAsync().ConfigureAwait(false);
        await using var find = new NpgsqlCommand("SELECT account_id, password_fingerprint FROM mu_plugins.login_token WHERE token_hash = @hash AND issued_at >= now() - @lifetime", connection);
        find.Parameters.AddWithValue("hash", SHA256.HashData(token));
        find.Parameters.AddWithValue("lifetime", Lifetime);
        await using var reader = await find.ExecuteReaderAsync().ConfigureAwait(false);
        if (!await reader.ReadAsync().ConfigureAwait(false))
        {
            return null;
        }

        return (reader.GetGuid(0), (byte[])reader.GetValue(1));
    }

    /// <summary>Drops every expired token. Returns how many went.</summary>
    public async ValueTask<int> DropExpiredAsync()
    {
        await this.EnsureCreatedAsync().ConfigureAwait(false);
        await using var connection = await this.OpenAsync().ConfigureAwait(false);
        await using var drop = new NpgsqlCommand("DELETE FROM mu_plugins.login_token WHERE issued_at < now() - @lifetime", connection);
        drop.Parameters.AddWithValue("lifetime", Lifetime);
        return await drop.ExecuteNonQueryAsync().ConfigureAwait(false);
    }

    private async Task CreateAsync()
    {
        await using var connection = await this.OpenAsync().ConfigureAwait(false);
        await using var create = new NpgsqlCommand(CreateSql, connection);
        await create.ExecuteNonQueryAsync().ConfigureAwait(false);
    }

    private async ValueTask<NpgsqlConnection> OpenAsync()
    {
        var connection = new NpgsqlConnection(this.ConnectionString);
        await connection.OpenAsync().ConfigureAwait(false);
        return connection;
    }
}
