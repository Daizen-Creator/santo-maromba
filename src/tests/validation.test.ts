import { describe, it, expect } from 'vitest';
import {
  InitialHistoryConfirmationSchema,
  CustomFoodInputSchema,
  PhotoInputSchema,
  PhotoNotesUpdateSchema,
  ProfileInputSchema,
  WeightRecordInputSchema
} from '../shared/schema';

describe('Validação de Schemas Zod — Contratos de Dados', () => {
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
