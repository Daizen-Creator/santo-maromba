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

  it('edita a divisão existente sem duplicar o modelo e mantém a alteração após reabrir', async () => {
    const repo = new WorkoutRepository(db!);
    const plans = serializeWorkoutPlans(new WorkoutEngine(INITIAL_EXERCISES).generateSplit(3));
    const original = repo.saveTemplate({ name: 'Divisão editável', plans });
    const changedPlans = plans.map((plan, index) => index === 0
      ? { ...plan, splitTitle: 'Peito e tríceps ajustado', exercises: plan.exercises.slice(0, 2) }
      : plan);

    const updated = repo.saveTemplate({ id: original.id, name: 'Minha divisão', plans: changedPlans });
    expect(updated.id).toBe(original.id);
    expect(updated.name).toBe('Minha divisão');
    expect(updated.plans[0].splitTitle).toBe('Peito e tríceps ajustado');
    expect(updated.plans[0].exercises).toHaveLength(2);
    expect(repo.getTemplates()).toHaveLength(1);

    db!.close();
    db = await createDatabaseDriver(databasePath);
    await runMigrations(db);
    const reopened = new WorkoutRepository(db).getTemplates();
    expect(reopened).toHaveLength(1);
    expect(reopened[0]).toMatchObject({ id: original.id, name: 'Minha divisão' });
    expect(reopened[0].plans[0]).toMatchObject({
      splitTitle: 'Peito e tríceps ajustado'
    });
    const coreExerciseDetails = (items: typeof changedPlans[0]['exercises']) => items.map(({ exerciseId, sets, repRange, restSeconds }) => ({ exerciseId, sets, repRange, restSeconds }));
    expect(coreExerciseDetails(reopened[0].plans[0].exercises)).toEqual(coreExerciseDetails(changedPlans[0].exercises));
  });

  it('rejeita edição de modelo removido e nomes usados por outra divisão', () => {
    const repo = new WorkoutRepository(db!);
    const plans = serializeWorkoutPlans(new WorkoutEngine(INITIAL_EXERCISES).generateSplit(3));
    const first = repo.saveTemplate({ name: 'Divisão um', plans });
    repo.saveTemplate({ name: 'Divisão dois', plans });
    expect(() => repo.saveTemplate({ id: 'workout-template-missing', name: 'Outra', plans })).toThrow('não existe mais');
    expect(() => repo.saveTemplate({ id: first.id, name: 'Divisão dois', plans })).toThrow('Já existe um modelo');
  });

  it('não aceita salvar um modelo sem nenhum exercício', () => {
    const repo = new WorkoutRepository(db!);
    expect(() => repo.saveTemplate({
      name: 'Plano vazio',
      plans: [{ dayName: 'Segunda', splitTitle: 'Descanso', focusMuscles: '', recoveryNotes: '', exercises: [] }]
    })).toThrow('Adicione ao menos um exercício');
  });
});
