import { describe, expect, it } from 'vitest';
import { getWorkoutWeekDates, shiftWorkoutWeek } from '../domain/workout-week-calendar';

describe('Calendário semanal de treinos', () => {
  it('mostra segunda a domingo da semana que contém a data selecionada', () => {
    expect(getWorkoutWeekDates('2026-10-22')).toEqual([
      '2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25'
    ]);
  });

  it('navega semanas através de mudança de mês e de ano', () => {
    expect(shiftWorkoutWeek('2026-12-31', 1)).toBe('2027-01-07');
    expect(shiftWorkoutWeek('2027-01-07', -1)).toBe('2026-12-31');
    expect(getWorkoutWeekDates('2027-01-01')[0]).toBe('2026-12-28');
  });

  it('rejeita datas impossíveis e deslocamentos não inteiros', () => {
    expect(() => getWorkoutWeekDates('2026-02-30')).toThrow('data válida');
    expect(() => shiftWorkoutWeek('2026-10-22', 0.5)).toThrow('número inteiro');
  });
});
