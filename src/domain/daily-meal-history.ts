import { DailyMealEntry, DailyMealHistoryQuery } from '../shared/types';
import { getMealTurnLabel, inferMealTurn } from './meal-turn';

const normalize = (value: string) => value.trim().toLocaleLowerCase('pt-BR')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export function filterDailyMealHistory(entries: DailyMealEntry[], query: DailyMealHistoryQuery): DailyMealEntry[] {
  const needle = normalize(query.search || '');
  return entries
    .filter(entry => entry.date >= query.fromDate && entry.date <= query.toDate)
    .filter(entry => !needle || normalize([
      entry.mealName,
      getMealTurnLabel(entry.mealTurn || inferMealTurn(entry.slotId, entry.mealName)),
      entry.note || '',
      ...(Array.isArray(entry.items) ? entry.items.map(item => item.foodName || '') : [])
    ].join(' ')).includes(needle))
    .sort((a, b) => b.date.localeCompare(a.date)
      || b.scheduledTime.localeCompare(a.scheduledTime)
      || b.updatedAt.localeCompare(a.updatedAt));
}
