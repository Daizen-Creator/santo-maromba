import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDatabaseDriver, IDatabase } from '../database/driver';
import { runMigrations } from '../database/migrations';
import { FitTrackService } from '../services/fittrack-service';
import { api } from '../renderer/services/api';

describe('Medidas corporais personalizadas', () => {
  let tempDirectory = '';
  let db: IDatabase | null = null;

  afterEach(() => {
    db?.close();
    db = null;
    if (tempDirectory && fs.existsSync(tempDirectory)) fs.rmSync(tempDirectory, { recursive: true, force: true });
    vi.unstubAllGlobals();
  });

  it('persiste definição e valores, permite editar por data e reabre o SQLite', async () => {
    tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'santo-maromba-custom-measure-'));
    const databasePath = path.join(tempDirectory, 'fittrack.db');
    db = await createDatabaseDriver(databasePath);
    await runMigrations(db);
    let service = new FitTrackService(db);

    const definition = service.saveCustomMeasurementDefinition({ name: 'Antebraço', unit: 'cm' });
    const first = service.saveCustomMeasurement({ definitionId: definition.id, date: '2026-10-20', value: 29.5 });
    const updated = service.saveCustomMeasurement({ definitionId: definition.id, date: '2026-10-20', value: 30, notes: 'Medido relaxado' });
    service.saveCustomMeasurement({ definitionId: definition.id, date: '2026-10-22', value: 30.2 });

    expect(updated.id).toBe(first.id);
    expect(service.getCustomMeasurements().records).toHaveLength(2);
    expect(() => service.saveCustomMeasurementDefinition({ name: 'antebraço', unit: 'cm' })).toThrow('Já existe');
    expect(() => service.saveCustomMeasurement({ definitionId: 'missing', date: '2026-10-22', value: 1 })).toThrow('não existe');

    db.close();
    db = await createDatabaseDriver(databasePath);
    await runMigrations(db);
    service = new FitTrackService(db);
    expect(service.getCustomMeasurements()).toMatchObject({
      definitions: [{ id: definition.id, name: 'Antebraço', unit: 'cm' }],
      records: [
        { definitionId: definition.id, date: '2026-10-22', value: 30.2 },
        { definitionId: definition.id, date: '2026-10-20', value: 30, notes: 'Medido relaxado' }
      ]
    });
    expect(db.queryOne<{ version: number }>('SELECT version FROM schema_version WHERE version = 16')?.version).toBe(16);
  });

  it('salva e consulta definições e histórico no armazenamento offline da PWA', async () => {
    const values = new Map<string, string>();
    vi.stubGlobal('window', undefined);
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value)
    });

    const definition = await api.saveCustomMeasurementDefinition({ name: 'Pescoço', unit: 'cm' });
    const first = await api.saveCustomMeasurement({ definitionId: definition.id, date: '2026-10-22', value: 38 });
    const updated = await api.saveCustomMeasurement({ definitionId: definition.id, date: '2026-10-22', value: 38.4 });
    const reopened = await api.getCustomMeasurements();

    expect(updated.id).toBe(first.id);
    expect(reopened.definitions).toEqual([definition]);
    expect(reopened.records).toHaveLength(1);
    expect(reopened.records[0].value).toBe(38.4);
    expect(values.size).toBe(2);
    await expect(api.saveCustomMeasurementDefinition({ name: 'pescoço', unit: 'cm' })).rejects.toThrow('Já existe');
  });
});
