export type GoalDeadlineStatus = 'upcoming' | 'today' | 'overdue';

export interface GoalDeadlineProgress {
  daysRemaining: number;
  status: GoalDeadlineStatus;
  remainingWeightKg: number | null;
  weeklyChangeNeededKg: number | null;
}

function calendarDay(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
    ? Math.floor(parsed.getTime() / 86_400_000)
    : null;
}

function localDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function getGoalDeadlineProgress(
  targetDate: string,
  currentWeightKg: number | null,
  targetWeightKg: number | null,
  today: string = localDateString(new Date())
): GoalDeadlineProgress | null {
  const deadlineDay = calendarDay(targetDate);
  const todayDay = calendarDay(today);
  if (deadlineDay === null || todayDay === null) return null;

  const daysRemaining = deadlineDay - todayDay;
  const hasWeights = Number.isFinite(currentWeightKg) && Number.isFinite(targetWeightKg)
    && Number(currentWeightKg) > 0 && Number(targetWeightKg) > 0;
  const remainingWeightKg = hasWeights ? Number((Number(targetWeightKg) - Number(currentWeightKg)).toFixed(1)) : null;
  return {
    daysRemaining,
    status: daysRemaining < 0 ? 'overdue' : daysRemaining === 0 ? 'today' : 'upcoming',
    remainingWeightKg,
    weeklyChangeNeededKg: daysRemaining > 0 && remainingWeightKg !== null
      ? Number((remainingWeightKg * 7 / daysRemaining).toFixed(2))
      : null
  };
}
