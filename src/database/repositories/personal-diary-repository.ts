import { randomUUID } from 'crypto';
import { PersonalDiaryDateRange, PersonalDiaryEntry, SavePersonalDiaryEntryInput } from '../../shared/types';
import { IDatabase } from '../driver';

export class PersonalDiaryRepository {
  constructor(private db: IDatabase) {}

  getEntries(range: PersonalDiaryDateRange): PersonalDiaryEntry[] {
    return this.db.query<any>(
      `SELECT id, date, note, created_at, updated_at FROM personal_diary_entries
       WHERE date >= ? AND date <= ? ORDER BY date DESC`,
      [range.fromDate, range.toDate]
    ).map(row => ({
      id: row.id,
      date: row.date,
      note: row.note,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  save(input: SavePersonalDiaryEntryInput): PersonalDiaryEntry {
    const existing = this.db.queryOne<any>(
      'SELECT id, created_at FROM personal_diary_entries WHERE date = ?', [input.date]
    );
    const now = new Date().toISOString();
    const entry: PersonalDiaryEntry = {
      id: existing?.id || `diary-${randomUUID()}`,
      date: input.date,
      note: input.note.trim(),
      createdAt: existing?.created_at || now,
      updatedAt: now
    };
    this.db.execute(
      `INSERT INTO personal_diary_entries (id, date, note, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(date) DO UPDATE SET note = excluded.note, updated_at = excluded.updated_at`,
      [entry.id, entry.date, entry.note, entry.createdAt, entry.updatedAt]
    );
    return entry;
  }

  delete(date: string): boolean {
    return this.db.execute('DELETE FROM personal_diary_entries WHERE date = ?', [date]).changes > 0;
  }
}
