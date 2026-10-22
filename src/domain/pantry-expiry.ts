export type PantryExpiryStatus = 'unknown' | 'valid' | 'expiring' | 'expired';

export interface PantryExpiryReminder {
  status: PantryExpiryStatus;
  daysRemaining?: number;
}

function utcDay(date: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const [year, month, day] = date.split('-').map(Number);
  const time = Date.UTC(year, month - 1, day);
  const parsed = new Date(time);
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day
    ? Math.floor(time / 86_400_000)
    : null;
}

function localDateToday(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

export function getPantryExpiryReminder(
  expiresAt?: string,
  today = localDateToday(),
  warningDays = 7
): PantryExpiryReminder {
  if (!expiresAt) return { status: 'unknown' };
  const expiresDay = utcDay(expiresAt);
  const currentDay = utcDay(today);
  if (expiresDay === null || currentDay === null || !Number.isInteger(warningDays) || warningDays < 0) {
    return { status: 'unknown' };
  }
  const daysRemaining = expiresDay - currentDay;
  if (daysRemaining < 0) return { status: 'expired', daysRemaining };
  if (daysRemaining <= warningDays) return { status: 'expiring', daysRemaining };
  return { status: 'valid', daysRemaining };
}
