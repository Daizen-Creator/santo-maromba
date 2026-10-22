import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDatabaseDriver, IDatabase } from '../database/driver';
import { runMigrations } from '../database/migrations';
import { ProfileRepository } from '../database/repositories/profile-repository';
import { api } from '../renderer/services/api';

const validProfile = {
  name: 'Pessoa Teste',
  birthDate: '1995-04-12',
  heightCm: 175,
  biologicalSex: 'unspecified' as const,
  activityLevel: 'moderate' as const,
  trainingExperience: 'beginner' as const,
  fitnessGoal: 'muscle_gain' as const,
  mealsPerDay: 5,
  trainingDaysPerWeek: 4
};

describe('Horários estruturados de rotina do perfil', () => {
  let tempDirectory = '';
  let db: IDatabase | null = null;

  afterEach(() => {
    db?.close();
    db = null;
    if (tempDirectory && fs.existsSync(tempDirectory)) fs.rmSync(tempDirectory, { recursive: true, force: true });
    vi.unstubAllGlobals();
  });

  it('migra um banco anterior, salva os horários e mantém os dados depois de reabrir', async () => {
    tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'santo-maromba-routine-'));
    const databasePath = path.join(tempDirectory, 'fittrack.db');
    db = await createDatabaseDriver(databasePath);
    const schemaPath = path.resolve(process.cwd(), 'src/database/schema.sql');
    const priorSchema = fs.readFileSync(schemaPath, 'utf8')
      .replace(/^\s*wake_time TEXT[^\n]*\n/m, '')
      .replace(/^\s*sleep_time TEXT[^\n]*\n/m, '');
    db.exec(priorSchema);
    await runMigrations(db);

    let repository = new ProfileRepository(db);
    repository.saveProfile({ ...validProfile, wakeTime: '06:15', sleepTime: '22:45' });
    expect(repository.getProfile()).toMatchObject({ wakeTime: '06:15', sleepTime: '22:45' });
    expect(db.queryOne<{ version: number }>('SELECT version FROM schema_version WHERE version = 19')?.version).toBe(19);

    db.close();
    db = await createDatabaseDriver(databasePath);
    await runMigrations(db);
    repository = new ProfileRepository(db);
    expect(repository.getProfile()).toMatchObject({ wakeTime: '06:15', sleepTime: '22:45' });

    repository.saveProfile({ ...validProfile, wakeTime: undefined, sleepTime: undefined });
    expect(repository.getProfile()).toMatchObject({ wakeTime: undefined, sleepTime: undefined });
  });

  it('mantém os horários estruturados no armazenamento local offline da PWA', async () => {
    const values = new Map<string, string>();
    vi.stubGlobal('window', undefined);
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value)
    });

    await api.saveProfile({ ...validProfile, wakeTime: '05:50', sleepTime: '21:40' });
    expect(await api.getProfile()).toMatchObject({ wakeTime: '05:50', sleepTime: '21:40' });
  });
});
