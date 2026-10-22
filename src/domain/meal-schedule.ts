import { MealTurn, NutritionTargets } from '../shared/types';

export interface MealSlot {
  id: string;
  title: string;
  time: string;
  category: MealTurn;
  share: number;
  target?: {
    calories: number;
    proteinG: number;
    carbsG: number;
    fatsG: number;
  };
}

const SCHEDULES: Record<number, Array<Omit<MealSlot, 'target'>>> = {
  3: [
    { id: 'breakfast', title: 'Café da manhã', time: '08:00', category: 'breakfast', share: 0.3 },
    { id: 'lunch', title: 'Almoço', time: '13:00', category: 'lunch', share: 0.4 },
    { id: 'dinner', title: 'Jantar', time: '20:00', category: 'dinner', share: 0.3 }
  ],
  4: [
    { id: 'breakfast', title: 'Café da manhã', time: '07:30', category: 'breakfast', share: 0.25 },
    { id: 'lunch', title: 'Almoço', time: '12:30', category: 'lunch', share: 0.35 },
    { id: 'afternoon-snack', title: 'Lanche da tarde', time: '16:30', category: 'snack', share: 0.15 },
    { id: 'dinner', title: 'Jantar', time: '20:00', category: 'dinner', share: 0.25 }
  ],
  5: [
    { id: 'breakfast', title: 'Café da manhã', time: '07:30', category: 'breakfast', share: 0.22 },
    { id: 'morning-snack', title: 'Lanche da manhã', time: '10:30', category: 'snack', share: 0.1 },
    { id: 'lunch', title: 'Almoço', time: '13:00', category: 'lunch', share: 0.3 },
    { id: 'afternoon-snack', title: 'Lanche da tarde', time: '16:30', category: 'snack', share: 0.13 },
    { id: 'dinner', title: 'Jantar', time: '20:00', category: 'dinner', share: 0.25 }
  ],
  6: [
    { id: 'breakfast', title: 'Café da manhã', time: '07:00', category: 'breakfast', share: 0.2 },
    { id: 'morning-snack', title: 'Lanche da manhã', time: '10:00', category: 'snack', share: 0.1 },
    { id: 'lunch', title: 'Almoço', time: '13:00', category: 'lunch', share: 0.28 },
    { id: 'afternoon-snack', title: 'Lanche da tarde', time: '16:30', category: 'snack', share: 0.12 },
    { id: 'dinner', title: 'Jantar', time: '19:30', category: 'dinner', share: 0.2 },
    { id: 'supper', title: 'Ceia', time: '22:00', category: 'supper', share: 0.1 }
  ]
};

function allocate(total: number, shares: number[], precision: number): number[] {
  const multiplier = 10 ** precision;
  const values: number[] = [];
  let assigned = 0;

  shares.forEach((share, index) => {
    const value = index === shares.length - 1
      ? Math.round((total - assigned) * multiplier) / multiplier
      : Math.round(total * share * multiplier) / multiplier;
    values.push(value);
    assigned += value;
  });

  return values;
}

export interface MealScheduleRoutine {
  wakeTime?: string;
  sleepTime?: string;
}

function parseTime(value?: string): number | null {
  const match = value?.match(/^(?:([01]\d|2[0-3])):([0-5]\d)$/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function formatTime(minutes: number): string {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(normalized / 60)).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')}`;
}

function applyRoutineTimes(base: Array<Omit<MealSlot, 'target'>>, routine?: MealScheduleRoutine): Array<Omit<MealSlot, 'target'>> {
  const wake = parseTime(routine?.wakeTime);
  const sleep = parseTime(routine?.sleepTime);
  if (wake === null || sleep === null || wake === sleep) return base;

  const sleepAfterWake = sleep <= wake ? sleep + 1440 : sleep;
  const firstMeal = wake + 30;
  const lastMeal = sleepAfterWake - 60;
  const interval = lastMeal - firstMeal;
  if (interval < (base.length - 1) * 30) return base;

  return base.map((slot, index) => ({
    ...slot,
    time: formatTime(Math.round(firstMeal + (interval * index) / (base.length - 1)))
  }));
}

export function buildMealSchedule(mealsPerDay: number, targets: NutritionTargets | null, routine?: MealScheduleRoutine): MealSlot[] {
  const configuredBase = SCHEDULES[mealsPerDay] ?? SCHEDULES[4];
  const base = applyRoutineTimes(configuredBase, routine);
  if (!targets) return base.map(slot => ({ ...slot }));

  const shares = base.map(slot => slot.share);
  const calories = allocate(targets.targetCalories, shares, 0);
  const protein = allocate(targets.proteinGrams, shares, 1);
  const carbs = allocate(targets.carbGrams, shares, 1);
  const fats = allocate(targets.fatGrams, shares, 1);

  return base.map((slot, index) => ({
    ...slot,
    target: {
      calories: calories[index],
      proteinG: protein[index],
      carbsG: carbs[index],
      fatsG: fats[index]
    }
  }));
}
