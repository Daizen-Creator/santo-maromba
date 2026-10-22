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
  targetWeightKg: 80,
  mealsPerDay: 4,
  trainingDaysPerWeek: 4
};

describe('Histórico de objetivos do perfil', () => {
  let tempDirectory = '';
  let db: IDatabase | null = null;

  afterEach(() => {
    db?.close();
    db = null;
    if (tempDirectory && fs.existsSync(tempDirectory)) fs.rmSync(tempDirectory, { recursive: true, force: true });
    vi.unstubAllGlobals();
  });

  it('salva o objetivo inicial, registra apenas alterações reais e mantém o histórico ao reabrir', async () => {
    tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'santo-maromba-goal-history-'));
    const databasePath = path.join(tempDirectory, 'fittrack.db');
    db = await createDatabaseDriver(databasePath);
    await runMigrations(db);
    let repository = new ProfileRepository(db);

    repository.saveProfile(validProfile);
    expect(repository.getGoalHistory()).toMatchObject([{
      fitnessGoal: 'muscle_gain', targetWeightKg: 80, changeKind: 'initial',
      changedFields: ['fitnessGoal', 'targetWeightKg']
    }]);

    repository.saveProfile({ ...validProfile, name: 'Pessoa Atualizada' });
    expect(repository.getGoalHistory()).toHaveLength(1);
    repository.saveProfile({ ...validProfile, name: 'Pessoa Atualizada', targetWeightKg: undefined });
    expect(repository.getGoalHistory()).toHaveLength(2);
    expect(repository.getGoalHistory()[0]).toMatchObject({
      fitnessGoal: 'muscle_gain', targetWeightKg: null, changedFields: ['targetWeightKg']
    });
    repository.saveProfile({ ...validProfile, name: 'Pessoa Atualizada', fitnessGoal: 'fat_loss', targetWeightKg: 74 });
    expect(repository.getGoalHistory()).toHaveLength(3);
    expect(repository.getGoalHistory()[0]).toMatchObject({
      fitnessGoal: 'fat_loss', targetWeightKg: 74, changeKind: 'updated',
      changedFields: ['fitnessGoal', 'targetWeightKg']
    });

    db.close();
    db = await createDatabaseDriver(databasePath);
    await runMigrations(db);
    repository = new ProfileRepository(db);
    expect(repository.getGoalHistory()).toHaveLength(3);
    expect(repository.getGoalHistory()[2]).toMatchObject({ fitnessGoal: 'muscle_gain', targetWeightKg: 80, changeKind: 'initial' });
    expect(db.queryOne<{ version: number }>('SELECT version FROM schema_version WHERE version = 17')?.version).toBe(17);
  });

  it('mantém marcos de objetivo e peso-alvo no armazenamento offline da PWA', async () => {
    const values = new Map<string, string>();
    vi.stubGlobal('window', undefined);
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value)
    });

    await api.saveProfile(validProfile);
    await api.saveProfile({ ...validProfile, name: 'Pessoa Atualizada' });
    await api.saveProfile({ ...validProfile, name: 'Pessoa Atualizada', targetWeightKg: undefined });
    await api.saveProfile({ ...validProfile, fitnessGoal: 'fat_loss', targetWeightKg: 74 });
    const history = await api.getProfileGoalHistory();

    expect(history).toHaveLength(3);
    expect(history[0]).toMatchObject({ fitnessGoal: 'fat_loss', targetWeightKg: 74, changeKind: 'updated' });
    expect(history[1]).toMatchObject({ fitnessGoal: 'muscle_gain', targetWeightKg: null, changedFields: ['targetWeightKg'] });
    expect(history[2]).toMatchObject({ fitnessGoal: 'muscle_gain', targetWeightKg: 80, changeKind: 'initial' });
  });
});
