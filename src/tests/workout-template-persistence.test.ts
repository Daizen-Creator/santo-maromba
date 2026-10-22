import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDatabaseDriver, IDatabase } from '../database/driver';
import { runMigrations } from '../database/migrations';
import { WorkoutRepository } from '../database/repositories/workout-repository';
import { INITIAL_EXERCISES } from '../database/seeds/exercise-seeds';
import { WorkoutEngine } from '../domain/workout-engine';
import { hydrateWorkoutTemplate, serializeWorkoutPlans } from '../domain/workout-templates';

describe('Modelos de treino reutilizáveis', () => {
  let directory: string;
  let databasePath: string;
  let db: IDatabase | null = null;

  beforeEach(async () => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'santo-maromba-workout-template-'));
    databasePath = path.join(directory, 'fittrack.db');
    db = await createDatabaseDriver(databasePath);
    await runMigrations(db);
  });

  afterEach(() => {
    db?.close();
    if (directory && fs.existsSync(directory)) fs.rmSync(directory, { recursive: true, force: true });
  });

  it('salva, reabre e reconstrói os exercícios pelo catálogo depois de reiniciar o banco', async () => {
    const repo = new WorkoutRepository(db!);
    const plans = serializeWorkoutPlans(new WorkoutEngine(INITIAL_EXERCISES).generateSplit(3));
    const expectedExerciseId = plans[0].exercises[0].exerciseId;
    const saved = repo.saveTemplate({ name: 'Full Body A', plans });
    expect(saved.plans[0].exercises[0].exerciseId).toBe(expectedExerciseId);

    db!.close();
    db = await createDatabaseDriver(databasePath);
    await runMigrations(db);
    const reopened = new WorkoutRepository(db).getTemplates();
    expect(reopened).toMatchObject([{ id: saved.id, name: 'Full Body A' }]);
    expect(hydrateWorkoutTemplate(reopened[0], INITIAL_EXERCISES)[0].exercises[0].exercise.id)
      .toBe(expectedExerciseId);
    expect(db.queryOne<{ version: number }>('SELECT version FROM schema_version WHERE version = 13')?.version).toBe(13);
  });

  it('rejeita nome duplicado e exercícios que não existem no catálogo local', () => {
    const repo = new WorkoutRepository(db!);
    const plans = serializeWorkoutPlans(new WorkoutEngine(INITIAL_EXERCISES).generateSplit(3));
    repo.saveTemplate({ name: 'Treino A', plans });
    expect(() => repo.saveTemplate({ name: 'treino a', plans })).toThrow('Já existe um modelo');
    expect(() => repo.saveTemplate({
      name: 'Treino quebrado',
      plans: [{ ...plans[0], exercises: [{ ...plans[0].exercises[0], exerciseId: 'exercise-unknown' }] }]
    })).toThrow('não existe no catálogo local');
  });

  it('não aceita salvar um modelo sem nenhum exercício', () => {
    const repo = new WorkoutRepository(db!);
    expect(() => repo.saveTemplate({
      name: 'Plano vazio',
      plans: [{ dayName: 'Segunda', splitTitle: 'Descanso', focusMuscles: '', recoveryNotes: '', exercises: [] }]
    })).toThrow('Adicione ao menos um exercício');
  });
});
