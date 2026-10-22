import { randomUUID } from 'crypto';
import { IDatabase } from '../driver';
import { DailyIntakeProgress, DailyMealEntry, DailyMealEntryInput, DailyMealHistoryQuery, HydrationLogInput, LoggedMealInput, RecentlyUsedFood } from '../../shared/types';
import { getRecentlyUsedFoods } from '../../domain/recent-foods';
import { filterDailyMealHistory } from '../../domain/daily-meal-history';

export class DailyLogRepository {
  constructor(private db: IDatabase) {}

  addMeal(input: LoggedMealInput): void {
    this.db.execute(
      `INSERT INTO logged_meals (
        id, date, meal_name, calories, protein_g, carbs_g, fats_g, items_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'meal-' + randomUUID(), input.date, input.mealName.trim(), input.calories,
        input.proteinG, input.carbsG, input.fatsG, '[]', new Date().toISOString()
      ]
    );
  }

  addWater(input: HydrationLogInput): void {
    this.db.execute(
      'INSERT INTO hydration_logs (id, date, amount_ml, logged_at) VALUES (?, ?, ?, ?)',
      ['water-' + randomUUID(), input.date, input.amountMl, new Date().toISOString()]
    );
  }

  getMeals(date: string): DailyMealEntry[] {
    const rows = this.db.query<any>(
      `SELECT * FROM daily_meal_entries WHERE date = ? ORDER BY scheduled_time, slot_id`, [date]
    );
    return rows.map(row => ({
      id: row.id,
      date: row.date,
      slotId: row.slot_id,
      mealName: row.meal_name,
      scheduledTime: row.scheduled_time,
      recipeId: row.recipe_id || undefined,
      status: row.status,
      items: JSON.parse(row.items_json || '[]'),
      calories: Number(row.calories),
      proteinG: Number(row.protein_g),
      carbsG: Number(row.carbs_g),
      fatsG: Number(row.fats_g),
      note: row.note || undefined,
      completedAt: row.completed_at || undefined,
      updatedAt: row.updated_at
    }));
  }

  getRecentlyUsedFoods(limit = 12): RecentlyUsedFood[] {
    const rows = this.db.query<any>(
      `SELECT id, date, slot_id, meal_name, scheduled_time, recipe_id, status, items_json,
              calories, protein_g, carbs_g, fats_g, note, completed_at, updated_at
       FROM daily_meal_entries ORDER BY updated_at DESC`
    );
    const entries: DailyMealEntry[] = [];
    for (const row of rows) {
      try {
        const items = JSON.parse(row.items_json || '[]');
        if (!Array.isArray(items)) continue;
        entries.push({
          id: row.id,
          date: row.date,
          slotId: row.slot_id,
          mealName: row.meal_name,
          scheduledTime: row.scheduled_time,
          recipeId: row.recipe_id || undefined,
          status: row.status,
          items,
          calories: Number(row.calories),
          proteinG: Number(row.protein_g),
          carbsG: Number(row.carbs_g),
          fatsG: Number(row.fats_g),
          note: row.note || undefined,
          completedAt: row.completed_at || undefined,
          updatedAt: row.updated_at
        });
      } catch {
        // Um lançamento legado/corrompido não deve bloquear a consulta das outras refeições.
      }
    }
    return getRecentlyUsedFoods(entries, limit);
  }

  getMealHistory(query: DailyMealHistoryQuery): DailyMealEntry[] {
    const rows = this.db.query<any>(
      `SELECT * FROM daily_meal_entries WHERE date >= ? AND date <= ?
       ORDER BY date DESC, scheduled_time DESC, updated_at DESC`,
      [query.fromDate, query.toDate]
    );
    const entries: DailyMealEntry[] = [];
    for (const row of rows) {
      try {
        const items = JSON.parse(row.items_json || '[]');
        if (!Array.isArray(items)) continue;
        entries.push({
          id: row.id,
          date: row.date,
          slotId: row.slot_id,
          mealName: row.meal_name,
          scheduledTime: row.scheduled_time,
          recipeId: row.recipe_id || undefined,
          status: row.status,
          items,
          calories: Number(row.calories),
          proteinG: Number(row.protein_g),
          carbsG: Number(row.carbs_g),
          fatsG: Number(row.fats_g),
          note: row.note || undefined,
          completedAt: row.completed_at || undefined,
          updatedAt: row.updated_at
        });
      } catch {
        // Ignora somente o registro inválido; os demais continuam pesquisáveis.
      }
    }
    return filterDailyMealHistory(entries, query);
  }

  saveMeal(input: DailyMealEntryInput): DailyMealEntry {
    const now = new Date().toISOString();
    const countsAsConsumed = input.status === 'consumed' || input.status === 'partial';
    const totals = input.items.reduce((sum, item) => {
      const ratio = countsAsConsumed && item.plannedAmountG > 0
        ? item.consumedAmountG / item.plannedAmountG
        : 0;
      sum.calories += item.calories * ratio;
      sum.proteinG += item.proteinG * ratio;
      sum.carbsG += item.carbsG * ratio;
      sum.fatsG += item.fatsG * ratio;
      return sum;
    }, { calories: 0, proteinG: 0, carbsG: 0, fatsG: 0 });
    const id = `daily-meal-${input.date}-${input.slotId}`;
    const completedAt = countsAsConsumed ? now : null;

    this.db.execute(
      `INSERT INTO daily_meal_entries (
        id, date, slot_id, meal_name, scheduled_time, recipe_id, status, items_json,
        calories, protein_g, carbs_g, fats_g, note, completed_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(date, slot_id) DO UPDATE SET
        meal_name = excluded.meal_name, scheduled_time = excluded.scheduled_time,
        recipe_id = excluded.recipe_id, status = excluded.status, items_json = excluded.items_json,
        calories = excluded.calories, protein_g = excluded.protein_g, carbs_g = excluded.carbs_g,
        fats_g = excluded.fats_g, note = excluded.note, completed_at = excluded.completed_at,
        updated_at = excluded.updated_at`,
      [id, input.date, input.slotId, input.mealName.trim(), input.scheduledTime, input.recipeId || null,
        input.status, JSON.stringify(input.items), totals.calories, totals.proteinG, totals.carbsG,
        totals.fatsG, input.note?.trim() || null, completedAt, now]
    );
    return this.getMeals(input.date).find(meal => meal.slotId === input.slotId)!;
  }

  getProgress(date: string): DailyIntakeProgress {
    const meals = this.db.queryOne<any>(
      `SELECT COUNT(*) AS meal_count, SUM(calories) AS calories,
        SUM(protein_g) AS protein_g, SUM(carbs_g) AS carbs_g, SUM(fats_g) AS fats_g
       FROM logged_meals WHERE date = ?`, [date]
    );
    const checkedMeals = this.db.queryOne<any>(
      `SELECT COUNT(*) AS meal_count, SUM(calories) AS calories,
        SUM(protein_g) AS protein_g, SUM(carbs_g) AS carbs_g, SUM(fats_g) AS fats_g
       FROM daily_meal_entries WHERE date = ? AND status IN ('consumed', 'partial')`, [date]
    );
    const water = this.db.queryOne<{ amount_ml: number | null; entries: number }>(
      'SELECT SUM(amount_ml) AS amount_ml, COUNT(*) AS entries FROM hydration_logs WHERE date = ?', [date]
    );
    const mealCount = Number(meals?.meal_count || 0) + Number(checkedMeals?.meal_count || 0);
    const total = (key: 'calories' | 'protein_g' | 'carbs_g' | 'fats_g') => {
      if (mealCount === 0) return null;
      return Number(meals?.[key] || 0) + Number(checkedMeals?.[key] || 0);
    };
    return {
      date,
      calories: total('calories'),
      proteinG: total('protein_g'),
      carbsG: total('carbs_g'),
      fatsG: total('fats_g'),
      waterMl: Number(water?.entries) > 0 ? Number(water?.amount_ml) : null,
      mealsLogged: mealCount > 0 ? mealCount : null
    };
  }
}
