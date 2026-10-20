import {
  ActivityLevel,
  BiologicalSex,
  NutritionTargets,
  UserProfile
} from '../shared/types';

/**
 * Calcula a idade com precisão a partir de uma data no formato YYYY-MM-DD
 */
export function calculateAge(birthDateStr: string, referenceDate: Date = new Date()): number {
  const birthDate = new Date(birthDateStr);
  if (isNaN(birthDate.getTime())) {
    return 25; // Fallback seguro para idade média adulta
  }

  let age = referenceDate.getFullYear() - birthDate.getFullYear();
  const monthDiff = referenceDate.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getDate() < birthDate.getDate())) {
    age--;
  }

  return Math.max(0, age);
}

/**
 * Calcula o IMC (Índice de Massa Corporal) e sua classificação da OMS
 */
export function calculateBMI(weightKg: number, heightCm: number): { bmi: number; category: string } {
  if (heightCm <= 0 || weightKg <= 0) {
    return { bmi: 0, category: 'Dados insuficientes' };
  }

  const heightM = heightCm / 100;
  const bmi = Number((weightKg / (heightM * heightM)).toFixed(1));

  let category = 'Eutrofia (Peso normal)';
  if (bmi < 18.5) {
    category = 'Abaixo do peso';
  } else if (bmi >= 25.0 && bmi < 29.9) {
    category = 'Sobrepeso (Atenção: em praticantes de musculação pode indicar alta massa magra)';
  } else if (bmi >= 30.0 && bmi < 34.9) {
    category = 'Obesidade Grau I';
  } else if (bmi >= 35.0 && bmi < 39.9) {
    category = 'Obesidade Grau II';
  } else if (bmi >= 40.0) {
    category = 'Obesidade Grau III';
  }

  return { bmi, category };
}

/**
 * Multiplicadores de atividade física validados na literatura científica
 */
export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,    // Trabalho sedentário e pouco/nenhum exercício
  light: 1.375,      // Exercício leve 1-3 dias/semana
  moderate: 1.55,    // Exercício moderado 3-5 dias/semana
  heavy: 1.725,      // Treino pesado 6-7 dias/semana
  extreme: 1.9       // Treino 2x/dia ou atleta com trabalho físico pesado
};

/**
 * Calcula a Taxa Metabólica Basal (TMB) pela fórmula de Mifflin-St Jeor
 * Homens: (10 × peso) + (6.25 × altura) - (5 × idade) + 5
 * Mulheres: (10 × peso) + (6.25 × altura) - (5 × idade) - 161
 * Não especificado: Média neutra (-78) com anotação explícita de incerteza
 */
export function calculateBMR(
  weightKg: number,
  heightCm: number,
  age: number,
  biologicalSex: BiologicalSex
): { bmr: number; formula: string; uncertaintyNotes?: string } {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;

  if (biologicalSex === 'male') {
    const bmr = Math.round(base + 5);
    return {
      bmr,
      formula: 'Mifflin-St Jeor (Masculino): 10 × peso + 6.25 × altura - 5 × idade + 5'
    };
  } else if (biologicalSex === 'female') {
    const bmr = Math.round(base - 161);
    return {
      bmr,
      formula: 'Mifflin-St Jeor (Feminino): 10 × peso + 6.25 × altura - 5 × idade - 161'
    };
  } else {
    // Tratamento formal de incerteza: média neutra com margem de ±83 kcal
    const bmr = Math.round(base - 78);
    return {
      bmr,
      formula: 'Mifflin-St Jeor (Média Neutra): 10 × peso + 6.25 × altura - 5 × idade - 78',
      uncertaintyNotes: 'Sexo biológico não informado. Estimativa com margem de incerteza de ±83 kcal.'
    };
  }
}

/**
 * Calcula o Gasto Energético Total (GET / TDEE)
 */
export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel] || 1.2;
  return Math.round(bmr * multiplier);
}

/**
 * Calcula as metas nutricionais completas, calorias e distribuição de macronutrientes
 */
