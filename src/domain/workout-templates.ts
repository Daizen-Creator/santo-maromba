import { Exercise, WorkoutTemplate, WorkoutTemplatePlan } from '../shared/types';
import { DailyWorkoutPlan } from './workout-engine';

export function serializeWorkoutPlans(plans: DailyWorkoutPlan[]): WorkoutTemplatePlan[] {
  return plans.map(plan => ({
    dayName: plan.dayName,
    splitTitle: plan.splitTitle,
    focusMuscles: plan.focusMuscles,
    recoveryNotes: plan.recoveryNotes,
    exercises: plan.exercises.map(item => ({
      exerciseId: item.exercise.id,
      sets: item.sets,
      repRange: item.repRange,
      restSeconds: item.restSeconds,
      recommendedWeightKg: item.recommendedWeightKg
    }))
  }));
}

export function hydrateWorkoutTemplate(template: WorkoutTemplate, exercises: Exercise[]): DailyWorkoutPlan[] {
  const exercisesById = new Map(exercises.map(exercise => [exercise.id, exercise]));
  const missingIds = [...new Set(template.plans.flatMap(plan => plan.exercises
    .filter(item => !exercisesById.has(item.exerciseId))
    .map(item => item.exerciseId)))];
  if (missingIds.length > 0) {
    throw new Error(`O modelo contém exercícios ausentes do catálogo local: ${missingIds.join(', ')}.`);
  }

  return template.plans.map(plan => ({
    dayName: plan.dayName,
    splitTitle: plan.splitTitle,
    focusMuscles: plan.focusMuscles,
    recoveryNotes: plan.recoveryNotes,
    exercises: plan.exercises.map(item => ({
      exercise: exercisesById.get(item.exerciseId)!,
      sets: item.sets,
      repRange: item.repRange,
      restSeconds: item.restSeconds,
      recommendedWeightKg: item.recommendedWeightKg
    }))
  }));
}
