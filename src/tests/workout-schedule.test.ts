import { describe, expect, it } from 'vitest';
import { getPlannedWorkoutStreak, getWorkoutScheduleStatus } from '../domain/workout-schedule';
import { WorkoutScheduleEntry, WorkoutSession } from '../shared/types';

const entry = (kind: WorkoutScheduleEntry['kind'], date: string): WorkoutScheduleEntry => ({
  id: `schedule-${date}`, date, kind, createdAt: `${date}T08:00:00.000Z`, updatedAt: `${date}T08:00:00.000Z`
});

const session = (date: string, completed: boolean): WorkoutSession => ({
  id: `session-${date}`, date, splitName: 'Treino A', completed, sets: [], createdAt: `${date}T09:00:00.000Z`
});

describe('Status da agenda de treinos', () => {
  it('mantém descanso e deload como dias planejados distintos', () => {
    expect(getWorkoutScheduleStatus(entry('rest', '2026-10-20'), [], '2026-10-22')).toBe('rest');
    expect(getWorkoutScheduleStatus(entry('deload', '2026-10-20'), [], '2026-10-22')).toBe('deload');
  });

  it('marca perdido apenas um treino passado sem sessão registrada', () => {
    expect(getWorkoutScheduleStatus(entry('training', '2026-10-20'), [], '2026-10-22')).toBe('missed');
    expect(getWorkoutScheduleStatus(entry('training', '2026-10-22'), [], '2026-10-22')).toBe('scheduled');
    expect(getWorkoutScheduleStatus(entry('training', '2026-10-23'), [], '2026-10-22')).toBe('scheduled');
  });

  it('reconhece sessões concluídas e parciais no mesmo dia', () => {
    expect(getWorkoutScheduleStatus(entry('training', '2026-10-20'), [session('2026-10-20', true)], '2026-10-22')).toBe('completed');
    expect(getWorkoutScheduleStatus(entry('training', '2026-10-20'), [session('2026-10-20', false)], '2026-10-22')).toBe('partial');
  });

  it('conta treinos planejados concluídos, ignora descanso/deload e espera o fim do dia atual', () => {
    const schedule = [
      entry('training', '2026-10-19'), entry('rest', '2026-10-20'), entry('training', '2026-10-21'),
      entry('deload', '2026-10-22'), entry('training', '2026-10-23')
    ];
    const sessions = [session('2026-10-19', true), session('2026-10-21', true)];
    expect(getPlannedWorkoutStreak(schedule, sessions, '2026-10-23')).toEqual({
      completedSessions: 2,
      latestCompletedDate: '2026-10-21'
    });
  });

  it('encerra a sequência no primeiro treino passado perdido e não alega sequência sem dados', () => {
    const schedule = [entry('training', '2026-10-20'), entry('rest', '2026-10-21'), entry('training', '2026-10-22')];
    expect(getPlannedWorkoutStreak(schedule, [session('2026-10-20', true)], '2026-10-23'))
      .toEqual({ completedSessions: 0, latestCompletedDate: undefined });
    expect(getPlannedWorkoutStreak([], [], '2026-10-23'))
      .toEqual({ completedSessions: 0, latestCompletedDate: undefined });
  });
});
