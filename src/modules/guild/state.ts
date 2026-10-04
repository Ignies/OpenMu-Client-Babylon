/**
 * GuildInformation by guild id (the original's `GuildMark[]` table): what
 * `AssignCharacterToGuild` members print over their heads. Plain (not
 * observable) - the name tags re-read it every frame anyway.
 */
export const GuildMarks = new Map<number, { name: string; alliance: string; logo: number[] }>();
