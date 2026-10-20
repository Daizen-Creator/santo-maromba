import { randomUUID } from 'crypto';
import { IDatabase } from '../driver';
import { DailyIntakeProgress, HydrationLogInput, LoggedMealInput } from '../../shared/types';

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

  getProgress(date: string): DailyIntakeProgress {
    const meals = this.db.queryOne<any>(
      `SELECT COUNT(*) AS meal_count, SUM(calories) AS calories,
        SUM(protein_g) AS protein_g, SUM(carbs_g) AS carbs_g, SUM(fats_g) AS fats_g
       FROM logged_meals WHERE date = ?`, [date]
    );
    const water = this.db.queryOne<{ amount_ml: number | null; entries: number }>(
      'SELECT SUM(amount_ml) AS amount_ml, COUNT(*) AS entries FROM hydration_logs WHERE date = ?', [date]
    );
    return {
      date,
      calories: Number(meals?.meal_count) > 0 ? Number(meals.calories) : null,
      proteinG: Number(meals?.meal_count) > 0 ? Number(meals.protein_g) : null,
      carbsG: Number(meals?.meal_count) > 0 ? Number(meals.carbs_g) : null,
      fatsG: Number(meals?.meal_count) > 0 ? Number(meals.fats_g) : null,
      waterMl: Number(water?.entries) > 0 ? Number(water?.amount_ml) : null,
      mealsLogged: Number(meals?.meal_count) > 0 ? Number(meals.meal_count) : null
    };
  }
}
