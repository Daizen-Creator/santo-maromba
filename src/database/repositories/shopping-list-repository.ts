import { IDatabase } from '../driver';
import { DailyLogRepository } from './daily-log-repository';
import { FoodCategory, FoodItem, ShoppingListItem, ShoppingListPurchaseInput } from '../../shared/types';
import { buildShoppingList } from '../../domain/shopping-list';
import { getWorkoutWeekDates } from '../../domain/workout-week-calendar';

export class ShoppingListRepository {
  constructor(
    private db: IDatabase,
    private dailyLogRepository: DailyLogRepository,
    private getFoods: () => FoodItem[]
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
    const now = new Date().toISOString();

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
    const result = this.db.execute(
      'UPDATE shopping_list_items SET purchased = ?, updated_at = ? WHERE week_start_date = ? AND food_id = ?',
      [input.purchased ? 1 : 0, new Date().toISOString(), weekStartDate, input.foodId]
    );
    if (result.changes === 0) throw new Error('O item não pertence à lista de compras desta semana.');
    return this.getByWeek(weekStartDate);
  }
}
