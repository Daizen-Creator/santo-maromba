import { WorkoutScheduleEntry, WorkoutScheduleKind, WorkoutSession } from '../shared/types';

export type WorkoutScheduleStatus = WorkoutScheduleKind | 'scheduled' | 'completed' | 'partial' | 'missed';

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
