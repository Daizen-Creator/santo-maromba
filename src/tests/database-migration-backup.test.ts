import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { closeDatabase, getDatabase } from '../database/connection';
import { createDatabaseDriver } from '../database/driver';

describe('backup antes da migração do banco', () => {
  let tempDirectory = '';

  afterEach(() => {
    closeDatabase();
    if (tempDirectory && fs.existsSync(tempDirectory)) {
      fs.rmSync(tempDirectory, { recursive: true, force: true });
    }
  });

  it('preserva o banco v7 antes de aplicar a migração v8', async () => {
    tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'santo-maromba-migration-'));
    const databasePath = path.join(tempDirectory, 'fittrack.db');
    const oldDatabase = await createDatabaseDriver(databasePath);
    oldDatabase.exec(`CREATE TABLE schema_version (
      version INTEGER PRIMARY KEY,
      description TEXT NOT NULL,
      applied_at TEXT NOT NULL
    )`);
    oldDatabase.execute(
      'INSERT INTO schema_version (version, description, applied_at) VALUES (?, ?, ?)',
      [7, 'checklist anterior', '2026-10-22T00:00:00.000Z']
    );
    oldDatabase.close();

    const migratedDatabase = await getDatabase(databasePath);
    const backupPath = `${databasePath}.pre-v8.bak`;
    expect(fs.existsSync(backupPath)).toBe(true);
    expect(migratedDatabase.queryOne('SELECT version FROM schema_version WHERE version = 8')).toBeDefined();

    const backupDatabase = await createDatabaseDriver(backupPath);
    expect(backupDatabase.queryOne('SELECT version FROM schema_version WHERE version = 8')).toBeUndefined();
    expect(backupDatabase.queryOne('SELECT version FROM schema_version WHERE version = 7')).toBeDefined();
    backupDatabase.close();
  });

  it('não cria um arquivo chamado pré-migração para um banco que já está na v8', async () => {
    tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'santo-maromba-current-'));
    const databasePath = path.join(tempDirectory, 'fittrack.db');

    const firstOpen = await getDatabase(databasePath);
    expect(firstOpen.queryOne('SELECT version FROM schema_version WHERE version = 8')).toBeDefined();
    closeDatabase();

    await getDatabase(databasePath);
    expect(fs.existsSync(`${databasePath}.pre-v8.bak`)).toBe(false);
  });
});
