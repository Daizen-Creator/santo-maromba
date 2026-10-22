import { DailyMealEntry, FoodItem, ShoppingListItem } from '../shared/types';
import { getWorkoutWeekDates } from './workout-week-calendar';

const roundGrams = (value: number) => Number(value.toFixed(1));

export function buildShoppingList(
  weekDate: string,
  meals: DailyMealEntry[],
  foods: FoodItem[],
  previousItems: ShoppingListItem[] = [],
  updatedAt = new Date().toISOString()
): ShoppingListItem[] {
  const weekDates = getWorkoutWeekDates(weekDate);
  const monday = weekDates[0];
  const inWeek = new Set(weekDates);
  const foodById = new Map(foods.map(food => [food.id, food]));
  const totals = new Map<string, { foodName: string; amountG: number; category?: FoodItem['category'] }>();

  for (const meal of meals) {
    if (!inWeek.has(meal.date) || ['consumed', 'skipped', 'cancelled'].includes(meal.status)) continue;
    for (const item of meal.items) {
      const remainingG = meal.status === 'partial'
        ? Math.max(0, item.plannedAmountG - item.consumedAmountG)
        : item.plannedAmountG;
      if (!item.foodId || !Number.isFinite(remainingG) || remainingG <= 0) continue;
      const food = foodById.get(item.foodId);
      const previous = totals.get(item.foodId);
      totals.set(item.foodId, {
        foodName: food?.name || previous?.foodName || item.foodName,
        amountG: (previous?.amountG || 0) + remainingG,
        category: food?.category || previous?.category
      });
    }
  }

  const oldByFoodId = new Map(previousItems.filter(item => item.weekStartDate === monday).map(item => [item.foodId, item]));
  return [...totals.entries()]
    .map(([foodId, total]) => {
      const amountG = roundGrams(total.amountG);
      const old = oldByFoodId.get(foodId);
      return {
        id: `shopping-${monday}-${foodId}`,
        weekStartDate: monday,
        foodId,
        foodName: total.foodName,
        amountG,
        category: total.category,
        purchased: old !== undefined && Math.abs(old.amountG - amountG) < 0.05 ? old.purchased : false,
        updatedAt
      };
    })
    .sort((left, right) => (left.category || '').localeCompare(right.category || '') || left.foodName.localeCompare(right.foodName, 'pt-BR'));
}
