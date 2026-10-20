import fs from 'fs';
import path from 'path';
import initSqlJs, { Database as SqlJsDB } from 'sql.js';

export interface IDatabase {
  query<T = any>(sql: string, params?: any[]): T[];
  queryOne<T = any>(sql: string, params?: any[]): T | undefined;
  execute(sql: string, params?: any[]): { changes: number; lastInsertRowid: number | bigint };
  exec(sql: string): void;
  transaction<T>(fn: () => T): T;
  close(): void;
  save(): void;
}

/**
 * Implementação baseada em sql.js (WebAssembly SQLite)
 * 100% livre de incompatibilidades de compilação C++, offline, transacional e persistida em disco.
 */
export class SqlJsDatabase implements IDatabase {
  private db: SqlJsDB;
  private filePath: string;
  private inTransaction = false;

  constructor(db: SqlJsDB, filePath: string) {
    this.db = db;
    this.filePath = filePath;
  }

  static async create(filePath: string): Promise<SqlJsDatabase> {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const SQL = await initSqlJs();
    let db: SqlJsDB;

    if (fs.existsSync(filePath)) {
      const buffer = fs.readFileSync(filePath);
      db = new SQL.Database(buffer);
    } else {
      db = new SQL.Database();
    }

    // Ativar foreign keys
    db.run('PRAGMA foreign_keys = ON;');

    const instance = new SqlJsDatabase(db, filePath);
    instance.save();
    return instance;
  }

  query<T = any>(sql: string, params: any[] = []): T[] {
    const stmt = this.db.prepare(sql);
    try {
      stmt.bind(params);
      const rows: T[] = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject() as unknown as T);
      }
      return rows;
    } finally {
      stmt.free();
    }
  }

  queryOne<T = any>(sql: string, params: any[] = []): T | undefined {
    const rows = this.query<T>(sql, params);
    return rows.length > 0 ? rows[0] : undefined;
  }

  execute(sql: string, params: any[] = []): { changes: number; lastInsertRowid: number | bigint } {
    this.db.run(sql, params);
    const changesRes = this.db.exec('SELECT changes() as c, last_insert_rowid() as id');
    let changes = 0;
    let lastInsertRowid: number = 0;

    if (changesRes.length > 0 && changesRes[0].values.length > 0) {
      changes = (changesRes[0].values[0][0] as number) || 0;
      lastInsertRowid = (changesRes[0].values[0][1] as number) || 0;
    }

    if (!this.inTransaction) {
      this.save();
    }

    return { changes, lastInsertRowid };
  }

  exec(sql: string): void {
    this.db.exec(sql);
    if (!this.inTransaction) {
      this.save();
    }
  }

  transaction<T>(fn: () => T): T {
    this.inTransaction = true;
    this.db.run('BEGIN TRANSACTION;');
    let result: T;
    try {
      result = fn();
      this.db.run('COMMIT;');
    } catch (error) {
      try {
        this.db.run('ROLLBACK;');
      } catch (rollbackError) {
        console.error('[DatabaseDriver] Erro ao reverter transação:', rollbackError);
      }
      this.inTransaction = false;
      throw error;
    }
    this.inTransaction = false;
    this.save();
    return result;
  }

  save(): void {
    const tempPath = `${this.filePath}.tmp`;
    try {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(tempPath, buffer);
      fs.renameSync(tempPath, this.filePath);
    } catch (err) {
      console.error('[DatabaseDriver] Erro ao salvar banco em disco:', err);
      try {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      } catch (cleanupError) {
        console.error('[DatabaseDriver] Não foi possível limpar o arquivo temporário:', cleanupError);
      }
      throw err;
    }
  }

  close(): void {
    this.save();
    this.db.close();
  }
}

/**
 * Driver Factory
 */
export async function createDatabaseDriver(dbPath: string): Promise<IDatabase> {
  // Inicialização resiliente e segura
  return await SqlJsDatabase.create(dbPath);
}