export function calculateNutritionPlan(
  profile: Pick<UserProfile, 'heightCm' | 'birthDate' | 'biologicalSex' | 'activityLevel' | 'fitnessGoal'>,
  currentWeightKg: number
): NutritionTargets {
  const age = calculateAge(profile.birthDate);
  const { bmi, category: bmiCategory } = calculateBMI(currentWeightKg, profile.heightCm);
  const { bmr, formula, uncertaintyNotes } = calculateBMR(
    currentWeightKg,
    profile.heightCm,
    age,
    profile.biologicalSex
  );
  const tdee = calculateTDEE(bmr, profile.activityLevel);

  let calorieAdjustment = 0;
  let targetPaceKgPerWeek = 0;
  let proteinMultiplier = 1.8; // g/kg padrão
  let fatMultiplier = 0.9;     // g/kg padrão

  switch (profile.fitnessGoal) {
    case 'muscle_gain':
      // Superávit calórico controlado para hipertrofia sem ganho desnecessário de gordura
      calorieAdjustment = 350;
      targetPaceKgPerWeek = 0.25; // ~1 kg por mês
      proteinMultiplier = 2.0;
      fatMultiplier = 0.9;
      break;

    case 'gradual_weight_gain':
      calorieAdjustment = 250;
      targetPaceKgPerWeek = 0.20;
      proteinMultiplier = 1.8;
      fatMultiplier = 0.85;
      break;

    case 'maintenance':
      calorieAdjustment = 0;
      targetPaceKgPerWeek = 0.0;
      proteinMultiplier = 1.8;
      fatMultiplier = 0.9;
      break;

    case 'fat_loss':
      // Déficit moderado para preservar massa magra
      calorieAdjustment = -400;
      targetPaceKgPerWeek = -0.40;
      proteinMultiplier = 2.2; // Maior proteína para saciedade e preservação muscular
      fatMultiplier = 0.8;
      break;

    case 'weight_reduction':
      calorieAdjustment = -500;
      targetPaceKgPerWeek = -0.50;
      proteinMultiplier = 2.0;
      fatMultiplier = 0.8;
      break;

    case 'body_recomposition':
      // Leve déficit ou equilíbrio com proteína elevada
      calorieAdjustment = -150;
      targetPaceKgPerWeek = -0.15;
      proteinMultiplier = 2.2;
      fatMultiplier = 0.85;
      break;
  }

  // Trava de segurança clínica: nunca recomendar calorias perigosamente baixas
  let targetCalories = tdee + calorieAdjustment;
  const minSafeCalories = profile.biologicalSex === 'female' ? 1200 : 1500;
  if (targetCalories < minSafeCalories) {
    targetCalories = minSafeCalories;
  }

  // Gramas de Proteína (4 kcal/g)
  const proteinGrams = Math.round(currentWeightKg * proteinMultiplier);
  const proteinKcal = proteinGrams * 4;

  // Gramas de Gordura (9 kcal/g)
  // Garantir mínimo de 20% do VET para síntese hormonal e absorção de vitaminas lipossolúveis
  let fatGrams = Math.round(currentWeightKg * fatMultiplier);
  let fatKcal = fatGrams * 9;
  const minFatKcal = targetCalories * 0.20;
  if (fatKcal < minFatKcal) {
    fatKcal = minFatKcal;
    fatGrams = Math.round(fatKcal / 9);
  }

  // Gramas de Carboidrato (4 kcal/g)
  // O saldo energético restante é atribuído aos carboidratos
  const remainingKcal = Math.max(0, targetCalories - (proteinKcal + fatKcal));
  const carbGrams = Math.round(remainingKcal / 4);
  const carbKcal = carbGrams * 4;

  // Totais reais calculados
  const calculatedTotalKcal = proteinKcal + fatKcal + carbKcal;
  const proteinPct = Math.round((proteinKcal / calculatedTotalKcal) * 100);
  const fatPct = Math.round((fatKcal / calculatedTotalKcal) * 100);
  const carbPct = Math.max(0, 100 - (proteinPct + fatPct));

  // Estimativa de hidratação: 35 ml/kg a 40 ml/kg de peso corporal base
  const waterMl = Math.round((currentWeightKg * 38) / 50) * 50;

  return {
    bmr,
    tdee,
    targetCalories: calculatedTotalKcal,
    proteinGrams,
    carbGrams,
    fatGrams,
    proteinKcal,
    carbKcal,
    fatKcal,
    proteinPct,
    carbPct,
    fatPct,
    waterMl,
    bmi,
    bmiCategory,
    targetPaceKgPerWeek,
    formulaUsed: formula,
    uncertaintyNotes
  };
}
