const localIsoDate = (date: Date): string => [
  date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')
].join('-');

function parseWorkoutCalendarDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Informe uma data válida para o calendário semanal.');
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime()) || localIsoDate(date) !== value) {
    throw new Error('Informe uma data válida para o calendário semanal.');
  }
  return date;
}

export function getWorkoutWeekDates(referenceDate: string): string[] {
  const monday = parseWorkoutCalendarDate(referenceDate);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return localIsoDate(date);
  });
}

export function shiftWorkoutWeek(referenceDate: string, weeks: number): string {
  if (!Number.isInteger(weeks) || Math.abs(weeks) > 520) {
    throw new Error('O deslocamento semanal deve ser um número inteiro entre -520 e 520.');
  }
  const date = parseWorkoutCalendarDate(referenceDate);
  date.setDate(date.getDate() + weeks * 7);
  return localIsoDate(date);
}
