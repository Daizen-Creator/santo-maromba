import { IDatabase } from '../driver';
import { WeightRecord } from '../../shared/types';

export class WeightRepository {
  constructor(private db: IDatabase) {}

  getAll(profileId: string = 'default-user'): WeightRecord[] {
    const rows = this.db.query<any>(
      'SELECT * FROM weight_records WHERE profile_id = ? ORDER BY date ASC, created_at ASC',
      [profileId]
    );

    return rows.map(r => ({
      id: r.id,
      date: r.date,
      weightKg: Number(r.weight_kg),
      notes: r.notes || undefined,
      source: r.source,
      createdAt: r.created_at
    }));
  }

  getLatest(profileId: string = 'default-user'): WeightRecord | null {
    const row = this.db.queryOne<any>(
      'SELECT * FROM weight_records WHERE profile_id = ? ORDER BY date DESC, created_at DESC LIMIT 1',
      [profileId]
    );

    if (!row) return null;

    return {
      id: row.id,
      date: row.date,
      weightKg: Number(row.weight_kg),
      notes: row.notes || undefined,
      source: row.source,
      createdAt: row.created_at
    };
  }

  addRecord(
    record: { date: string; weightKg: number; notes?: string; source?: 'verified' | 'self_reported' },
    profileId: string = 'default-user'
  ): WeightRecord {
    const id = `weight-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const source = record.source || 'verified';

    this.db.execute(
      `INSERT INTO weight_records (id, profile_id, date, weight_kg, notes, source, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, profileId, record.date, record.weightKg, record.notes || null, source, now]
    );

    return {
      id,
      date: record.date,
      weightKg: record.weightKg,
      notes: record.notes,
      source,
      createdAt: now
    };
  }

  updateRecord(
    id: string,
    updates: { date?: string; weightKg?: number; notes?: string; source?: 'verified' | 'self_reported' }
  ): WeightRecord {
    const existing = this.db.queryOne<any>('SELECT * FROM weight_records WHERE id = ?', [id]);
    if (!existing) {
      throw new Error(`Registro de peso não encontrado para o ID: ${id}`);
    }

    const date = updates.date ?? existing.date;
    const weightKg = updates.weightKg ?? Number(existing.weight_kg);
    const notes = updates.notes !== undefined ? updates.notes : existing.notes;
    const source = updates.source ?? existing.source;

    this.db.execute(
      `UPDATE weight_records SET date = ?, weight_kg = ?, notes = ?, source = ? WHERE id = ?`,
      [date, weightKg, notes, source, id]
    );

    return {
      id,
      date,
      weightKg,
      notes: notes || undefined,
      source,
      createdAt: existing.created_at
    };
  }

  deleteRecord(id: string): void {
    this.db.execute('DELETE FROM weight_records WHERE id = ?', [id]);
  }

  importInitialReportedData(
    records: Array<{ date: string; weightKg: number; notes: string }>,
    profileId: string = 'default-user'
  ): void {
    this.db.transaction(() => {
      for (const rec of records) {
        // Evita duplicar se já existir registro na mesma data
        const exists = this.db.queryOne(
          'SELECT id FROM weight_records WHERE profile_id = ? AND date = ?',
          [profileId, rec.date]
        );
        if (!exists) {
          const id = `weight-initial-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          const now = new Date().toISOString();
          this.db.execute(
            `INSERT INTO weight_records (id, profile_id, date, weight_kg, notes, source, created_at)
             VALUES (?, ?, ?, ?, ?, 'self_reported', ?)`,
            [id, profileId, rec.date, rec.weightKg, rec.notes, now]
          );
        }
      }
    });
  }
}
