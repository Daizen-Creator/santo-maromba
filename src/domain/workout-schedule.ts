import { WorkoutScheduleEntry, WorkoutScheduleKind, WorkoutSession } from '../shared/types';

export type WorkoutScheduleStatus = WorkoutScheduleKind | 'scheduled' | 'completed' | 'partial' | 'missed';

export interface PlannedWorkoutStreak {
  completedSessions: number;
  latestCompletedDate?: string;
}

/** Counts consecutive planned training sessions. Rest, deload and unplanned days are not streak days. */
export function getPlannedWorkoutStreak(
  schedule: WorkoutScheduleEntry[],
  sessions: WorkoutSession[],
  today: string
): PlannedWorkoutStreak {
  const completedDates = new Set(sessions.filter(session => session.completed).map(session => session.date));
  const todayIsCompleted = completedDates.has(today);
  const trainingEntries = schedule
    .filter(entry => entry.kind === 'training' && entry.date <= today && (entry.date < today || todayIsCompleted))
    .sort((a, b) => b.date.localeCompare(a.date));

  let completedSessions = 0;
  let latestCompletedDate: string | undefined;
  for (const entry of trainingEntries) {
    if (!completedDates.has(entry.date)) break;
    completedSessions += 1;
    latestCompletedDate ??= entry.date;
  }
  return { completedSessions, latestCompletedDate };
}

/** A missed workout is derived only from an explicit past training entry with no logged session that day. */
export function getWorkoutScheduleStatus(
  entry: WorkoutScheduleEntry,
  sessions: WorkoutSession[],
  today: string
): WorkoutScheduleStatus {
  if (entry.kind === 'rest' || entry.kind === 'deload') return entry.kind;
  const daySessions = sessions.filter(session => session.date === entry.date);
  if (daySessions.some(session => session.completed)) return 'completed';
  if (daySessions.length > 0) return 'partial';
  return entry.date < today ? 'missed' : 'scheduled';
}
