import { describe, it, expect } from 'vitest';
import {
  InitialHistoryConfirmationSchema,
  CustomFoodInputSchema,
  DailyMealHistoryQuerySchema,
  DailyMealCopyInputSchema,
  NutritionAnalyticsQuerySchema,
  SaveMealTemplateInputSchema,
  ApplyMealTemplateInputSchema,
  PhotoInputSchema,
  PhotoNotesUpdateSchema,
  ProfileInputSchema,
  WeightRecordInputSchema,
  RecipeServingsInputSchema,
  WorkoutSessionInputSchema
} from '../shared/schema';

describe('Validação de Schemas Zod — Contratos de Dados', () => {
  it('aceita rendimento inteiro de receita e rejeita valores fora de 1 a 50', () => {
    expect(RecipeServingsInputSchema.parse({ id: 'recipe-1', servings: 6 })).toEqual({ id: 'recipe-1', servings: 6 });
    expect(() => RecipeServingsInputSchema.parse({ id: 'recipe-1', servings: 0 })).toThrow();
    expect(() => RecipeServingsInputSchema.parse({ id: 'recipe-1', servings: 1.5 })).toThrow();
    expect(() => RecipeServingsInputSchema.parse({ id: 'recipe-1', servings: 51 })).toThrow();
    expect(() => RecipeServingsInputSchema.parse({ id: '../recipe', servings: 2 })).toThrow();
  });

  it('valida o período do histórico alimentar e limita o texto de busca', () => {
    expect(DailyMealHistoryQuerySchema.parse({ fromDate: '2026-10-01', toDate: '2026-10-22', search: 'arroz' }).search)
      .toBe('arroz');
    expect(() => DailyMealHistoryQuerySchema.parse({ fromDate: '2026-10-23', toDate: '2026-10-22' })).toThrow();
    expect(() => DailyMealHistoryQuerySchema.parse({ fromDate: 'data', toDate: '2026-10-22' })).toThrow();
    expect(() => DailyMealHistoryQuerySchema.parse({ fromDate: '2026-10-01', toDate: '2026-10-22', search: 'x'.repeat(101) })).toThrow();
  });

  it('valida datas diferentes para cópia de refeições', () => {
    expect(DailyMealCopyInputSchema.parse({ sourceDate: '2026-10-21', targetDate: '2026-10-22' }))
      .toEqual({ sourceDate: '2026-10-21', targetDate: '2026-10-22' });
    expect(() => DailyMealCopyInputSchema.parse({ sourceDate: '2026-10-22', targetDate: '2026-10-22' })).toThrow();
  });

  it('valida entradas para salvar e aplicar modelos de refeições', () => {
    expect(SaveMealTemplateInputSchema.parse({ name: '  Dia de treino  ', sourceDate: '2026-10-21' }))
      .toEqual({ name: 'Dia de treino', sourceDate: '2026-10-21' });
    expect(() => SaveMealTemplateInputSchema.parse({ name: '   ', sourceDate: '2026-02-31' })).toThrow();
    expect(ApplyMealTemplateInputSchema.parse({ templateId: 'template-abc', targetDate: '2026-10-22' }).templateId)
      .toBe('template-abc');
    expect(() => ApplyMealTemplateInputSchema.parse({ templateId: '../bad', targetDate: '2026-10-22' })).toThrow();
  });

  it('limita consultas analíticas a datas reais e períodos de até 367 dias', () => {
    expect(NutritionAnalyticsQuerySchema.parse({ fromDate: '2026-10-16', toDate: '2026-10-22' }).toDate).toBe('2026-10-22');
    expect(() => NutritionAnalyticsQuerySchema.parse({ fromDate: '2026-02-31', toDate: '2026-03-01' })).toThrow();
    expect(() => NutritionAnalyticsQuerySchema.parse({ fromDate: '2025-01-01', toDate: '2026-10-22' })).toThrow();
  });

  it('valida cadastro nutricional por 100 g e rejeita macros negativos', () => {
    const food = CustomFoodInputSchema.parse({
      name: '  Receita pessoal  ', category: 'dairy', calories: 110,
      proteinG: 8, carbsG: 9, fatsG: 4, isCooked: false
    });
    expect(food.name).toBe('Receita pessoal');
    expect(food.isCooked).toBe(false);
    expect(() => CustomFoodInputSchema.parse({
      name: 'Alimento inválido', category: 'protein', calories: 100,
      proteinG: -1, carbsG: 0, fatsG: 0
    })).toThrow();
  });

  it('deve validar um perfil válido com biometria completa', () => {
    const validProfile = {
      name: 'João Silva',
      birthDate: '2008-05-14',
      heightCm: 182,
      biologicalSex: 'male',
      activityLevel: 'moderate',
      trainingExperience: 'intermediate',
      fitnessGoal: 'muscle_gain',
      targetWeightKg: 80.0,
      mealsPerDay: 4,
      trainingDaysPerWeek: 5
    };

    const parsed = ProfileInputSchema.parse(validProfile);
    expect(parsed.name).toBe('João Silva');
    expect(parsed.heightCm).toBe(182);
    expect(parsed.mealsPerDay).toBe(4);
    expect(parsed.initialHistoryConfirmed).toBeUndefined();
  });

  it('deve rejeitar perfil com dados inconsistentes ou fora dos limites clínicos', () => {
    expect(() =>
      ProfileInputSchema.parse({
        name: 'A', // Muito curto (< 2 caracteres)
        birthDate: 'invalida',
        heightCm: 50, // Menor que 100 cm
        biologicalSex: 'male',
        activityLevel: 'moderate',
        trainingExperience: 'beginner',
        fitnessGoal: 'muscle_gain',
        mealsPerDay: 8 // Fora da faixa de 3 a 6
      })
    ).toThrow();
  });

  it('mantém compatibilidade de séries antigas e valida o estado concluído', () => {
    const parsed = WorkoutSessionInputSchema.parse({
      date: '2026-10-21', splitName: 'Treino A', completed: true,
      sets: [{ exerciseId: 'ex-supino', setNumber: 1, weightKg: 20, reps: 8 }]
    });
    expect(parsed.sets[0].completed).toBe(true);
    expect(WorkoutSessionInputSchema.parse({
      date: '2026-10-21', splitName: 'Treino A', completed: true,
      sets: [{ exerciseId: 'ex-supino', setNumber: 1, weightKg: 20, reps: 8, rir: 0 }]
    }).sets[0].rir).toBe(0);
    expect(() => WorkoutSessionInputSchema.parse({
      date: '2026-10-21', splitName: 'Treino A', completed: true,
      sets: [{ exerciseId: 'ex-supino', setNumber: 1, weightKg: 20, reps: 8, rir: 10.5 }]
    })).toThrow();
    expect(WorkoutSessionInputSchema.parse({
      date: '2026-10-21', splitName: 'Treino parcial', completed: false,
      sets: [{ exerciseId: 'ex-supino', setNumber: 1, weightKg: 20, reps: 8, completed: false }]
    }).sets[0].completed).toBe(false);
  });

  it('deve validar registros de peso com formato correto', () => {
    const validWeight = {
      date: '2026-10-19',
      weightKg: 73.2,
      notes: 'Pesagem matinal',
      source: 'verified'
    };

    const parsed = WeightRecordInputSchema.parse(validWeight);
    expect(parsed.weightKg).toBe(73.2);
    expect(parsed.source).toBe('verified');
  });

  it('deve rejeitar peso com valores fisicamente absurdos', () => {
    expect(() =>
      WeightRecordInputSchema.parse({
        date: '2026-10-19',
        weightKg: -5 // Negativo
      })
    ).toThrow();

    expect(() =>
      WeightRecordInputSchema.parse({
        date: '2026-10-19',
        weightKg: 450 // Acima de 350 kg
      })
    ).toThrow();
  });

  it('deve validar o schema de confirmação de histórico inicial', () => {
    const validConfirmation = {
      confirmedHeightCm: 182,
      confirmedBirthDate: '2008-05-14',
      eggLimitAccepted: false,
      targetWeightKg: 80
    };

    const parsed = InitialHistoryConfirmationSchema.parse(validConfirmation);
    expect(parsed.confirmedHeightCm).toBe(182);
    expect(parsed.eggLimitAccepted).toBe(false);
  });

  it('deve aceitar fotos locais válidas e exigir nome para pose personalizada', () => {
    const input = {
      date: '2026-10-19',
      pose: 'front_relaxed',
      imageBytes: new Uint8Array([0xff, 0xd8, 0xff]),
      mimeType: 'image/jpeg'
    };

    expect(PhotoInputSchema.parse(input).date).toBe('2026-10-19');
    expect(() => PhotoInputSchema.parse({ ...input, date: '2026-02-31' })).toThrow();
    expect(() => PhotoInputSchema.parse({ ...input, pose: 'custom' })).toThrow();
    expect(() => PhotoInputSchema.parse({ ...input, mimeType: 'image/svg+xml' })).toThrow();
  });

  it('deve validar edição de observações sem aceitar IDs ou textos excessivos', () => {
    expect(PhotoNotesUpdateSchema.parse({ id: 'photo-abc_123', notes: 'Luz natural' }).notes).toBe('Luz natural');
    expect(() => PhotoNotesUpdateSchema.parse({ id: '../photo', notes: '' })).toThrow();
    expect(() => PhotoNotesUpdateSchema.parse({ id: 'photo-1', notes: 'x'.repeat(301) })).toThrow();
  });
});
