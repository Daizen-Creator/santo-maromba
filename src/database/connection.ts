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

  // Preserve the existing SQLite file before the additive daily-checklist schema is applied.
  // The stable name prevents repeated full copies on every app launch.
  if (fs.existsSync(dbPath)) {
    const preChecklistBackup = `${dbPath}.pre-v7.bak`;
    if (!fs.existsSync(preChecklistBackup)) {
      fs.copyFileSync(dbPath, preChecklistBackup, fs.constants.COPYFILE_EXCL);
    }
  }

  dbInstance = await createDatabaseDriver(dbPath);
  await runMigrations(dbInstance);

  return dbInstance;
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
