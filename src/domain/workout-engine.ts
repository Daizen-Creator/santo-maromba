import { Exercise, WorkoutSet } from '../shared/types';
import { INITIAL_EXERCISES } from '../database/seeds/exercise-seeds';

export interface DailyWorkoutPlan {
  dayName: string;
  splitTitle: string;
  focusMuscles: string;
  exercises: Array<{
    exercise: Exercise;
    sets: number;
    repRange: string;
    restSeconds: number;
    recommendedWeightKg?: number;
  }>;
  recoveryNotes: string;
}

export interface ScheduledWorkout {
  plan: DailyWorkoutPlan;
  scheduledDate: Date;
  daysUntil: number;
}

const WEEKDAY_NAMES = [
  'domingo', 'segunda-feira', 'terça-feira', 'quarta-feira',
  'quinta-feira', 'sexta-feira', 'sábado'
];

const normalizeDayName = (value: string): string =>
  value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('pt-BR');

const planMatchesWeekday = (plan: DailyWorkoutPlan, weekday: number): boolean => {
  const dayName = normalizeDayName(plan.dayName);
  if (dayName === 'segunda a sexta') return weekday >= 1 && weekday <= 5;
  if (dayName === 'sabado & domingo') return weekday === 0 || weekday === 6;
  return dayName === normalizeDayName(WEEKDAY_NAMES[weekday]);
};

export const getNextScheduledWorkout = (
  plans: DailyWorkoutPlan[],
  fromDate: Date = new Date()
): ScheduledWorkout | null => {
  for (let daysUntil = 0; daysUntil < 7; daysUntil += 1) {
    const scheduledDate = new Date(
      fromDate.getFullYear(),
      fromDate.getMonth(),
      fromDate.getDate() + daysUntil
    );
    const plan = plans.find(item => planMatchesWeekday(item, scheduledDate.getDay()));
    if (plan) return { plan, scheduledDate, daysUntil };
  }
  return null;
};

export class WorkoutEngine {
  private exercises: Exercise[];

  constructor(customExercises?: Exercise[]) {
    this.exercises = customExercises || INITIAL_EXERCISES;
  }

