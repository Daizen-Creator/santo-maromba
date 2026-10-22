import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDatabaseDriver, IDatabase } from '../database/driver';
import { runMigrations } from '../database/migrations';
import { INITIAL_FOODS } from '../database/seeds/nutrition-seeds';
import { parseNaturalMealDescription } from '../domain/natural-meal-parser';
import { api } from '../renderer/services/api';
import { FitTrackService } from '../services/fittrack-service';

const phrase = '150 g de peito de frango grelhado e 100 g de arroz branco cozido';

describe('Registro de refeição por texto', () => {
  let tempDirectory = '';
  let db: IDatabase | null = null;

  afterEach(() => {
    db?.close();
    db = null;
    if (tempDirectory && fs.existsSync(tempDirectory)) fs.rmSync(tempDirectory, { recursive: true, force: true });
    vi.unstubAllGlobals();
  });

  it('reconhece alimentos do catálogo e calcula os macros pelas quantidades explícitas', () => {
    const parsed = parseNaturalMealDescription(phrase, INITIAL_FOODS);
    expect(parsed.items.map(item => [item.foodId, item.plannedAmountG])).toEqual([
      ['food-frango', 150], ['food-arroz', 100]
    ]);
    expect(parsed).toMatchObject({ calories: 376, proteinG: 49, carbsG: 28.1, fatsG: 5.6 });
    expect(parsed.items[0]).toMatchObject({ calories: 248, proteinG: 46.5, dataSource: 'TACO/TBCA' });
  });

  it('exige peso explícito, rejeita itens desconhecidos e pede detalhe em caso de ambiguidade', () => {
    expect(() => parseNaturalMealDescription('frango e arroz', INITIAL_FOODS)).toThrow('Informe o peso de cada alimento');
    expect(() => parseNaturalMealDescription('100 g de alimento inventado', INITIAL_FOODS)).toThrow('Não reconheci');
    const similarFood = { ...INITIAL_FOODS[0], id: 'food-frango-alternative', name: 'Peito de Frango Cozido' };
    expect(() => parseNaturalMealDescription('100 g de peito de frango', [...INITIAL_FOODS, similarFood])).toThrow('mais de um alimento');
    expect(() => parseNaturalMealDescription('5001 g de peito de frango grelhado', INITIAL_FOODS)).toThrow('entre 1 g e 5.000 g');
  });

  it('salva itens, quantidades e macros no checklist SQLite e mantém ao reabrir', async () => {
    tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'santo-maromba-natural-meal-'));
    const databasePath = path.join(tempDirectory, 'fittrack.db');
    db = await createDatabaseDriver(databasePath);
    await runMigrations(db);
    let service = new FitTrackService(db);
    const parsed = parseNaturalMealDescription(phrase, service.getFoods());
    service.saveDailyMeal({
      date: '2026-10-22', slotId: 'natural-lunch', mealName: 'Almoço', scheduledTime: '12:30',
      status: 'consumed', items: parsed.items
    });

    db.close();
    db = await createDatabaseDriver(databasePath);
    await runMigrations(db);
    service = new FitTrackService(db);
    const saved = service.getDailyMeals('2026-10-22')[0];
    expect(saved).toMatchObject({ status: 'consumed', calories: 376, proteinG: 49, items: parsed.items });
  });

  it('salva a composição e o consumo no armazenamento offline da PWA', async () => {
    const values = new Map<string, string>();
    vi.stubGlobal('window', undefined);
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value)
    });
    const parsed = parseNaturalMealDescription(phrase, await api.getFoods());
    await api.saveDailyMeal({
      date: '2026-10-22', slotId: 'natural-lunch', mealName: 'Almoço', scheduledTime: '12:30',
      status: 'consumed', items: parsed.items
    });
    expect(await api.getDailyMeals('2026-10-22')).toMatchObject([
      { status: 'consumed', calories: 376, items: parsed.items }
    ]);
  });
});
