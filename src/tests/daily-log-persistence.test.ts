import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDatabaseDriver, IDatabase } from '../database/driver';
import { runMigrations } from '../database/migrations';
import { ProfileRepository } from '../database/repositories/profile-repository';
import { FitTrackService } from '../services/fittrack-service';

const localDate = (): string => {
  const now = new Date();
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
};

describe('Registros reais do painel diário', () => {
  let directory: string;
  let dbPath: string;
  let db: IDatabase | null = null;
  let service: FitTrackService;

  beforeEach(async () => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'santo-maromba-daily-'));
    dbPath = path.join(directory, 'fittrack.db');
    db = await createDatabaseDriver(dbPath);
    await runMigrations(db);
    new ProfileRepository(db).saveProfile({ name: 'Teste', birthDate: '1995-01-01', heightCm: 175, mealsPerDay: 5 });
    service = new FitTrackService(db);
  });

  afterEach(() => {
    db?.close();
    if (directory && fs.existsSync(directory)) fs.rmSync(directory, { recursive: true, force: true });
  });

  it('mantém valores vazios sem registros e relê totais reais após reabrir o SQLite', async () => {
    const initial = service.getDashboardSummary();
    expect(initial.caloriesLogged).toBeNull();
    expect(initial.waterLoggedMl).toBeNull();
    expect(initial.completedMeals).toBeNull();

    service.logMeal({ date: localDate(), mealName: 'Almoço', calories: 620, proteinG: 42, carbsG: 70, fatsG: 16 });
    service.logMeal({ date: localDate(), mealName: 'Lanche', calories: 310, proteinG: 24, carbsG: 36, fatsG: 8 });
    service.logWater({ date: localDate(), amountMl: 500 });
    service.logWater({ date: localDate(), amountMl: 350 });

    const logged = service.getDashboardSummary();
    expect(logged.caloriesLogged).toBe(930);
    expect(logged.proteinLoggedG).toBe(66);
    expect(logged.completedMeals).toBe(2);
    expect(logged.totalPlannedMeals).toBe(5);
    expect(logged.waterLoggedMl).toBe(850);

    db!.close();
    db = null;
    const reopened = await createDatabaseDriver(dbPath);
    db = reopened;
    await runMigrations(reopened);
    service = new FitTrackService(reopened);
    const restored = service.getDashboardSummary();
    expect(restored.caloriesLogged).toBe(930);
    expect(restored.waterLoggedMl).toBe(850);
    expect(restored.completedMeals).toBe(2);
  });
});
