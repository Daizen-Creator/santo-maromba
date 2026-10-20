import { describe, it, expect } from 'vitest';
import {
  calculateAge,
  calculateBMI,
  calculateBMR,
  calculateNutritionPlan,
  calculateTDEE
} from '../domain/nutrition-calculator';

describe('Calculador Nutricional — Fórmulas e Regras de Negócio', () => {
  it('deve calcular a idade corretamente a partir da data de nascimento', () => {
    const refDate = new Date('2026-10-19');
    expect(calculateAge('2008-05-14', refDate)).toBe(18);
    expect(calculateAge('2000-11-20', refDate)).toBe(25); // ainda não fez aniversário em 2026
    expect(calculateAge('2000-10-10', refDate)).toBe(26); // já fez aniversário em 2026
  });

  it('deve calcular o IMC e categorizar conforme a OMS', () => {
    // 73.2 kg e 182 cm -> 73.2 / (1.82^2) = 22.09 kg/m²
    const { bmi, category } = calculateBMI(73.2, 182);
    expect(bmi).toBe(22.1);
    expect(category).toContain('Eutrofia');

    // Abaixo do peso: 50 kg e 180 cm -> 15.4 kg/m²
    const under = calculateBMI(50, 180);
    expect(under.bmi).toBe(15.4);
    expect(under.category).toBe('Abaixo do peso');

    // Sobrepeso: 90 kg e 180 cm -> 27.8 kg/m²
    const over = calculateBMI(90, 180);
    expect(over.bmi).toBe(27.8);
    expect(over.category).toContain('Sobrepeso');
  });

  it('deve calcular a TMB pela fórmula Mifflin-St Jeor para homens', () => {
    // Homem: 10 * 73 + 6.25 * 182 - 5 * 18 + 5 = 730 + 1137.5 - 90 + 5 = 1782.5 -> 1783 kcal
    const { bmr, formula } = calculateBMR(73, 182, 18, 'male');
    expect(bmr).toBe(1783);
    expect(formula).toContain('Mifflin-St Jeor (Masculino)');
  });

  it('deve calcular a TMB pela fórmula Mifflin-St Jeor para mulheres', () => {
    // Mulher: 10 * 60 + 6.25 * 165 - 5 * 25 - 161 = 600 + 1031.25 - 125 - 161 = 1345.25 -> 1345 kcal
    const { bmr, formula } = calculateBMR(60, 165, 25, 'female');
    expect(bmr).toBe(1345);
    expect(formula).toContain('Mifflin-St Jeor (Feminino)');
  });

  it('deve calcular a TMB média com tratamento de incerteza para sexo não informado', () => {
    const { bmr, uncertaintyNotes } = calculateBMR(73, 182, 18, 'unspecified');
    // Base - 78 = 1777.5 - 78 = 1699.5 -> 1700 kcal
    expect(bmr).toBe(1700);
    expect(uncertaintyNotes).toBeDefined();
    expect(uncertaintyNotes).toContain('incerteza');
  });

  it('deve calcular o GET (TDEE) conforme o multiplicador de atividade física', () => {
    const bmr = 1750;
    expect(calculateTDEE(bmr, 'sedentary')).toBe(2100);  // 1750 * 1.2
    expect(calculateTDEE(bmr, 'light')).toBe(2406);      // 1750 * 1.375 = 2406.25
    expect(calculateTDEE(bmr, 'moderate')).toBe(2713);   // 1750 * 1.55 = 2712.5
    expect(calculateTDEE(bmr, 'heavy')).toBe(3019);      // 1750 * 1.725 = 3018.75
    expect(calculateTDEE(bmr, 'extreme')).toBe(3325);    // 1750 * 1.9 = 3325
  });

  it('deve gerar plano nutricional equilibrado e seguro para ganho de massa muscular', () => {
    const plan = calculateNutritionPlan(
      {
        heightCm: 182,
        birthDate: '2008-05-14',
        biologicalSex: 'male',
        activityLevel: 'moderate',
        fitnessGoal: 'muscle_gain'
      },
      73
    );

    // BMR ~1783, TDEE ~2764, Meta calórica com superávit ~3100
    expect(plan.targetCalories).toBeGreaterThan(plan.tdee);
    expect(plan.proteinGrams).toBeGreaterThanOrEqual(140); // 2.0 g/kg para 73 kg = 146 g
    expect(plan.fatGrams).toBeGreaterThanOrEqual(55);     // mínimo saudável
    expect(plan.waterMl).toBeGreaterThanOrEqual(2500);    // ~38 ml/kg
    expect(plan.proteinPct + plan.fatPct + plan.carbPct).toBe(100);
  });

  it('deve gerar plano nutricional seguro para perda de gordura sem déficit extremo', () => {
    const plan = calculateNutritionPlan(
      {
        heightCm: 180,
        birthDate: '1995-01-01',
        biologicalSex: 'female',
        activityLevel: 'sedentary',
        fitnessGoal: 'fat_loss'
      },
      65
    );

    // Não deve violar a trava de segurança de 1200 kcal para mulheres
    expect(plan.targetCalories).toBeGreaterThanOrEqual(1200);
    expect(plan.proteinGrams).toBeGreaterThanOrEqual(130); // 2.2 g/kg em déficit = 143 g
  });
});
