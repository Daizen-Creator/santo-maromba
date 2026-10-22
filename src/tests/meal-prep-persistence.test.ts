import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { createDatabaseDriver, IDatabase } from '../database/driver';
import { runMigrations } from '../database/migrations';
import { FitTrackService } from '../services/fittrack-service';
import { MealPrepEventInput } from '../shared/types';

describe('calendário de preparo de refeições no SQLite', () => {
  let directory = '';
  let db: IDatabase | null = null;
  let service: FitTrackService;

  const makeService = () => new FitTrackService(
    db!, path.join(directory, 'photos'), path.join(directory, 'exercise-media'),
    path.join(directory, 'customization-media'), path.join(directory, 'meal-photos')
  );

  afterEach(() => {
    db?.close();
    db = null;
    if (directory && fs.existsSync(directory)) fs.rmSync(directory, { recursive: true, force: true });
  });

  it('salva, edita, consulta, reabre e exclui horários de preparo sem alterar refeições consumidas', async () => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'santo-maromba-meal-prep-'));
    db = await createDatabaseDriver(path.join(directory, 'fittrack.db'));
    await runMigrations(db);
    service = makeService();
    const recipe = service.getRecipes()[0];
    const input: MealPrepEventInput = {
      date: '2026-10-24', scheduledTime: '10:30', recipeId: recipe.id,
      servings: 6, notes: 'Separar em marmitas', status: 'planned'
    };
    const saved = service.saveMealPrepEvent(input);
    expect(saved).toMatchObject({
      date: input.date, scheduledTime: input.scheduledTime, recipeId: recipe.id,
      recipeName: recipe.name, servings: 6, status: 'planned'
    });

    const updated = service.saveMealPrepEvent({ ...input, id: saved.id, scheduledTime: '11:00', status: 'prepared' });
    expect(updated).toMatchObject({ id: saved.id, scheduledTime: '11:00', status: 'prepared', createdAt: saved.createdAt });
    expect(service.getMealPrepEvents({ fromDate: '2026-10-24', toDate: '2026-10-25' })).toHaveLength(1);
    expect(service.getMealPrepEvents({ fromDate: '2026-10-25', toDate: '2026-10-26' })).toEqual([]);
    expect(db.queryOne<{ version: number }>('SELECT version FROM schema_version WHERE version = 36')?.version).toBe(36);

    db.close();
    db = await createDatabaseDriver(path.join(directory, 'fittrack.db'));
    await runMigrations(db);
    service = makeService();
    expect(service.getMealPrepEvents({ fromDate: '2026-10-24', toDate: '2026-10-24' })[0])
      .toMatchObject({ id: saved.id, status: 'prepared', scheduledTime: '11:00' });
    service.deleteMealPrepEvent(saved.id);
    expect(service.getMealPrepEvents({ fromDate: input.date, toDate: input.date })).toEqual([]);
    expect(() => service.deleteMealPrepEvent(saved.id)).toThrow('não existe');
  });
});
