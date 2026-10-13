-- Local runs only (SQLite): the slice of OpenMU's schema the site reads, with sample rows.
-- Test logins: devgm / devgm2026 (Game Master), player1 / player1.
CREATE TABLE data."Account" ("Id" TEXT PRIMARY KEY, "LoginName" TEXT NOT NULL UNIQUE, "PasswordHash" TEXT NOT NULL, "SecurityCode" TEXT NOT NULL, "EMail" TEXT NOT NULL, "RegistrationDate" TEXT NOT NULL, "State" INTEGER NOT NULL, "TimeZone" INTEGER NOT NULL, "VaultPassword" TEXT NOT NULL, "IsVaultExtended" INTEGER NOT NULL, "VaultId" TEXT);
CREATE TABLE data."Character" ("Id" TEXT PRIMARY KEY, "AccountId" TEXT NOT NULL, "Name" TEXT NOT NULL, "CharacterClassId" TEXT NOT NULL, "PlayerKillCount" INTEGER NOT NULL, "Experience" INTEGER NOT NULL);
CREATE TABLE data."StatAttribute" ("Id" TEXT PRIMARY KEY, "CharacterId" TEXT NOT NULL, "DefinitionId" TEXT NOT NULL, "Value" REAL NOT NULL);
CREATE TABLE config."AttributeDefinition" ("Id" TEXT PRIMARY KEY, "Designation" TEXT NOT NULL);
CREATE TABLE config."CharacterClass" ("Id" TEXT PRIMARY KEY, "Name" TEXT NOT NULL);
INSERT INTO data."Account" VALUES ('a1', 'devgm', '$2a$11$8wY73dbTwpQu7fbCsOpH5ehpjB7xWKDjgyFXPDqL.80AQv6eag58u', '', '', '2026-10-13', 2, 0, '', 0, NULL);
INSERT INTO data."Account" VALUES ('a2', 'player1', '$2a$11$j56zbYKrJOipu82gx.7InOgl.pCL3vEq8AlrdzpCC1zhakXoETvzG', '', '', '2026-10-13', 0, 0, '', 0, NULL);
INSERT INTO config."AttributeDefinition" VALUES ('lvl', 'Level'), ('rst', 'Resets');
INSERT INTO config."CharacterClass" VALUES ('bk', 'Blade Knight'), ('sm', 'Soul Master'), ('me', 'Muse Elf'), ('mg', 'Magic Gladiator'), ('dl', 'Dark Lord');
INSERT INTO data."Character" VALUES ('c1', 'a2', 'Ignis', 'bk', 12, 0), ('c2', 'a2', 'Frost', 'sm', 3, 0), ('c3', 'a2', 'Aria', 'me', 27, 0), ('c4', 'a2', 'Zeal', 'mg', 0, 0), ('c5', 'a2', 'Rex', 'dl', 8, 0);
INSERT INTO data."StatAttribute" VALUES ('s1', 'c1', 'lvl', 400), ('s2', 'c1', 'rst', 7), ('s3', 'c2', 'lvl', 380), ('s4', 'c2', 'rst', 9), ('s5', 'c3', 'lvl', 312), ('s6', 'c4', 'lvl', 400), ('s7', 'c4', 'rst', 2), ('s8', 'c5', 'lvl', 150)
