import { WorkoutSet } from '../shared/types';

export interface WorkoutSetComparison {
  previous: WorkoutSet;
  weightDeltaKg?: number;
  repsDelta?: number;
  volumeDelta?: number;
}

export function compareWorkoutSetWithHistory(
  current: Pick<WorkoutSet, 'exerciseId' | 'setNumber' | 'weightKg' | 'reps'>,
  history: WorkoutSet[]
): WorkoutSetComparison | null {
  const completedSets = history.filter(set => set.completed && set.exerciseId === current.exerciseId);
  if (completedSets.length === 0) return null;

  const previous = [...completedSets].reverse().find(set => set.setNumber === current.setNumber)
    ?? completedSets[completedSets.length - 1];
  const hasCurrentPerformance = current.weightKg > 0 && current.reps > 0;
  if (!hasCurrentPerformance) return { previous };

  return {
    previous,
    weightDeltaKg: current.weightKg - previous.weightKg,
    repsDelta: current.reps - previous.reps,
    volumeDelta: current.weightKg * current.reps - previous.weightKg * previous.reps
  };
}
