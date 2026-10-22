import { DailyMealEntry, DailyMealItemLog, RecentlyUsedFood } from '../shared/types';

export function getRecentlyUsedFoods(entries: DailyMealEntry[], limit = 12): RecentlyUsedFood[] {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error('O limite de alimentos recentes deve ser um inteiro entre 1 e 100.');
  }

  const byFood = new Map<string, RecentlyUsedFood>();
  const orderedEntries = [...entries].sort((a, b) => {
    const aTime = a.completedAt || a.updatedAt;
    const bTime = b.completedAt || b.updatedAt;
    return bTime.localeCompare(aTime);
  });

  for (const entry of orderedEntries) {
    if (entry.status !== 'consumed' && entry.status !== 'partial') continue;
    const usedItems = new Map<string, DailyMealItemLog>();
    for (const item of entry.items) {
      if (!Number.isFinite(item.consumedAmountG) || item.consumedAmountG <= 0 || !item.foodId.trim()) continue;
      const previous = usedItems.get(item.foodId);
      if (previous) previous.consumedAmountG += item.consumedAmountG;
      else usedItems.set(item.foodId, { ...item });
    }

    for (const item of usedItems.values()) {
      const timestamp = entry.completedAt || entry.updatedAt;
      const existing = byFood.get(item.foodId);
      if (!existing) {
        byFood.set(item.foodId, {
          foodId: item.foodId,
          foodName: item.foodName,
          lastUsedDate: entry.date,
          lastUsedAt: timestamp,
          lastAmountG: item.consumedAmountG,
          useCount: 1,
          dataQuality: item.dataQuality,
          dataSource: item.dataSource
        });
      } else {
        existing.useCount += 1;
      }
    }
  }

  return [...byFood.values()]
    .sort((a, b) => b.lastUsedAt.localeCompare(a.lastUsedAt) || a.foodName.localeCompare(b.foodName, 'pt-BR'))
    .slice(0, limit);
}