  /**
   * Sugere divisões de treino baseadas na disponibilidade semanal (3, 5 ou 7 dias)
   * Respeitando que 7 dias disponíveis não significa musculação pesada 7 dias por semana.
   */
  generateSplit(daysPerWeek: number, isReturningFromBreak: boolean = false, availableWeekdays?: number[]): DailyWorkoutPlan[] {
    const plans: DailyWorkoutPlan[] = [];

    // Ajuste de volume inicial para retornos de interrupção
    const volumeMultiplier = isReturningFromBreak ? 0.75 : 1.0;

    const findEx = (id: string) => this.exercises.find(e => e.id === id) || this.exercises[0];

    if (daysPerWeek === 1 || daysPerWeek === 2) {
      plans.push(...this.generateSplit(3, isReturningFromBreak).slice(0, daysPerWeek));
    } else if (daysPerWeek === 3) {
      // Divisão 3 Dias: Full Body Alternado com descanso intercalado
      plans.push({
        dayName: 'Segunda-feira',
        splitTitle: 'Full Body A — Força e Estímulo Global',
        focusMuscles: 'Peito, Costas, Quadríceps, Ombros',
        recoveryNotes: 'Intervalo mínimo de 48 horas recomendado antes da próxima sessão de musculação.',
        exercises: [
          { exercise: findEx('ex-agachamento-livre'), sets: Math.round(3 * volumeMultiplier), repRange: '6 - 8', restSeconds: 120 },
          { exercise: findEx('ex-supino-reto'), sets: Math.round(3 * volumeMultiplier), repRange: '8 - 10', restSeconds: 90 },
          { exercise: findEx('ex-puxada-alta'), sets: Math.round(3 * volumeMultiplier), repRange: '8 - 10', restSeconds: 90 },
          { exercise: findEx('ex-desenvolvimento-halteres'), sets: Math.round(3 * volumeMultiplier), repRange: '10 - 12', restSeconds: 60 },
          { exercise: findEx('ex-gemeos-em-pe'), sets: 3, repRange: '12 - 15', restSeconds: 60 }
        ]
      });

      plans.push({
        dayName: 'Quarta-feira',
        splitTitle: 'Full Body B — Posterior e Densidade',
        focusMuscles: 'Isquiotibiais, Costas, Peito Superior, Braços',
        recoveryNotes: 'Foco na cadeia posterior e controle motor excêntrico.',
        exercises: [
          { exercise: findEx('ex-stiff'), sets: Math.round(3 * volumeMultiplier), repRange: '8 - 10', restSeconds: 90 },
          { exercise: findEx('ex-remada-curvada'), sets: Math.round(3 * volumeMultiplier), repRange: '8 - 10', restSeconds: 90 },
          { exercise: findEx('ex-supino-inclinado-halteres'), sets: Math.round(3 * volumeMultiplier), repRange: '10 - 12', restSeconds: 90 },
          { exercise: findEx('ex-rosca-direta'), sets: 3, repRange: '10 - 12', restSeconds: 60 },
          { exercise: findEx('ex-triceps-corda'), sets: 3, repRange: '10 - 12', restSeconds: 60 }
        ]
      });

      plans.push({
        dayName: 'Sexta-feira',
        splitTitle: 'Full Body C — Hipertrofia e Volume',
        focusMuscles: 'Quadríceps, Ombros, Costas, Core',
        recoveryNotes: 'Descanso completo no sábado e domingo.',
        exercises: [
          { exercise: findEx('ex-leg-press-45'), sets: Math.round(4 * volumeMultiplier), repRange: '10 - 12', restSeconds: 90 },
          { exercise: findEx('ex-remada-serrote'), sets: Math.round(3 * volumeMultiplier), repRange: '10 - 12', restSeconds: 60 },
          { exercise: findEx('ex-elevacao-lateral'), sets: 4, repRange: '12 - 15', restSeconds: 60 },
          { exercise: findEx('ex-mesa-flexora'), sets: 3, repRange: '10 - 12', restSeconds: 60 },
          { exercise: findEx('ex-abdominal-infra'), sets: 3, repRange: '15 - 20', restSeconds: 45 }
        ]
      });
    } else if (daysPerWeek === 4) {
      const fiveDayPlans = this.generateSplit(5, isReturningFromBreak);
      const [push, pull, legs, upper, lower] = fiveDayPlans;
      plans.push({
        ...push,
        dayName: 'Segunda-feira',
        splitTitle: 'Upper A — Empurrar e puxar',
        focusMuscles: 'Peitoral, costas, ombros e braços',
        exercises: [...push.exercises.slice(0, 4), ...pull.exercises.slice(0, 2)]
      });
      plans.push({ ...legs, dayName: 'Terça-feira', splitTitle: 'Lower A — Quadríceps e posteriores' });
      plans.push({ ...upper, dayName: 'Quinta-feira', splitTitle: 'Upper B — Membros superiores' });
      plans.push({ ...lower, dayName: 'Sexta-feira', splitTitle: 'Lower B — Pernas e core' });
    } else if (daysPerWeek === 5) {
      // Divisão 5 Dias: Push / Pull / Legs + Upper / Lower
      plans.push({
        dayName: 'Segunda-feira',
        splitTitle: 'Treino A — Empurrar (Push: Peitoral, Ombros, Tríceps)',
        focusMuscles: 'Peitoral maior, Deltoide anterior/lateral, Tríceps',
        recoveryNotes: 'Recuperação muscular estimada: 48h.',
        exercises: [
          { exercise: findEx('ex-supino-reto'), sets: Math.round(4 * volumeMultiplier), repRange: '6 - 8', restSeconds: 120 },
          { exercise: findEx('ex-supino-inclinado-halteres'), sets: Math.round(3 * volumeMultiplier), repRange: '8 - 10', restSeconds: 90 },
          { exercise: findEx('ex-desenvolvimento-halteres'), sets: Math.round(3 * volumeMultiplier), repRange: '10 - 12', restSeconds: 90 },
          { exercise: findEx('ex-elevacao-lateral'), sets: 4, repRange: '12 - 15', restSeconds: 60 },
          { exercise: findEx('ex-triceps-corda'), sets: 3, repRange: '10 - 12', restSeconds: 60 },
          { exercise: findEx('ex-triceps-testa'), sets: 3, repRange: '10 - 12', restSeconds: 60 }
        ]
      });

      plans.push({
        dayName: 'Terça-feira',
        splitTitle: 'Treino B — Puxar (Pull: Dorsais, Trapézio, Bíceps, Antebraço)',
        focusMuscles: 'Latíssimo do dorso, Romboides, Bíceps braquial',
        recoveryNotes: 'Recuperação muscular estimada: 48h.',
        exercises: [
          { exercise: findEx('ex-puxada-alta'), sets: Math.round(4 * volumeMultiplier), repRange: '8 - 10', restSeconds: 90 },
          { exercise: findEx('ex-remada-curvada'), sets: Math.round(4 * volumeMultiplier), repRange: '8 - 10', restSeconds: 90 },
          { exercise: findEx('ex-remada-serrote'), sets: Math.round(3 * volumeMultiplier), repRange: '10 - 12', restSeconds: 60 },
          { exercise: findEx('ex-rosca-direta'), sets: 3, repRange: '10 - 12', restSeconds: 60 },
          { exercise: findEx('ex-rosca-martelo'), sets: 3, repRange: '10 - 12', restSeconds: 60 }
        ]
      });

      plans.push({
        dayName: 'Quarta-feira',
        splitTitle: 'Treino C — Pernas Completo (Legs: Quadríceps, Posterior, Panturrilha)',
        focusMuscles: 'Quadríceps, Isquiotibiais, Glúteos, Panturrilhas',
        recoveryNotes: 'Maior demanda do sistema nervoso central.',
        exercises: [
          { exercise: findEx('ex-agachamento-livre'), sets: Math.round(4 * volumeMultiplier), repRange: '6 - 8', restSeconds: 120 },
          { exercise: findEx('ex-leg-press-45'), sets: Math.round(3 * volumeMultiplier), repRange: '10 - 12', restSeconds: 90 },
          { exercise: findEx('ex-stiff'), sets: Math.round(3 * volumeMultiplier), repRange: '8 - 10', restSeconds: 90 },
          { exercise: findEx('ex-cadeira-extensora'), sets: 3, repRange: '12 - 15', restSeconds: 60 },
          { exercise: findEx('ex-mesa-flexora'), sets: 3, repRange: '10 - 12', restSeconds: 60 },
          { exercise: findEx('ex-gemeos-em-pe'), sets: 4, repRange: '12 - 15', restSeconds: 60 }
        ]
      });

      plans.push({
        dayName: 'Quinta-feira',
        splitTitle: 'Treino D — Membros Superiores (Upper Body)',
        focusMuscles: 'Peito, Costas, Ombros, Braços',
        recoveryNotes: 'Volume moderado com foco em pontos fracos.',
        exercises: [
          { exercise: findEx('ex-supino-inclinado-halteres'), sets: 3, repRange: '8 - 10', restSeconds: 90 },
          { exercise: findEx('ex-puxada-alta'), sets: 3, repRange: '10 - 12', restSeconds: 90 },
          { exercise: findEx('ex-elevacao-lateral'), sets: 4, repRange: '12 - 15', restSeconds: 60 },
          { exercise: findEx('ex-triceps-corda'), sets: 3, repRange: '12 - 15', restSeconds: 60 },
          { exercise: findEx('ex-rosca-direta'), sets: 3, repRange: '12 - 15', restSeconds: 60 }
        ]
      });

      plans.push({
        dayName: 'Sexta-feira',
        splitTitle: 'Treino E — Membros Inferiores & Abdômen (Lower & Core)',
        focusMuscles: 'Cadeia posterior, Quadríceps e Core',
        recoveryNotes: 'Final de semana livre para recuperação e supercompensação.',
        exercises: [
          { exercise: findEx('ex-elevacao-pelvica'), sets: 4, repRange: '8 - 10', restSeconds: 90 },
          { exercise: findEx('ex-leg-press-45'), sets: 3, repRange: '10 - 12', restSeconds: 90 },
          { exercise: findEx('ex-mesa-flexora'), sets: 3, repRange: '10 - 12', restSeconds: 60 },
          { exercise: findEx('ex-gemeos-em-pe'), sets: 4, repRange: '15 - 20', restSeconds: 60 },
          { exercise: findEx('ex-abdominal-infra'), sets: 4, repRange: '15 - 20', restSeconds: 45 }
        ]
      });
    } else if (daysPerWeek === 6 || daysPerWeek === 7) {
      plans.push(...this.generateSplit(5, isReturningFromBreak));
      plans.push({
        dayName: 'Sábado',
        splitTitle: 'Recuperação Ativa e Condicionamento Leve',
        focusMuscles: 'Mobilidade, caminhada ou cardio leve',
        recoveryNotes: 'Mantenha o esforço leve e priorize a recuperação para a próxima sessão.',
        exercises: []
      });
      if (daysPerWeek === 7) {
        plans.push({
          dayName: 'Domingo',
          splitTitle: 'Descanso e preparação da semana',
          focusMuscles: 'Recuperação geral',
          recoveryNotes: 'Use o dia para descanso, sono adequado e preparação da próxima semana.',
          exercises: []
        });
      }
    }

    if (!availableWeekdays) return plans;
    const weekOrder = [1, 2, 3, 4, 5, 6, 0];
    const selectedDays = weekOrder.filter(day => availableWeekdays.includes(day));
    if (selectedDays.length !== plans.length || new Set(availableWeekdays).size !== availableWeekdays.length) {
      throw new Error('A quantidade de dias disponíveis precisa corresponder à divisão semanal.');
    }
    return plans.map((plan, index) => ({
      ...plan,
      dayName: WEEKDAY_NAMES[selectedDays[index]]
    }));
  }

