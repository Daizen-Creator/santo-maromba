import { MealTurn } from '../shared/types';

export const MEAL_TURN_OPTIONS: Array<{ value: MealTurn; label: string }> = [
  { value: 'breakfast', label: 'Café da manhã' },
  { value: 'lunch', label: 'Almoço' },
  { value: 'snack', label: 'Lanche' },
  { value: 'pre_workout', label: 'Pré-treino' },
  { value: 'post_workout', label: 'Pós-treino' },
  { value: 'dinner', label: 'Jantar' },
  { value: 'supper', label: 'Ceia' }
];

const LABELS = Object.fromEntries(MEAL_TURN_OPTIONS.map(option => [option.value, option.label])) as Record<MealTurn, string>;

export function getMealTurnLabel(value?: MealTurn): string {
  return value ? LABELS[value] : 'Lanche';
}

export function inferMealTurn(slotId: string, mealName = ''): MealTurn {
  const value = `${slotId} ${mealName}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (value.includes('breakfast') || value.includes('cafe')) return 'breakfast';
  if (value.includes('lunch') || value.includes('almoco')) return 'lunch';
  if (value.includes('pre_workout') || value.includes('pre-treino') || value.includes('pre treino')) return 'pre_workout';
  if (value.includes('post_workout') || value.includes('pos-treino') || value.includes('pos treino')) return 'post_workout';
  if (value.includes('dinner') || value.includes('jantar')) return 'dinner';
  if (value.includes('supper') || value.includes('ceia')) return 'supper';
  return 'snack';
}
