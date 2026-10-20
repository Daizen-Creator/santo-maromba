import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDatabaseDriver, IDatabase } from '../database/driver';
import { runMigrations } from '../database/migrations';
import { ProfileRepository } from '../database/repositories/profile-repository';
import { FitTrackService } from '../services/fittrack-service';
import { PhysiqueProjectionInput } from '../shared/types';

const INPUT: PhysiqueProjectionInput = {
  asOfDate: '2026-10-19',
  age: 30,
  heightCm: 175,
  currentWeightKg: 80,
  bodyFatPct: 20,
  trainingExperience: 'beginner',
  adherencePercent: 100,
  goal: 'muscle_gain',
  measurements: { shouldersCm: 118, chestCm: 100, armCm: 35, waistCm: 88, thighCm: 58 }
};

describe('Persistência de projeções físicas', () => {
  let tempDirectory: string;
  let databasePath: string;
  let db: IDatabase | null = null;
  let service: FitTrackService;

  beforeEach(async () => {
    tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'santo-maromba-projection-'));
    databasePath = path.join(tempDirectory, 'fittrack.db');
    db = await createDatabaseDriver(databasePath);
    await runMigrations(db);
    new ProfileRepository(db).saveProfile({
      id: 'default-user',
      name: 'Pessoa Teste',
      birthDate: '1996-01-01',
      heightCm: 175
    });
    service = new FitTrackService(db);
  });

  afterEach(() => {
    db?.close();
    if (tempDirectory && fs.existsSync(tempDirectory)) fs.rmSync(tempDirectory, { recursive: true, force: true });
  });

  it('salva a projeção e reabre o snapshot e o esperado versus realizado', async () => {
    const saved = service.savePhysiqueProjection(INPUT);
    expect(saved.points).toHaveLength(5);
    expect(saved.comparisons).toHaveLength(4);
    expect(saved.comparisons[0].actualWeightKg).toBeNull();

    service.addWeightRecord({ date: '2027-01-20', weightKg: 81, source: 'verified' });
    db!.close();
    db = await createDatabaseDriver(databasePath);
    await runMigrations(db);
    service = new FitTrackService(db);

    const reopened = service.getPhysiqueProjections();
    expect(reopened).toHaveLength(1);
    expect(reopened[0].input).toEqual(INPUT);
    expect(reopened[0].comparisons[0].actualWeightKg).toBe(81);
    expect(reopened[0].comparisons[0].actualDate).toBe('2027-01-20');
    expect(reopened[0].comparisons[0].differenceKg).toBeDefined();
  });

  it('migra uma tabela antiga de medidas e registra a versão 3 sem apagar dados', async () => {
    const legacyPath = path.join(tempDirectory, 'legacy.db');
    const legacy = await createDatabaseDriver(legacyPath);
    try {
      legacy.exec(`CREATE TABLE body_measurements (
        id TEXT PRIMARY KEY, profile_id TEXT NOT NULL, date TEXT NOT NULL, weight_kg REAL,
        waist_circ_cm REAL, arm_relaxed_cm REAL, arm_flexed_cm REAL, chest_cm REAL,
        thigh_cm REAL, hip_cm REAL, calf_cm REAL, body_fat_pct REAL, source TEXT NOT NULL,
        notes TEXT, created_at TEXT NOT NULL
      )`);
      legacy.exec(`CREATE TABLE profiles (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, birth_date TEXT NOT NULL, height_cm REAL NOT NULL,
        biological_sex TEXT NOT NULL, activity_level TEXT NOT NULL, training_experience TEXT NOT NULL,
        fitness_goal TEXT NOT NULL, meals_per_day INTEGER NOT NULL, training_days_per_week INTEGER NOT NULL,
        initial_history_confirmed INTEGER NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      )`);
      legacy.execute(
        `INSERT INTO profiles (id, name, birth_date, height_cm, biological_sex, activity_level,
          training_experience, fitness_goal, meals_per_day, training_days_per_week,
          initial_history_confirmed, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['default-user', 'Pessoa', '1990-01-01', 175, 'unspecified', 'moderate', 'beginner', 'muscle_gain', 4, 5, 1, '2026-01-01', '2026-01-01']
      );
      legacy.execute(
        `INSERT INTO body_measurements (id, profile_id, date, waist_circ_cm, source, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        ['existing-measure', 'default-user', '2026-10-19', 88, 'manual', '2026-10-19']
      );

      await runMigrations(legacy);
      const columns = legacy.query<{ name: string }>('PRAGMA table_info(body_measurements)');
      expect(columns.some(column => column.name === 'shoulder_circ_cm')).toBe(true);
      expect(legacy.queryOne('SELECT id FROM body_measurements WHERE id = ?', ['existing-measure'])).toBeDefined();
      expect(legacy.queryOne('SELECT version FROM schema_version WHERE version = 3')).toBeDefined();
      expect(legacy.queryOne("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'physique_projections'")).toBeDefined();
    } finally {
      legacy.close();
    }
  });
});
