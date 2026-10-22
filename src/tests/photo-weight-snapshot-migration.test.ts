import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { createDatabaseDriver, IDatabase } from '../database/driver';
import { runMigrations } from '../database/migrations';

describe('Migração do peso associado às fotos', () => {
  let directory = '';
  let db: IDatabase | null = null;

  afterEach(() => {
    db?.close();
    if (directory && fs.existsSync(directory)) fs.rmSync(directory, { recursive: true, force: true });
  });

  it('adiciona o snapshot sem apagar metadados de fotos antigas', async () => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'santo-maromba-photo-weight-migration-'));
    db = await createDatabaseDriver(path.join(directory, 'fittrack.db'));
    db.exec(`CREATE TABLE photos (
      id TEXT PRIMARY KEY, profile_id TEXT NOT NULL, date TEXT NOT NULL,
      pose TEXT NOT NULL, custom_pose_name TEXT, file_path TEXT NOT NULL,
      lighting_notes TEXT, notes TEXT, is_primary INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    )`);
    db.execute(
      'INSERT INTO photos (id, profile_id, date, pose, file_path, is_primary, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['photo-old', 'default-user', '2026-10-19', 'front_relaxed', 'photo-old.jpg', 1, '2026-10-19T12:00:00.000Z']
    );

    await runMigrations(db);

    const columns = db.query<{ name: string }>('PRAGMA table_info(photos)');
    expect(columns.some(column => column.name === 'weight_kg_at_photo')).toBe(true);
    expect(db.queryOne<any>('SELECT id, date, file_path, weight_kg_at_photo FROM photos WHERE id = ?', ['photo-old']))
      .toMatchObject({ id: 'photo-old', date: '2026-10-19', file_path: 'photo-old.jpg', weight_kg_at_photo: null });
    expect(db.queryOne<{ version: number }>('SELECT version FROM schema_version WHERE version = 15')?.version).toBe(15);
  });
});
