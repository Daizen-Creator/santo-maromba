import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDatabaseDriver, IDatabase } from '../database/driver';
import { runMigrations } from '../database/migrations';
import { WorkoutRepository } from '../database/repositories/workout-repository';
import { getWorkoutScheduleStatus } from '../domain/workout-schedule';
import { WorkoutSession } from '../shared/types';

describe('Agenda persistente de treino e recuperação', () => {
  let directory: string;
  let databasePath: string;
  let db: IDatabase | null = null;

  beforeEach(async () => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'santo-maromba-workout-schedule-'));
    databasePath = path.join(directory, 'fittrack.db');
    db = await createDatabaseDriver(databasePath);
    await runMigrations(db);
  });

  afterEach(() => {
    db?.close();
    if (directory && fs.existsSync(directory)) fs.rmSync(directory, { recursive: true, force: true });
  });

  it('salva e reabre treino, descanso e deload sem confundir seus estados', async () => {
    const repo = new WorkoutRepository(db!);
    const training = repo.saveScheduleEntry({ date: '2026-10-20', kind: 'training', title: 'Treino A' });
    repo.saveScheduleEntry({ date: '2026-10-21', kind: 'rest', notes: 'Recuperação' });
    repo.saveScheduleEntry({ date: '2026-10-22', kind: 'deload', title: 'Semana de descarga', notes: 'Reduzir volume esta semana' });

    db!.close();
    db = await createDatabaseDriver(databasePath);
    await runMigrations(db);
    const entries = new WorkoutRepository(db).getSchedule();
    expect(entries).toHaveLength(3);
    expect(entries.find(item => item.date === '2026-10-22')).toMatchObject({ title: 'Semana de descarga', notes: 'Reduzir volume esta semana' });
    expect(getWorkoutScheduleStatus(entries.find(item => item.date === '2026-10-20')!, [], '2026-10-23')).toBe('missed');
    expect(getWorkoutScheduleStatus(entries.find(item => item.date === '2026-10-21')!, [], '2026-10-23')).toBe('rest');
    expect(getWorkoutScheduleStatus(entries.find(item => item.date === '2026-10-22')!, [], '2026-10-23')).toBe('deload');
    expect(db!.queryOne<{ version: number }>('SELECT version FROM schema_version WHERE version = 14')?.version).toBe(14);

    const reopenedRepo = new WorkoutRepository(db!);
    const corrected = reopenedRepo.saveScheduleEntry({ date: '2026-10-20', kind: 'rest' });
    expect(corrected.id).toBe(training.id);
    expect(getWorkoutScheduleStatus(corrected, [], '2026-10-23')).toBe('rest');
  });

  it('considera parcial ou concluído qualquer sessão registrada no dia, sem marcar treino como perdido', () => {
    const entry = new WorkoutRepository(db!).saveScheduleEntry({ date: '2026-10-20', kind: 'training' });
    const partial: WorkoutSession = { id: 'partial', date: entry.date, splitName: 'A', completed: false, sets: [], createdAt: '' };
    const complete: WorkoutSession = { ...partial, id: 'complete', completed: true };
    expect(getWorkoutScheduleStatus(entry, [partial], '2026-10-23')).toBe('partial');
    expect(getWorkoutScheduleStatus(entry, [complete], '2026-10-23')).toBe('completed');
  });
});
