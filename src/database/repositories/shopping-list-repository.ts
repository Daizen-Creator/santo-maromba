import { IDatabase } from '../driver';
import { DailyLogRepository } from './daily-log-repository';
import { FoodCategory, FoodItem, ShoppingListItem, ShoppingListPurchaseInput } from '../../shared/types';
import { buildShoppingList } from '../../domain/shopping-list';
import { getWorkoutWeekDates } from '../../domain/workout-week-calendar';
import { summarizeShoppingExpenses } from '../../domain/shopping-expenses';
import { NutritionAnalyticsQuery, ShoppingExpenseRecord, ShoppingExpenseSummary } from '../../shared/types';
import { randomUUID } from 'crypto';

export class ShoppingListRepository {
  constructor(
    private db: IDatabase,
    private dailyLogRepository: DailyLogRepository,
    private getFoods: () => FoodItem[],
    private now: () => Date = () => new Date()
  ) {}

  getByWeek(weekDate: string): ShoppingListItem[] {
    const weekStartDate = getWorkoutWeekDates(weekDate)[0];
    const rows = this.db.query<any>(
      `SELECT * FROM shopping_list_items WHERE week_start_date = ?
       ORDER BY category, food_name COLLATE NOCASE`, [weekStartDate]
    );
    return rows.map(row => ({
      id: row.id,
      weekStartDate: row.week_start_date,
      foodId: row.food_id,
      foodName: row.food_name,
      amountG: Number(row.amount_g),
      category: row.category ? row.category as FoodCategory : undefined,
      purchased: Number(row.purchased) === 1,
      updatedAt: row.updated_at
    }));
  }

  generate(weekDate: string): ShoppingListItem[] {
    const dates = getWorkoutWeekDates(weekDate);
    const weekStartDate = dates[0];
    const meals = this.dailyLogRepository.getMealHistory({ fromDate: weekStartDate, toDate: dates[6] });
    const currentItems = this.getByWeek(weekStartDate);
    const items = buildShoppingList(weekStartDate, meals, this.getFoods(), currentItems);
    const now = this.now().toISOString();

    this.db.transaction(() => {
      this.db.execute('DELETE FROM shopping_list_items WHERE week_start_date = ?', [weekStartDate]);
      for (const item of items) {
        this.db.execute(
          `INSERT INTO shopping_list_items (id, week_start_date, food_id, food_name, category, amount_g, purchased, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [item.id, item.weekStartDate, item.foodId, item.foodName, item.category || null, item.amountG, item.purchased ? 1 : 0, now]
        );
      }
    });
    return this.getByWeek(weekStartDate);
  }

  setPurchased(input: ShoppingListPurchaseInput): ShoppingListItem[] {
    const weekStartDate = getWorkoutWeekDates(input.weekStartDate)[0];
    const item = this.db.queryOne<any>(
      'SELECT * FROM shopping_list_items WHERE week_start_date = ? AND food_id = ?', [weekStartDate, input.foodId]
    );
    if (!item) throw new Error('O item não pertence à lista de compras desta semana.');
    if (Number(item.purchased) === Number(input.purchased)) return this.getByWeek(weekStartDate);

    const now = this.now().toISOString();
    this.db.transaction(() => {
      if (input.purchased) {
        const pantryPrice = this.db.queryOne<any>(
          'SELECT unit_price, price_source, price_updated_at FROM pantry_items WHERE food_id = ?', [input.foodId]
        );
        const hasUserPrice = pantryPrice?.unit_price != null && pantryPrice.price_source && pantryPrice.price_updated_at;
        const unitPricePerKg = hasUserPrice ? Number(pantryPrice.unit_price) : null;
        const totalCost = unitPricePerKg === null
          ? null
          : Math.round((unitPricePerKg * Number(item.amount_g) / 1000 + Number.EPSILON) * 100) / 100;
        this.db.execute(
          `INSERT INTO shopping_expenses
           (id, week_start_date, food_id, food_name, amount_g, purchased_at, unit_price_per_kg, total_cost, price_source)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [randomUUID(), weekStartDate, input.foodId, item.food_name, Number(item.amount_g), now,
            unitPricePerKg, totalCost, hasUserPrice ? pantryPrice.price_source : null]
        );
      } else {
        this.db.execute(
          `DELETE FROM shopping_expenses WHERE id = (
            SELECT id FROM shopping_expenses WHERE week_start_date = ? AND food_id = ?
            ORDER BY purchased_at DESC, id DESC LIMIT 1
          )`, [weekStartDate, input.foodId]
        );
      }
      this.db.execute(
        'UPDATE shopping_list_items SET purchased = ?, updated_at = ? WHERE week_start_date = ? AND food_id = ?',
        [input.purchased ? 1 : 0, now, weekStartDate, input.foodId]
      );
    });
    return this.getByWeek(weekStartDate);
  }

  getExpenses(range: NutritionAnalyticsQuery): ShoppingExpenseSummary {
    const rangeEndExclusive = new Date(Date.parse(`${range.toDate}T00:00:00.000Z`) + 86_400_000).toISOString();
    const rows = this.db.query<any>(
      `SELECT * FROM shopping_expenses WHERE purchased_at >= ? AND purchased_at < ?
       ORDER BY purchased_at, food_name COLLATE NOCASE`,
      [`${range.fromDate}T00:00:00.000Z`, rangeEndExclusive]
    );
    const records: ShoppingExpenseRecord[] = rows.map(row => ({
      id: row.id,
      weekStartDate: row.week_start_date,
      foodId: row.food_id,
      foodName: row.food_name,
      amountG: Number(row.amount_g),
      purchasedAt: row.purchased_at,
      unitPricePerKg: row.unit_price_per_kg == null ? undefined : Number(row.unit_price_per_kg),
      totalCost: row.total_cost == null ? undefined : Number(row.total_cost),
      priceSource: row.price_source || undefined
    }));
    return summarizeShoppingExpenses(range, records);
  }
}
