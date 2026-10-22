import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDatabaseDriver, IDatabase } from '../database/driver';
import { runMigrations } from '../database/migrations';

describe('Migração de conclusão de séries', () => {
  let tempDirectory: string;
  let db: IDatabase | null = null;

  beforeEach(async () => {
    tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'santo-maromba-workout-migration-'));
    db = await createDatabaseDriver(path.join(tempDirectory, 'fittrack.db'));
    db.exec(`CREATE TABLE workout_sessions (
      id TEXT PRIMARY KEY, date TEXT NOT NULL, split_name TEXT NOT NULL, completed INTEGER NOT NULL,
      duration_minutes INTEGER, perceived_exertion INTEGER, notes TEXT, created_at TEXT NOT NULL
    );
    CREATE TABLE exercises (id TEXT PRIMARY KEY);
    CREATE TABLE workout_sets (
      id TEXT PRIMARY KEY, session_id TEXT NOT NULL, exercise_id TEXT NOT NULL, set_number INTEGER NOT NULL,
      weight_kg REAL NOT NULL, reps INTEGER NOT NULL, rpe REAL, is_pr INTEGER NOT NULL DEFAULT 0,
      notes TEXT, created_at TEXT NOT NULL, FOREIGN KEY(session_id) REFERENCES workout_sessions(id),
      FOREIGN KEY(exercise_id) REFERENCES exercises(id)
    );`);
    db.execute('INSERT INTO workout_sessions (id, date, split_name, completed, created_at) VALUES (?, ?, ?, ?, ?)',
      ['legacy-session', '2026-10-20', 'Treino antigo', 1, new Date().toISOString()]);
    db.execute('INSERT INTO exercises (id) VALUES (?)', ['legacy-exercise']);
    db.execute(`INSERT INTO workout_sets (id, session_id, exercise_id, set_number, weight_kg, reps, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['legacy-set', 'legacy-session', 'legacy-exercise', 1, 30, 10, new Date().toISOString()]);
  });

  afterEach(() => {
    db?.close();
    if (tempDirectory && fs.existsSync(tempDirectory)) fs.rmSync(tempDirectory, { recursive: true, force: true });
  });

  it('adiciona o estado da série sem apagar registros anteriores e os marca como concluídos', async () => {
    await runMigrations(db!);
    const columns = db!.query<{ name: string }>('PRAGMA table_info(workout_sets)').map(column => column.name);
    expect(columns).toContain('completed');
    expect(columns).toContain('rir');
    expect(db!.queryOne<{ completed: number }>('SELECT completed FROM workout_sets WHERE id = ?', ['legacy-set'])?.completed).toBe(1);
    expect(db!.queryOne<{ version: number }>('SELECT version FROM schema_version WHERE version = 9')?.version).toBe(9);
    expect(db!.queryOne<{ version: number }>('SELECT version FROM schema_version WHERE version = 12')?.version).toBe(12);
    expect(db!.queryOne<{ rir: number | null }>('SELECT rir FROM workout_sets WHERE id = ?', ['legacy-set'])?.rir).toBeNull();
    expect(() => db!.execute('UPDATE workout_sets SET rir = 11 WHERE id = ?', ['legacy-set'])).toThrow();
  });
});
