import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDatabaseDriver, IDatabase } from '../database/driver';
import { runMigrations } from '../database/migrations';
import { MeasurementRepository } from '../database/repositories/measurement-repository';
import { api } from '../renderer/services/api';

describe('Histórico de altura por data', () => {
  let tempDirectory = '';
  let db: IDatabase | null = null;

  afterEach(() => {
    db?.close();
    db = null;
    if (tempDirectory && fs.existsSync(tempDirectory)) fs.rmSync(tempDirectory, { recursive: true, force: true });
    vi.unstubAllGlobals();
  });

  it('salva alturas por data, preserva outras medidas e reabre o banco', async () => {
    tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'santo-maromba-height-'));
    const databasePath = path.join(tempDirectory, 'fittrack.db');
    db = await createDatabaseDriver(databasePath);
    await runMigrations(db);
    let repository = new MeasurementRepository(db);

    repository.saveMeasurement({ date: '2025-10-22', heightCm: 174.5, waistCircCm: 82, source: 'Avaliação clínica' });
    repository.saveMeasurement({ date: '2026-10-22', heightCm: 175.2 });
    repository.saveMeasurement({ date: '2025-10-22', heightCm: 174.8 });

    expect(repository.getAll()).toMatchObject([
      { date: '2026-10-22', heightCm: 175.2 },
      { date: '2025-10-22', heightCm: 174.8, waistCircCm: 82, source: 'Avaliação clínica' }
    ]);

    db.close();
    db = await createDatabaseDriver(databasePath);
    await runMigrations(db);
    repository = new MeasurementRepository(db);
    expect(repository.getAll()).toMatchObject([
      { date: '2026-10-22', heightCm: 175.2 },
      { date: '2025-10-22', heightCm: 174.8, waistCircCm: 82, source: 'Avaliação clínica' }
    ]);
    expect(db.queryOne<{ version: number }>('SELECT version FROM schema_version WHERE version = 18')?.version).toBe(18);
  });

  it('adiciona a coluna de altura em banco legado sem apagar medições anteriores', async () => {
    tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'santo-maromba-height-migration-'));
    db = await createDatabaseDriver(path.join(tempDirectory, 'fittrack.db'));
    db.exec(`
      CREATE TABLE schema_version (version INTEGER PRIMARY KEY, description TEXT NOT NULL, applied_at TEXT NOT NULL);
      INSERT INTO schema_version VALUES (17, 'previous', '2026-01-01T00:00:00.000Z');
      CREATE TABLE profiles (id TEXT PRIMARY KEY);
      INSERT INTO profiles VALUES ('default-user');
      CREATE TABLE body_measurements (
        id TEXT PRIMARY KEY, profile_id TEXT NOT NULL, date TEXT NOT NULL, weight_kg REAL,
        waist_circ_cm REAL, arm_relaxed_cm REAL, arm_flexed_cm REAL, chest_cm REAL, thigh_cm REAL,
        hip_cm REAL, shoulder_circ_cm REAL, calf_cm REAL, body_fat_pct REAL, source TEXT NOT NULL,
        notes TEXT, created_at TEXT NOT NULL, FOREIGN KEY(profile_id) REFERENCES profiles(id)
      );
      INSERT INTO body_measurements (id, profile_id, date, waist_circ_cm, source, created_at)
      VALUES ('old-measurement', 'default-user', '2024-10-22', 84, 'Fita manual', '2024-10-22T00:00:00.000Z');
    `);

    await runMigrations(db);
    const repository = new MeasurementRepository(db);
    expect(repository.getAll()).toMatchObject([{ id: 'old-measurement', date: '2024-10-22', waistCircCm: 84 }]);
    expect(db.queryOne<{ height_cm: number | null }>('SELECT height_cm FROM body_measurements WHERE id = ?', ['old-measurement'])?.height_cm).toBeNull();
  });

  it('mantém alturas e medidas por data no armazenamento offline da PWA', async () => {
    const values = new Map<string, string>();
    vi.stubGlobal('window', undefined);
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value)
    });

    await api.saveMeasurement({ date: '2026-10-21', heightCm: 175 });
    await api.saveMeasurement({ date: '2026-10-21', waistCircCm: 80 });
    expect(await api.getMeasurements()).toMatchObject([{ date: '2026-10-21', heightCm: 175, waistCircCm: 80 }]);
  });
});
