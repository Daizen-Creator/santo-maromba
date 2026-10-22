import { DailyMealEntry } from '../shared/types';

export function sortDailyMealEntries(entries: DailyMealEntry[]): DailyMealEntry[] {
  return [...entries].sort((left, right) => {
    if (left.sortOrder !== undefined && right.sortOrder !== undefined && left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }
    if (left.sortOrder !== undefined && right.sortOrder === undefined) return -1;
    if (left.sortOrder === undefined && right.sortOrder !== undefined) return 1;
    return left.scheduledTime.localeCompare(right.scheduledTime) || left.slotId.localeCompare(right.slotId);
  });
}

export function moveDailyMealSlot(entries: DailyMealEntry[], slotId: string, direction: -1 | 1): string[] {
  const orderedSlotIds = sortDailyMealEntries(entries).map(entry => entry.slotId);
  const currentIndex = orderedSlotIds.indexOf(slotId);
  if (currentIndex < 0) throw new Error('A refeição não existe neste dia.');
  const targetIndex = currentIndex + direction;
  if (targetIndex < 0 || targetIndex >= orderedSlotIds.length) return orderedSlotIds;
  [orderedSlotIds[currentIndex], orderedSlotIds[targetIndex]] = [orderedSlotIds[targetIndex], orderedSlotIds[currentIndex]];
  return orderedSlotIds;
}
