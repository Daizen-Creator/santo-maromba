import { DailyMealEntry, DailyMealStatus } from '../shared/types';

export const DAILY_MEAL_STATUSES: DailyMealStatus[] = [
  'pending', 'preparing', 'consumed', 'partial', 'deferred', 'skipped', 'cancelled'
];

export function summarizeDailyMealStatuses(
  scheduledSlotIds: string[],
  entries: Pick<DailyMealEntry, 'slotId' | 'status'>[]
): Record<DailyMealStatus, number> {
  const counts = Object.fromEntries(DAILY_MEAL_STATUSES.map(status => [status, 0])) as Record<DailyMealStatus, number>;
  const statusBySlot = new Map(entries.map(entry => [entry.slotId, entry.status]));
  const scheduledSlots = new Set(scheduledSlotIds);
  const countedSlots = new Set<string>();

  for (const slotId of scheduledSlots) {
    counts[statusBySlot.get(slotId) || 'pending'] += 1;
    countedSlots.add(slotId);
  }
  for (const entry of entries) {
    if (countedSlots.has(entry.slotId)) continue;
    counts[entry.status] += 1;
    countedSlots.add(entry.slotId);
  }
  return counts;
}
