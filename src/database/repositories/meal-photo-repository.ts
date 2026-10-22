import { IDatabase } from '../driver';
import { MealPhotoRecord } from '../../shared/types';

export interface StoredMealPhotoInput {
  id: string;
  mealEntryId: string;
  date: string;
  slotId: string;
  filePath: string;
}

export interface SavedMealPhoto {
  record: MealPhotoRecord;
  replacedFilePath?: string;
}

export class MealPhotoRepository {
  constructor(private readonly db: IDatabase) {}

  getByDate(date: string): MealPhotoRecord[] {
    return this.db.query<any>('SELECT * FROM meal_photos WHERE date = ? ORDER BY slot_id', [date]).map(row => this.toRecord(row));
  }

  getByIdentity(date: string, slotId: string): MealPhotoRecord | null {
    const row = this.db.queryOne<any>('SELECT * FROM meal_photos WHERE date = ? AND slot_id = ?', [date, slotId]);
    return row ? this.toRecord(row) : null;
  }

  getByMealEntryId(mealEntryId: string): MealPhotoRecord | null {
    const row = this.db.queryOne<any>('SELECT * FROM meal_photos WHERE meal_entry_id = ?', [mealEntryId]);
    return row ? this.toRecord(row) : null;
  }

  getById(id: string): MealPhotoRecord | null {
    const row = this.db.queryOne<any>('SELECT * FROM meal_photos WHERE id = ?', [id]);
    return row ? this.toRecord(row) : null;
  }

  save(input: StoredMealPhotoInput): SavedMealPhoto {
    const replacedFilePath = this.getByMealEntryId(input.mealEntryId)?.filePath;
    const createdAt = new Date().toISOString();
    this.db.execute(`INSERT INTO meal_photos (id, meal_entry_id, date, slot_id, file_path, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(meal_entry_id) DO UPDATE SET id = excluded.id, date = excluded.date, slot_id = excluded.slot_id, file_path = excluded.file_path, created_at = excluded.created_at`,
    [input.id, input.mealEntryId, input.date, input.slotId, input.filePath, createdAt]);
    return {
      record: { id: input.id, mealEntryId: input.mealEntryId, date: input.date, slotId: input.slotId, filePath: input.filePath, createdAt },
      replacedFilePath
    };
  }

  deleteByMealEntryId(mealEntryId: string): string {
    const existing = this.getByMealEntryId(mealEntryId);
    if (!existing) throw new Error('A foto da refeição não foi encontrada.');
    this.db.execute('DELETE FROM meal_photos WHERE meal_entry_id = ?', [mealEntryId]);
    return existing.filePath;
  }

  private toRecord(row: any): MealPhotoRecord {
    return { id: row.id, mealEntryId: row.meal_entry_id, date: row.date, slotId: row.slot_id, filePath: row.file_path, createdAt: row.created_at };
  }
}
