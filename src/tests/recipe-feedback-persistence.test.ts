import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDatabaseDriver, IDatabase } from '../database/driver';
import { runMigrations } from '../database/migrations';
import { NutritionRepository } from '../database/repositories/nutrition-repository';
import { api } from '../renderer/services/api';

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, String(value)); },
    removeItem: key => { values.delete(key); },
    clear: () => values.clear(),
    key: index => [...values.keys()][index] ?? null,
    get length() { return values.size; }
  } as Storage;
}

describe('Avaliação e observações pessoais de receitas', () => {
  let directory = '';
  let db: IDatabase | null = null;

  afterEach(() => {
    db?.close();
    db = null;
    if (directory && fs.existsSync(directory)) fs.rmSync(directory, { recursive: true, force: true });
    vi.unstubAllGlobals();
  });

  it('salva nota e observação no SQLite e recupera após reabrir o banco', async () => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'santo-maromba-recipe-feedback-'));
    const databasePath = path.join(directory, 'fittrack.db');
    db = await createDatabaseDriver(databasePath);
    await runMigrations(db);
    const repository = new NutritionRepository(db);
    const recipe = repository.getRecipes()[0];

    expect(repository.setRecipeFeedback(recipe.id, { rating: 5, personalNotes: '  Repetir com menos sal  ' }))
      .toMatchObject({ userRating: 5, personalNotes: 'Repetir com menos sal' });
    expect(() => repository.setRecipeFeedback(recipe.id, { rating: 6, personalNotes: '' })).toThrow('1 a 5 estrelas');
    expect(() => repository.setRecipeFeedback('receita-inexistente', { rating: 3, personalNotes: '' })).toThrow('Receita não encontrada.');
    expect(() => repository.setRecipeFeedback(recipe.id, { rating: 3, personalNotes: 'x'.repeat(2001) })).toThrow('2.000 caracteres');

    db.close();
    db = await createDatabaseDriver(databasePath);
    await runMigrations(db);
    const reopened = new NutritionRepository(db).getRecipes().find(item => item.id === recipe.id)!;
    expect(reopened).toMatchObject({ userRating: 5, personalNotes: 'Repetir com menos sal' });
    expect(new NutritionRepository(db).setRecipeFeedback(recipe.id, { rating: null, personalNotes: 'Manter a canela' }))
      .toMatchObject({ userRating: undefined, personalNotes: 'Manter a canela' });
  });

  it('mantém avaliação e observação no armazenamento local offline da PWA', async () => {
    vi.stubGlobal('window', undefined);
    vi.stubGlobal('localStorage', memoryStorage());
    const recipe = (await api.getRecipes())[0];
    await api.setRecipeFeedback({ id: recipe.id, rating: 4, personalNotes: 'Boa opção para o pré-treino.' });
    expect((await api.getRecipes()).find(item => item.id === recipe.id))
      .toMatchObject({ userRating: 4, personalNotes: 'Boa opção para o pré-treino.' });
    await api.setRecipeFeedback({ id: recipe.id, rating: null, personalNotes: '' });
    expect((await api.getRecipes()).find(item => item.id === recipe.id))
      .toMatchObject({ userRating: undefined, personalNotes: '' });
    await expect(api.setRecipeFeedback({ id: recipe.id, rating: 0, personalNotes: '' })).rejects.toThrow();
    await expect(api.setRecipeFeedback({ id: recipe.id, rating: 2, personalNotes: 'x'.repeat(2001) })).rejects.toThrow();
  });
});
