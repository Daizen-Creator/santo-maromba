import { DailyMealEntry, LoggedMealInput, NutritionAnalytics, NutritionAnalyticsQuery, NutritionDayTotals } from '../shared/types';

type MacroValues = Pick<NutritionDayTotals, 'calories' | 'proteinG' | 'carbsG' | 'fatsG'>;

export function calculateNutritionAnalytics(
  query: NutritionAnalyticsQuery,
  mealEntries: DailyMealEntry[],
  loggedMeals: LoggedMealInput[]
): NutritionAnalytics {
  const byDate = new Map<string, NutritionDayTotals>();
  const add = (date: string, macros: MacroValues) => {
    if (date < query.fromDate || date > query.toDate) return;
    if (![macros.calories, macros.proteinG, macros.carbsG, macros.fatsG].every(Number.isFinite)) return;
    const daily = byDate.get(date) || { date, calories: 0, proteinG: 0, carbsG: 0, fatsG: 0, mealsLogged: 0 };
    daily.calories += macros.calories;
    daily.proteinG += macros.proteinG;
    daily.carbsG += macros.carbsG;
    daily.fatsG += macros.fatsG;
    daily.mealsLogged += 1;
    byDate.set(date, daily);
  };

  for (const meal of loggedMeals) add(meal.date, meal);
  for (const meal of mealEntries) {
    if (meal.status === 'consumed' || meal.status === 'partial') add(meal.date, meal);
  }

  const days = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  if (!days.length) return { ...query, trackedDays: 0, averages: null, days: [] };
  const totals = days.reduce((sum, day) => ({
    calories: sum.calories + day.calories,
    proteinG: sum.proteinG + day.proteinG,
    carbsG: sum.carbsG + day.carbsG,
    fatsG: sum.fatsG + day.fatsG
  }), { calories: 0, proteinG: 0, carbsG: 0, fatsG: 0 });
  const averages = Object.fromEntries(
    Object.entries(totals).map(([key, value]) => [key, value / days.length])
  ) as NutritionAnalytics['averages'];
  return { ...query, trackedDays: days.length, averages, days };
}
