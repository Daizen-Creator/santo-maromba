import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDatabaseDriver, IDatabase } from '../database/driver';
import { runMigrations } from '../database/migrations';
import { PersonalDiaryRepository } from '../database/repositories/personal-diary-repository';
import { api } from '../renderer/services/api';
import { PersonalDiaryDateRangeSchema, SavePersonalDiaryEntryInputSchema } from '../shared/schema';

describe('Diário pessoal persistente', () => {
  let tempDirectory = '';
  let db: IDatabase | null = null;

  afterEach(() => {
    db?.close();
    db = null;
    if (tempDirectory && fs.existsSync(tempDirectory)) fs.rmSync(tempDirectory, { recursive: true, force: true });
    vi.unstubAllGlobals();
  });

  it('migra, salva por data, atualiza sem duplicar, consulta e reabre no SQLite', async () => {
    tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'santo-maromba-diary-'));
    const databasePath = path.join(tempDirectory, 'fittrack.db');
    db = await createDatabaseDriver(databasePath);
    await runMigrations(db);
    db.exec('DROP TABLE personal_diary_entries');
    db.execute('DELETE FROM schema_version WHERE version = 23');
    await runMigrations(db);

    let repository = new PersonalDiaryRepository(db);
    const first = repository.save({ date: '2026-10-22', note: 'Treino de pernas e boa disposição.' });
    const updated = repository.save({ date: '2026-10-22', note: 'Treino ajustado por pouco sono.' });
    repository.save({ date: '2026-10-24', note: 'Caminhada leve.' });
    expect(updated.id).toBe(first.id);
    expect(updated.createdAt).toBe(first.createdAt);
    expect(repository.getEntries({ fromDate: '2026-10-22', toDate: '2026-10-22' })).toMatchObject([
      { date: '2026-10-22', note: 'Treino ajustado por pouco sono.' }
    ]);
    expect(db.queryOne<{ version: number }>('SELECT version FROM schema_version WHERE version = 23')?.version).toBe(23);

    db.close();
    db = await createDatabaseDriver(databasePath);
    await runMigrations(db);
    repository = new PersonalDiaryRepository(db);
    expect(repository.getEntries({ fromDate: '2026-10-01', toDate: '2026-10-31' })).toHaveLength(2);
    expect(repository.delete('2026-10-22')).toBe(true);
    expect(repository.delete('2026-10-22')).toBe(false);
    expect(repository.getEntries({ fromDate: '2026-10-01', toDate: '2026-10-31' })).toHaveLength(1);
  });

  it('valida datas, faixa e conteúdo das anotações', () => {
    expect(SavePersonalDiaryEntryInputSchema.safeParse({ date: '2026-02-30', note: 'Texto' }).success).toBe(false);
    expect(SavePersonalDiaryEntryInputSchema.safeParse({ date: '2026-10-22', note: '   ' }).success).toBe(false);
    expect(SavePersonalDiaryEntryInputSchema.safeParse({ date: '2026-10-22', note: 'x'.repeat(3001) }).success).toBe(false);
    expect(PersonalDiaryDateRangeSchema.safeParse({ fromDate: '2026-10-25', toDate: '2026-10-01' }).success).toBe(false);
  });

  it('salva, altera, consulta por período e remove a anotação na PWA offline', async () => {
    const values = new Map<string, string>();
    vi.stubGlobal('window', undefined);
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value)
    });

    const initial = await api.savePersonalDiaryEntry({ date: '2026-10-22', note: 'Primeira anotação.' });
    const updated = await api.savePersonalDiaryEntry({ date: '2026-10-22', note: 'Anotação revisada.' });
    await api.savePersonalDiaryEntry({ date: '2026-10-23', note: 'Outro dia.' });
    expect(updated.id).toBe(initial.id);
    expect(await api.getPersonalDiaryEntries({ fromDate: '2026-10-22', toDate: '2026-10-22' })).toMatchObject([
      { date: '2026-10-22', note: 'Anotação revisada.' }
    ]);
    expect(await api.deletePersonalDiaryEntry('2026-10-22')).toBe(true);
    expect(await api.deletePersonalDiaryEntry('2026-10-22')).toBe(false);
    expect(await api.getPersonalDiaryEntries({ fromDate: '2026-10-01', toDate: '2026-10-31' })).toMatchObject([
      { date: '2026-10-23', note: 'Outro dia.' }
    ]);
  });
});
