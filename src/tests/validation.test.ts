import { describe, it, expect } from 'vitest';
import {
  InitialHistoryConfirmationSchema,
  CustomFoodInputSchema,
  DailyMealHistoryQuerySchema,
  DailyMealCopyInputSchema,
  NutritionAnalyticsQuerySchema,
  MealPrepEventInputSchema,
  SaveMealTemplateInputSchema,
  ApplyMealTemplateInputSchema,
  PhotoInputSchema,
  PhotoNotesUpdateSchema,
  ProfileInputSchema,
  WeightRecordInputSchema,
  RecipeServingsInputSchema,
  WorkoutSessionInputSchema,
  SaveWorkoutTemplateInputSchema,
  SaveWorkoutScheduleInputSchema,
  SaveCustomMeasurementDefinitionInputSchema,
  SaveCustomMeasurementInputSchema,
  ProfileGoalHistoryRecordSchema,
  SaveBodyMeasurementInputSchema,
  ShapeMilestoneInputSchema,
  MeasurementUnitPreferencesSchema,
  PantryRecipeSearchInputSchema,
  PantryItemUpdateInputSchema,
  PantryPriceUpdateInputSchema,
  ShoppingListPurchaseInputSchema
} from '../shared/schema';

describe('Validação de Schemas Zod — Contratos de Dados', () => {
  it('valida o limite de preparo e o filtro de estoque para receitas da despensa', () => {
    expect(PantryRecipeSearchInputSchema.parse({ maxPrepTime: 30, requireAllIngredients: true }))
      .toEqual({ maxPrepTime: 30, requireAllIngredients: true });
    expect(() => PantryRecipeSearchInputSchema.parse({ maxPrepTime: 0 })).toThrow();
    expect(() => PantryRecipeSearchInputSchema.parse({ requireAllIngredients: 'yes' })).toThrow();
  });

  it('aceita estoque em gramas dentro do limite e rejeita IDs inseguros ou quantidades inválidas', () => {
    expect(PantryItemUpdateInputSchema.parse({ foodId: 'food-arroz', amountG: 250 })).toEqual({ foodId: 'food-arroz', amountG: 250 });
    expect(PantryItemUpdateInputSchema.parse({ foodId: 'food-arroz', amountG: 0 }).amountG).toBe(0);
    expect(PantryItemUpdateInputSchema.parse({ foodId: 'food-arroz', amountG: 250, expiresAt: '2026-11-02' }).expiresAt).toBe('2026-11-02');
    expect(PantryItemUpdateInputSchema.parse({ foodId: 'food-arroz', amountG: 250, isLeftover: true }).isLeftover).toBe(true);
    expect(() => PantryItemUpdateInputSchema.parse({ foodId: 'food-arroz', amountG: 250, isLeftover: 'sim' })).toThrow();
    expect(() => PantryItemUpdateInputSchema.parse({ foodId: '../arroz', amountG: 250 })).toThrow();
    expect(() => PantryItemUpdateInputSchema.parse({ foodId: 'food-arroz', amountG: -1 })).toThrow();
    expect(() => PantryItemUpdateInputSchema.parse({ foodId: 'food-arroz', amountG: 100001 })).toThrow();
    expect(() => PantryItemUpdateInputSchema.parse({ foodId: 'food-arroz', amountG: 250, expiresAt: '2026-02-30' })).toThrow();
  });

  it('valida a marcação de compra por semana e alimento', () => {
    expect(ShoppingListPurchaseInputSchema.parse({ weekStartDate: '2026-10-19', foodId: 'food-arroz', purchased: true }))
      .toEqual({ weekStartDate: '2026-10-19', foodId: 'food-arroz', purchased: true });
    expect(() => ShoppingListPurchaseInputSchema.parse({ weekStartDate: '2026-02-30', foodId: 'food-arroz', purchased: true })).toThrow();
    expect(() => ShoppingListPurchaseInputSchema.parse({ weekStartDate: '2026-10-19', foodId: '../unsafe', purchased: true })).toThrow();
    expect(() => ShoppingListPurchaseInputSchema.parse({ weekStartDate: '2026-10-19', foodId: 'food-arroz', purchased: 'yes' })).toThrow();
  });

  it('exige preço, origem e identificador válido ao registrar uma cotação', () => {
    expect(PantryPriceUpdateInputSchema.parse({ foodId: 'food-arroz', unitPrice: 25.5, priceSource: 'Mercado do bairro' }))
      .toEqual({ foodId: 'food-arroz', unitPrice: 25.5, priceSource: 'Mercado do bairro' });
    expect(PantryPriceUpdateInputSchema.parse({ foodId: 'food-arroz', unitPrice: null, priceSource: null }).unitPrice).toBeNull();
    expect(() => PantryPriceUpdateInputSchema.parse({ foodId: '../arroz', unitPrice: 25.5, priceSource: 'mercado' })).toThrow();
    expect(() => PantryPriceUpdateInputSchema.parse({ foodId: 'food-arroz', unitPrice: -1, priceSource: 'mercado' })).toThrow();
    expect(() => PantryPriceUpdateInputSchema.parse({ foodId: 'food-arroz', unitPrice: 25.5, priceSource: null })).toThrow();
  });

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

  it('valida data, horário, receita, porções e estado do preparo', () => {
    expect(MealPrepEventInputSchema.parse({
      date: '2026-10-24', scheduledTime: '08:30', recipeId: 'recipe-oatmeal',
      servings: 4, status: 'planned'
    })).toMatchObject({ date: '2026-10-24', scheduledTime: '08:30', servings: 4 });
    expect(() => MealPrepEventInputSchema.parse({
      date: '2026-02-30', scheduledTime: '25:00', recipeId: '../recipe', servings: 0, status: 'unknown'
    })).toThrow();
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
    expect(Object.prototype.hasOwnProperty.call(ProfileInputSchema.parse({ ...validProfile, targetWeightKg: undefined }), 'targetWeightKg')).toBe(true);
  });

  it('valida horários de rotina completos e rejeita horários parciais ou inválidos', () => {
    const base = {
      name: 'João Silva', birthDate: '2008-05-14', heightCm: 182,
      biologicalSex: 'male', activityLevel: 'moderate', trainingExperience: 'intermediate',
      fitnessGoal: 'muscle_gain', mealsPerDay: 4, trainingDaysPerWeek: 5
    };
    expect(ProfileInputSchema.parse({ ...base, wakeTime: '06:30', sleepTime: '22:45' })).toMatchObject({
      wakeTime: '06:30', sleepTime: '22:45'
    });
    expect(() => ProfileInputSchema.parse({ ...base, wakeTime: '06:30' })).toThrow();
    expect(() => ProfileInputSchema.parse({ ...base, wakeTime: '24:10', sleepTime: '22:45' })).toThrow();
    expect(() => ProfileInputSchema.parse({ ...base, wakeTime: '06:30', sleepTime: '06:30' })).toThrow();
  });

  it('valida dias disponíveis sem duplicações e em quantidade coerente com a semana', () => {
    const base = {
      name: 'João Silva', birthDate: '2008-05-14', heightCm: 182,
      biologicalSex: 'male', activityLevel: 'moderate', trainingExperience: 'intermediate',
      fitnessGoal: 'muscle_gain', mealsPerDay: 4, trainingDaysPerWeek: 3
    };
    expect(ProfileInputSchema.parse({ ...base, trainingWeekdays: [1, 3, 5] }).trainingWeekdays).toEqual([1, 3, 5]);
    expect(() => ProfileInputSchema.parse({ ...base, trainingWeekdays: [1, 1, 5] })).toThrow();
    expect(() => ProfileInputSchema.parse({ ...base, trainingWeekdays: [1, 3] })).toThrow();
    expect(() => ProfileInputSchema.parse({ ...base, trainingWeekdays: [1, 3, 7] })).toThrow();
  });

  it('valida a data de prazo da meta usando uma data real do calendário', () => {
    const base = {
      name: 'João Silva', birthDate: '2008-05-14', heightCm: 182,
      biologicalSex: 'male', activityLevel: 'moderate', trainingExperience: 'intermediate',
      fitnessGoal: 'muscle_gain', mealsPerDay: 4, trainingDaysPerWeek: 5
    };
    expect(ProfileInputSchema.parse({ ...base, targetDate: '2026-12-31' }).targetDate).toBe('2026-12-31');
    expect(() => ProfileInputSchema.parse({ ...base, targetDate: '2026-02-30' })).toThrow();
  });

  it('aceita orçamento alimentar mensal dentro do limite e rejeita valores negativos ou acima do máximo', () => {
    const base = {
      name: 'João Silva', birthDate: '2008-05-14', heightCm: 182,
      biologicalSex: 'male', activityLevel: 'moderate', trainingExperience: 'intermediate',
      fitnessGoal: 'muscle_gain', mealsPerDay: 4, trainingDaysPerWeek: 5
    };
    expect(ProfileInputSchema.parse({ ...base, foodBudgetMonthly: 1800 }).foodBudgetMonthly).toBe(1800);
    expect(ProfileInputSchema.parse({ ...base, foodBudgetMonthly: 0 }).foodBudgetMonthly).toBe(0);
    expect(() => ProfileInputSchema.parse({ ...base, foodBudgetMonthly: -1 })).toThrow();
    expect(() => ProfileInputSchema.parse({ ...base, foodBudgetMonthly: 50001 })).toThrow();
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
      warmupCompleted: true, cooldownCompleted: false,
      sets: [{ exerciseId: 'ex-supino', setNumber: 1, weightKg: 20, reps: 8 }]
    })).toMatchObject({ warmupCompleted: true, cooldownCompleted: false });
    expect(() => WorkoutSessionInputSchema.parse({
      date: '2026-10-21', splitName: 'Treino A', completed: true,
      warmupCompleted: 'sim',
      sets: [{ exerciseId: 'ex-supino', setNumber: 1, weightKg: 20, reps: 8 }]
    })).toThrow();
    expect(WorkoutSessionInputSchema.parse({
      date: '2026-10-21', splitName: 'Treino A', completed: true,
      notes: 'Sono e disposição bons.',
      sets: [{ exerciseId: 'ex-supino', setNumber: 1, weightKg: 20, reps: 8, rir: 0, notes: 'Cadência controlada.' }]
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

  it('valida limites e campos dos modelos de treino antes do IPC', () => {
    expect(SaveWorkoutTemplateInputSchema.parse({
      name: 'Push A',
      plans: [{
        dayName: 'Segunda-feira', splitTitle: 'Casa A', focusMuscles: 'Peito', recoveryNotes: '',
        exercises: [{ exerciseId: 'ex-flexao-inclinada', sets: 3, repRange: '8 - 12', restSeconds: 60 }]
      }]
    }).plans[0].exercises[0].sets).toBe(3);
    expect(() => SaveWorkoutTemplateInputSchema.parse({ name: 'Plano vazio', plans: [] })).toThrow();
  });

  it('valida data real e tipo de dia da agenda de treinos', () => {
    expect(SaveWorkoutScheduleInputSchema.parse({ date: '2026-10-22', kind: 'deload' }).kind).toBe('deload');
    expect(() => SaveWorkoutScheduleInputSchema.parse({ date: '2026-02-30', kind: 'rest' })).toThrow();
    expect(() => SaveWorkoutScheduleInputSchema.parse({ date: '2026-10-22', kind: 'missed' })).toThrow();
  });

  it('valida medidas corporais personalizadas, unidades e registros por data', () => {
    expect(SaveCustomMeasurementDefinitionInputSchema.parse({ name: '  Pescoço ', unit: ' cm ' }))
      .toEqual({ name: 'Pescoço', unit: 'cm' });
    expect(SaveCustomMeasurementInputSchema.parse({
      definitionId: 'custom-measure-neck', date: '2026-10-22', value: 38.5, notes: 'Após acordar'
    }).value).toBe(38.5);
    expect(() => SaveCustomMeasurementDefinitionInputSchema.parse({ name: '   ', unit: 'cm' })).toThrow();
    expect(() => SaveCustomMeasurementDefinitionInputSchema.parse({ name: 'Altura', unit: 'cm; DROP TABLE' })).toThrow();
    expect(() => SaveCustomMeasurementInputSchema.parse({ definitionId: 'neck', date: '2026-02-30', value: 38 })).toThrow();
    expect(() => SaveCustomMeasurementInputSchema.parse({ definitionId: 'neck', date: '2026-10-22', value: 0 })).toThrow();
  });

  it('valida snapshots de metas do perfil antes de exibi-los', () => {
    expect(ProfileGoalHistoryRecordSchema.parse({
      id: 'goal-1', profileId: 'default-user', fitnessGoal: 'fat_loss', targetWeightKg: 74,
      changeKind: 'updated', changedFields: ['fitnessGoal', 'targetWeightKg'], changedAt: '2026-10-22T12:00:00.000Z'
    }).changeKind).toBe('updated');
    expect(() => ProfileGoalHistoryRecordSchema.parse({
      id: 'goal-2', profileId: 'default-user', fitnessGoal: 'unknown', targetWeightKg: 74,
      changeKind: 'updated', changedFields: [], changedAt: 'invalid'
    })).toThrow();
  });

  it('valida medições corporais datadas e a faixa de altura', () => {
    expect(SaveBodyMeasurementInputSchema.parse({ date: '2026-10-22', heightCm: 175.2 }))
      .toMatchObject({ date: '2026-10-22', heightCm: 175.2 });
    expect(() => SaveBodyMeasurementInputSchema.parse({ date: '2026-02-30', heightCm: 175 })).toThrow();
    expect(() => SaveBodyMeasurementInputSchema.parse({ date: '2026-10-22', heightCm: 99 })).toThrow();
    expect(() => SaveBodyMeasurementInputSchema.parse({ date: '2026-10-22' })).toThrow();
  });

  it('aceita apenas unidades compatíveis de massa alimentar e volume de água', () => {
    expect(MeasurementUnitPreferencesSchema.parse({ foodMassUnit: 'kg', waterVolumeUnit: 'l' }))
      .toEqual({ foodMassUnit: 'kg', waterVolumeUnit: 'l' });
    expect(() => MeasurementUnitPreferencesSchema.parse({ foodMassUnit: 'lb', waterVolumeUnit: 'ml' })).toThrow();
    expect(() => MeasurementUnitPreferencesSchema.parse({ foodMassUnit: 'g', waterVolumeUnit: 'gal' })).toThrow();
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

  it('valida marco de evolução com métrica, meta e data reais', () => {
    const input = { title: 'Cintura de 80 cm', metric: 'waistCircCm', targetValue: 80, direction: 'decrease', targetDate: '2027-01-01' } as const;
    expect(ShapeMilestoneInputSchema.parse(input)).toMatchObject(input);
    expect(() => ShapeMilestoneInputSchema.parse({ ...input, targetValue: 0 })).toThrow();
    expect(() => ShapeMilestoneInputSchema.parse({ ...input, targetDate: '2027-02-30' })).toThrow();
    expect(() => ShapeMilestoneInputSchema.parse({ ...input, metric: 'unknown' })).toThrow();
  });
});
