import { randomUUID } from 'crypto';
import { IDatabase } from '../driver';
import { MealPrepEvent, MealPrepEventInput, NutritionAnalyticsQuery } from '../../shared/types';

export class MealPrepRepository {
  constructor(private db: IDatabase, private now: () => Date = () => new Date()) {}

  getByRange(range: NutritionAnalyticsQuery): MealPrepEvent[] {
    const rows = this.db.query<any>(
      `SELECT * FROM meal_prep_events WHERE date >= ? AND date <= ?
       ORDER BY date, scheduled_time, created_at`, [range.fromDate, range.toDate]
    );
    return rows.map(row => ({
      id: row.id,
      date: row.date,
      scheduledTime: row.scheduled_time,
      recipeId: row.recipe_id,
      recipeName: row.recipe_name,
      servings: Number(row.servings),
      notes: row.notes || undefined,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  save(input: MealPrepEventInput, recipeName: string): MealPrepEvent {
    const now = this.now().toISOString();
    const id = input.id || randomUUID();
    const existing = input.id
      ? this.db.queryOne<{ created_at: string }>('SELECT created_at FROM meal_prep_events WHERE id = ?', [input.id])
      : undefined;
    if (input.id && !existing) throw new Error('O preparo não existe mais no calendário.');

    if (existing) {
      this.db.execute(
        `UPDATE meal_prep_events SET date = ?, scheduled_time = ?, recipe_id = ?, recipe_name = ?, servings = ?,
         notes = ?, status = ?, updated_at = ? WHERE id = ?`,
        [input.date, input.scheduledTime, input.recipeId, recipeName, input.servings, input.notes || null, input.status, now, id]
      );
    } else {
      this.db.execute(
        `INSERT INTO meal_prep_events
         (id, date, scheduled_time, recipe_id, recipe_name, servings, notes, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, input.date, input.scheduledTime, input.recipeId, recipeName, input.servings, input.notes || null, input.status, now, now]
      );
    }

    return this.getByRange({ fromDate: input.date, toDate: input.date }).find(event => event.id === id)!;
  }

  delete(id: string): void {
    const result = this.db.execute('DELETE FROM meal_prep_events WHERE id = ?', [id]);
    if (result.changes === 0) throw new Error('O preparo não existe mais no calendário.');
  }
}