  /** Gera uma rotina de três dias com peso corporal e apoios domésticos, sem prescrever halteres. */
  generateHomeSplit(): DailyWorkoutPlan[] {
    const buildExercises = (specs: Array<{ id: string; sets: number; repRange: string; restSeconds: number }>) =>
      specs.flatMap(spec => {
        const exercise = this.exercises.find(item => item.id === spec.id);
        return exercise ? [{ exercise, sets: spec.sets, repRange: spec.repRange, restSeconds: spec.restSeconds }] : [];
      });

    const plans: DailyWorkoutPlan[] = [
      {
        dayName: 'Segunda-feira',
        splitTitle: 'Casa A — Empurrar, pernas e core',
        focusMuscles: 'Peitoral, tríceps, quadríceps, panturrilhas e abdômen',
        recoveryNotes: 'Sem halteres ou cargas externas. Use somente banco/apoio firme e colchonete; pare se sentir dor articular.',
        exercises: buildExercises([
          { id: 'ex-flexao-inclinada', sets: 3, repRange: '8 - 12', restSeconds: 90 },
          { id: 'ex-agachamento-bulgaro', sets: 3, repRange: '8 - 12 por perna', restSeconds: 90 },
          { id: 'ex-mergulho-banco', sets: 2, repRange: '8 - 12', restSeconds: 60 },
          { id: 'ex-panturrilha-unilateral', sets: 3, repRange: '12 - 20 por perna', restSeconds: 60 },
          { id: 'ex-prancha', sets: 3, repRange: '20 - 40 s', restSeconds: 45 }
        ])
      },
      {
        dayName: 'Quarta-feira',
        splitTitle: 'Casa B — Puxar, posterior e core',
        focusMuscles: 'Costas, bíceps, posteriores de coxa e abdômen',
        recoveryNotes: 'Sem halteres. A puxada precisa de barra fixa presa com segurança; não improvise ancoragens. No nórdico, use assistência e amplitude controlada.',
        exercises: buildExercises([
          { id: 'ex-barra-fixa-pronada', sets: 3, repRange: '4 - 8', restSeconds: 120 },
          { id: 'ex-nordic-curl', sets: 2, repRange: '4 - 8 com assistência', restSeconds: 120 },
          { id: 'ex-agachamento-bulgaro', sets: 3, repRange: '8 - 12 por perna', restSeconds: 90 },
          { id: 'ex-crunch-reverso', sets: 3, repRange: '10 - 15', restSeconds: 45 },
          { id: 'ex-prancha-lateral', sets: 2, repRange: '20 - 30 s por lado', restSeconds: 45 }
        ])
      },
      {
        dayName: 'Sexta-feira',
        splitTitle: 'Casa C — Corpo inteiro',
        focusMuscles: 'Peitoral, costas, pernas, panturrilhas e core',
        recoveryNotes: 'Sem halteres ou cargas externas. Barra fixa e apoios devem estar firmes; faça as variações fáceis se a técnica começar a falhar.',
        exercises: buildExercises([
          { id: 'ex-flexao-maos-elevadas', sets: 3, repRange: '10 - 15', restSeconds: 75 },
          { id: 'ex-barra-fixa-pronada', sets: 3, repRange: '4 - 8', restSeconds: 120 },
          { id: 'ex-panturrilha-unilateral', sets: 3, repRange: '12 - 20 por perna', restSeconds: 60 },
          { id: 'ex-abdominal-bicicleta', sets: 3, repRange: '10 - 16 por lado', restSeconds: 45 },
          { id: 'ex-hollow-hold', sets: 2, repRange: '15 - 30 s', restSeconds: 45 }
        ])
      }
    ];

    return plans.filter(plan => plan.exercises.length > 0);
  }

