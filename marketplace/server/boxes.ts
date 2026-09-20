import postgres from 'postgres';

/**
 * The escrow boxes, read from OpenMU's own database.
 *
 * A box is an `ItemStorage` row nobody owns: not an account's vault, not a
 * character's inventory, not a merchant's stock. The game server's plugin
 * moves a listed item into it, a buyer's purchase out of it (leaving the
 * price as the box's `Money`), and deletes it when the seller collects. The
 * plugin never tells the service what it did; the service looks.
 *
 * The box id is minted here before anything moves and stored on the listing,
 * so no box can exist that a listing does not name.
 */

export const DATABASE_URL =
  process.env.DATABASE_URL || 'postgres://postgres:admin@127.0.0.1:5432/openmu';

export type BoxItem = {
  id: string;
  group: number;
  number: number;
  level: number;
  durability: number;
};

export type BoxState = {
  exists: boolean;
  money: number;
  /** The one item a box holds, or null when it holds none (or does not exist). */
  item: BoxItem | null;
};

export const NO_BOX: BoxState = { exists: false, money: 0, item: null };

/** What the service needs from Postgres; tests hand in a map instead. */
export interface Boxes {
  state(boxId: string): Promise<BoxState>;
}

type BoxRow = {
  money: number;
  item_id: string | null;
  group: number | null;
  number: number | null;
  level: number | null;
  durability: number | null;
};

export type PostgresBoxes = Boxes & {
  sql: ReturnType<typeof postgres>;
  /** Boxes in Postgres that nothing owns, for the audit. */
  unowned(): Promise<{ id: string; money: number; items: number }[]>;
  end(): Promise<void>;
};

export function postgresBoxes(url = DATABASE_URL): PostgresBoxes {
  const sql = postgres(url);

  return {
    sql,

    async state(boxId: string): Promise<BoxState> {
      const rows = await sql<BoxRow[]>`
        SELECT s."Money" AS money, i."Id" AS item_id, d."Group" AS "group",
               d."Number" AS "number", i."Level" AS level, i."Durability" AS durability
        FROM data."ItemStorage" s
        LEFT JOIN data."Item" i ON i."ItemStorageId" = s."Id"
        LEFT JOIN config."ItemDefinition" d ON d."Id" = i."DefinitionId"
        WHERE s."Id" = ${boxId}
        ORDER BY i."ItemSlot"`;
      if (rows.length === 0) return NO_BOX;

      const items = rows.filter(r => r.item_id !== null);
      if (items.length > 1) {
        console.error(`marketplace: box ${boxId} holds ${items.length} items; using the first`);
      }
      const first = items[0];
      return {
        exists: true,
        money: Number(rows[0].money ?? 0),
        item: first
          ? {
              id: first.item_id as string,
              group: Number(first.group ?? -1),
              number: Number(first.number ?? -1),
              level: Number(first.level ?? 0),
              durability: Number(first.durability ?? 0),
            }
          : null,
      };
    },

    async unowned() {
      const rows = await sql<{ id: string; money: number; items: number }[]>`
        SELECT s."Id" AS id, s."Money" AS money,
               (SELECT count(*) FROM data."Item" i WHERE i."ItemStorageId" = s."Id") AS items
        FROM data."ItemStorage" s
        WHERE NOT EXISTS (SELECT 1 FROM data."Account" a WHERE a."VaultId" = s."Id")
          AND NOT EXISTS (SELECT 1 FROM data."Character" c WHERE c."InventoryId" = s."Id")
          AND NOT EXISTS (SELECT 1 FROM config."MonsterDefinition" m WHERE m."MerchantStoreId" = s."Id")`;
      return rows.map(r => ({ id: r.id, money: Number(r.money), items: Number(r.items) }));
    },

    end: () => sql.end({ timeout: 5 }),
  };
}
