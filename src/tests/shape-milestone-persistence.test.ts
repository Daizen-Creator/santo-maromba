import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { createDatabaseDriver, IDatabase } from '../database/driver';
import { runMigrations } from '../database/migrations';
import { FitTrackService } from '../services/fittrack-service';

describe('marcos de evolução no SQLite', () => {
  let directory = '';
  let db: IDatabase | null = null;
  afterEach(() => {
    db?.close();
    db = null;
    if (directory && fs.existsSync(directory)) fs.rmSync(directory, { recursive: true, force: true });
  });

  it('cria, edita, lista, reabre e exclui metas mensuráveis', async () => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'santo-maromba-milestones-'));
    const databasePath = path.join(directory, 'fittrack.db');
    db = await createDatabaseDriver(databasePath);
    await runMigrations(db);
    let service = new FitTrackService(db);
    const saved = service.saveShapeMilestone({
      title: 'Cintura de 80 cm', metric: 'waistCircCm', targetValue: 80, direction: 'decrease',
      targetDate: '2027-01-01', notes: 'Medição mensal'
    });
    expect(saved.id).toMatch(/^shape-milestone-/);
    const updated = service.saveShapeMilestone({
      id: saved.id, title: 'Meta de cintura', metric: 'waistCircCm', targetValue: 78, direction: 'decrease',
      targetDate: '2027-01-01', notes: 'Medição mensal'
    });
    expect(updated).toMatchObject({ id: saved.id, title: 'Meta de cintura', targetValue: 78, notes: 'Medição mensal' });
    expect(db.queryOne<{ version: number }>('SELECT version FROM schema_version WHERE version = 38')?.version).toBe(38);

    db.close();
    db = await createDatabaseDriver(databasePath);
    await runMigrations(db);
    service = new FitTrackService(db);
    expect(service.getShapeMilestones()).toEqual([updated]);
    service.deleteShapeMilestone(saved.id);
    expect(service.getShapeMilestones()).toEqual([]);
  });
});