  /**
   * Sugere progressão de carga inteligente baseada no histórico de repetições
   */
  suggestProgression(
    exerciseId: string,
    historySets: WorkoutSet[],
    targetRepMax: number = 10
  ): { suggestedWeightKg: number; rationale: string } {
    const exerciseSets = historySets.filter(s => s.exerciseId === exerciseId);
    if (exerciseSets.length === 0) {
      return { suggestedWeightKg: 10, rationale: 'Carga inicial para calibração de técnica.' };
    }

    const lastSet = exerciseSets[exerciseSets.length - 1];
    if (lastSet.reps >= targetRepMax && (!lastSet.rpe || lastSet.rpe <= 8)) {
      // Bateu o teto de repetições com esforço controlado -> progressão de sobrecarga
      const increment = 2.0; // +2kg
      return {
        suggestedWeightKg: Number((lastSet.weightKg + increment).toFixed(1)),
        rationale: `Meta de ${targetRepMax} repetições atingida com boa reserva (RPE ${lastSet.rpe || '≤8'}). Aumente +${increment} kg na primeira série.`
      };
    }

    return {
      suggestedWeightKg: lastSet.weightKg,
      rationale: `Mantenha a carga de ${lastSet.weightKg} kg e busque progredir em repetições com técnica estrita.`
    };
  }
}
