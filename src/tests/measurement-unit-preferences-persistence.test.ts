import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDatabaseDriver, IDatabase } from '../database/driver';
import { runMigrations } from '../database/migrations';
import { CustomizationRepository } from '../database/repositories/customization-repository';
import { api } from '../renderer/services/api';

describe('Preferências persistentes de unidades', () => {
  let tempDirectory = '';
  let db: IDatabase | null = null;

  afterEach(() => {
    db?.close();
    db = null;
    if (tempDirectory && fs.existsSync(tempDirectory)) fs.rmSync(tempDirectory, { recursive: true, force: true });
    vi.unstubAllGlobals();
  });

  it('salva e reabre as unidades configuradas no SQLite', async () => {
    tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'santo-maromba-units-'));
    const databasePath = path.join(tempDirectory, 'fittrack.db');
    db = await createDatabaseDriver(databasePath);
    await runMigrations(db);
    let repository = new CustomizationRepository(db);
    expect(repository.getMeasurementUnits()).toEqual({ foodMassUnit: 'g', waterVolumeUnit: 'ml' });
    repository.saveMeasurementUnits({ foodMassUnit: 'kg', waterVolumeUnit: 'l' });
    db.close();
    db = await createDatabaseDriver(databasePath);
    await runMigrations(db);
    repository = new CustomizationRepository(db);
    expect(repository.getMeasurementUnits()).toEqual({ foodMassUnit: 'kg', waterVolumeUnit: 'l' });
  });

  it('persiste as preferências no modo PWA offline', async () => {
    const values = new Map<string, string>();
    vi.stubGlobal('window', undefined);
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value)
    });
    expect(await api.getMeasurementUnits()).toEqual({ foodMassUnit: 'g', waterVolumeUnit: 'ml' });
    await api.saveMeasurementUnits({ foodMassUnit: 'kg', waterVolumeUnit: 'l' });
    expect(await api.getMeasurementUnits()).toEqual({ foodMassUnit: 'kg', waterVolumeUnit: 'l' });
    values.set('fittrack_measurement_units', '{invalid');
    expect(await api.getMeasurementUnits()).toEqual({ foodMassUnit: 'g', waterVolumeUnit: 'ml' });
  });
});
