import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../renderer/services/api';

const memoryStorage = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, String(value)),
    removeItem: (key: string) => values.delete(key),
    clear: () => values.clear(),
    key: (index: number) => [...values.keys()][index] ?? null,
    get length() { return values.size; }
  } as Storage;
};

describe('calendário de preparo offline da PWA', () => {
  beforeEach(() => {
    vi.stubGlobal('window', undefined);
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: memoryStorage() });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('salva, consulta, atualiza e remove um preparo sem conexão', async () => {
    const recipe = (await api.getRecipes())[0];
    const saved = await api.saveMealPrepEvent({
      date: '2026-10-24', scheduledTime: '08:15', recipeId: recipe.id,
      servings: 4, notes: 'Congelar porções', status: 'planned'
    });
    expect(await api.getMealPrepEvents({ fromDate: '2026-10-19', toDate: '2026-10-25' }))
      .toMatchObject([expect.objectContaining({ id: saved.id, recipeName: recipe.name, status: 'planned' })]);

    const updated = await api.saveMealPrepEvent({
      id: saved.id, date: saved.date, scheduledTime: saved.scheduledTime, recipeId: saved.recipeId,
      servings: saved.servings, notes: saved.notes, status: 'prepared'
    });
    expect(updated).toMatchObject({ id: saved.id, status: 'prepared', createdAt: saved.createdAt });
    await api.deleteMealPrepEvent(saved.id);
    expect(await api.getMealPrepEvents({ fromDate: '2026-10-19', toDate: '2026-10-25' })).toEqual([]);
  });
});
