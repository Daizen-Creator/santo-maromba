import path from 'path';
import fs from 'fs';
import { createDatabaseDriver, IDatabase } from './driver';
import { runMigrations } from './migrations';

let dbInstance: IDatabase | null = null;

export async function getDatabase(customPath?: string): Promise<IDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  let dbPath = customPath;
  if (!dbPath) {
    // Se estiver rodando dentro do Electron main process
    try {
      const { app } = require('electron');
      if (app && typeof app.getPath === 'function') {
        const userData = app.getPath('userData');
        dbPath = path.join(userData, 'fittrack.db');
      }
    } catch {
      // Ignora se não estiver no contexto do electron
    }
  }

  if (!dbPath) {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    dbPath = path.join(dataDir, 'fittrack.db');
  }

  const databaseAlreadyExisted = fs.existsSync(dbPath);
  dbInstance = await createDatabaseDriver(dbPath);

  // Snapshot only databases that still need migration; never label a current database as pre-migration.
  if (databaseAlreadyExisted) {
    let nutritionMigrationApplied = false;
    try {
      nutritionMigrationApplied = Boolean(
        dbInstance.queryOne<{ version: number }>('SELECT version FROM schema_version WHERE version = 8')
      );
    } catch {
      // Databases predating the migration table also need a pre-migration snapshot.
    }
    const preNutritionBackup = `${dbPath}.pre-v8.bak`;
    if (!nutritionMigrationApplied && !fs.existsSync(preNutritionBackup)) {
      fs.copyFileSync(dbPath, preNutritionBackup, fs.constants.COPYFILE_EXCL);
    }
  }

  await runMigrations(dbInstance);

  return dbInstance;
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
