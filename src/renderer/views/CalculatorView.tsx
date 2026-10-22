import React, { useEffect, useState } from 'react';
import {
  Calculator,
  Droplets,
  HelpCircle,
  TrendingUp,
  ShieldAlert,
  Sliders
} from 'lucide-react';
import {
  ActivityLevel,
  BiologicalSex,
  FitnessGoal,
  NutritionTargets,
  UserProfile
} from '../../shared/types';
import {
  ACTIVITY_MULTIPLIERS,
  calculateAge,
  calculateBMI,
  calculateBMR,
  calculateNutritionPlan,
  calculateTDEE
} from '../../domain/nutrition-calculator';
import { millilitersToDisplayVolume } from '../../domain/measurement-units';
import { useMeasurementUnits } from '../hooks/use-measurement-units';

interface CalculatorViewProps {
  profile: UserProfile | null;
  currentWeightKg: number | null;
  onNavigateToProfile: () => void;
  onOpenWeightModal: () => void;
}

export const CalculatorView: React.FC<CalculatorViewProps> = ({
  profile,
  currentWeightKg,
  onNavigateToProfile,
  onOpenWeightModal
}) => {
  const { preferences: unitPreferences } = useMeasurementUnits();
  const [weightKg, setWeightKg] = useState<number | null>(currentWeightKg);
  const [heightCm, setHeightCm] = useState<number>(profile?.heightCm ?? 0);
  const [birthDate, setBirthDate] = useState<string>(profile?.birthDate ?? '');
  const [biologicalSex, setBiologicalSex] = useState<BiologicalSex>(
    profile?.biologicalSex || 'unspecified'
  );
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(
    profile?.activityLevel || 'moderate'
  );
  const [fitnessGoal, setFitnessGoal] = useState<FitnessGoal>(
    profile?.fitnessGoal || 'maintenance'
  );

  useEffect(() => {
    if (currentWeightKg !== null) setWeightKg(currentWeightKg);
  }, [currentWeightKg]);

  if (!profile || currentWeightKg === null) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="rounded-3xl border border-border bg-card p-8 text-center shadow-sm space-y-4">
          <Calculator className="mx-auto h-9 w-9 text-primary" />
          <h2 className="font-display text-xl font-bold text-foreground">Dados necessários para calcular suas metas</h2>
          <p className="text-sm text-muted-foreground">
            {profile ? 'Registre seu peso atual para calcular calorias, macronutrientes e hidratação.' : 'Preencha seu perfil e registre seu peso para calcular metas com seus dados.'}
          </p>
          {profile ? (
            <button type="button" onClick={onOpenWeightModal} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">
              Registrar peso atual
            </button>
          ) : (
            <button type="button" onClick={onNavigateToProfile} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">
              Preencher perfil
            </button>
          )}
        </div>
      </div>
    );
  }

  const calculationWeightKg = weightKg ?? currentWeightKg;
  const age = calculateAge(birthDate);
  const { bmi, category: bmiCategory } = calculateBMI(calculationWeightKg, heightCm);
  const bmrResult = calculateBMR(calculationWeightKg, heightCm, age, biologicalSex);
  const tdee = calculateTDEE(bmrResult.bmr, activityLevel);

  const targets: NutritionTargets = calculateNutritionPlan(
    {
      heightCm,
      birthDate,
      biologicalSex,
      activityLevel,
      fitnessGoal
    },
    calculationWeightKg
  );

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* View Header */}
      <div className="border-b border-border pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Calculator className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-foreground">
              Calculador Nutricional e Metabólico Baseado em Evidências
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Fórmula de Mifflin-St Jeor, gasto energético total (GET) e distribuição de macronutrientes com verificabilidade científica.
            </p>
          </div>
        </div>
      </div>

      {/* Grid: Inputs (Left) and Results (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Parameters */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Sliders className="h-4 w-4 text-primary" />
              <h3 className="font-display text-sm font-bold text-foreground">
                Parâmetros de Simulação
              </h3>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Peso (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="30"
                    max="250"
                    value={weightKg ?? currentWeightKg}
                    onChange={e => setWeightKg(e.target.value === '' ? null : Number(e.target.value))}
                    className="w-full rounded-xl border border-border bg-secondary/50 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Altura (cm)</label>
                  <input
                    type="number"
                    min="100"
                    max="250"
                    value={heightCm}
                    onChange={e => setHeightCm(Number(e.target.value))}
                    className="w-full rounded-xl border border-border bg-secondary/50 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Nascimento</label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={e => setBirthDate(e.target.value)}
                    className="w-full rounded-xl border border-border bg-secondary/50 px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Sexo Biológico</label>
                  <select
                    value={biologicalSex}
                    onChange={e => setBiologicalSex(e.target.value as any)}
                    className="w-full rounded-xl border border-border bg-secondary/50 px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="male">Masculino (+5)</option>
                    <option value="female">Feminino (-161)</option>
                    <option value="unspecified">Não informado (Neutro -78)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1 pt-2">
                <label className="text-xs font-semibold text-muted-foreground">Nível de Atividade</label>
                <select
                  value={activityLevel}
                  onChange={e => setActivityLevel(e.target.value as any)}
                  className="w-full rounded-xl border border-border bg-secondary/50 px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                >
                  <option value="sedentary">Sedentário (1.2×) - Pouco movimento</option>
                  <option value="light">Leve (1.375×) - Treino leve 1-3 dias</option>
                  <option value="moderate">Moderado (1.55×) - Treino regular 3-5 dias</option>
                  <option value="heavy">Muito ativo (1.725×) - Treino pesado 6-7 dias</option>
                  <option value="extreme">Extremamente ativo (1.9×) - Atleta intenso</option>
                </select>
              </div>

              <div className="space-y-1 pt-2">
                <label className="text-xs font-semibold text-muted-foreground">Objetivo Pretendido</label>
                <select
                  value={fitnessGoal}
                  onChange={e => setFitnessGoal(e.target.value as any)}
                  className="w-full rounded-xl border border-border bg-secondary/50 px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                >
                  <option value="muscle_gain">Ganho de Massa Muscular (+350 kcal)</option>
                  <option value="gradual_weight_gain">Ganho de Peso Gradual (+250 kcal)</option>
                  <option value="maintenance">Manutenção do Peso (0 kcal)</option>
                  <option value="fat_loss">Perda de Gordura / Cutting (-400 kcal)</option>
                  <option value="weight_reduction">Redução de Peso (-500 kcal)</option>
                  <option value="body_recomposition">Recomposição Corporal (-150 kcal)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Mathematical Proof Card */}
          <div className="rounded-3xl border border-border bg-secondary/30 p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <HelpCircle className="h-4 w-4 text-primary" />
              <span>Demonstração Passo a Passo</span>
            </div>
            <div className="text-[11px] text-muted-foreground font-mono space-y-1.5 leading-relaxed bg-background/50 p-3 rounded-xl border border-border/40">
              <div>• Base = (10 × {calculationWeightKg}) + (6.25 × {heightCm}) - (5 × {age})</div>
              <div>• Base = {10 * calculationWeightKg} + {6.25 * heightCm} - {5 * age} = {10 * calculationWeightKg + 6.25 * heightCm - 5 * age}</div>
              <div>• TMB (Mifflin) = {bmrResult.bmr} kcal/dia</div>
              <div>• GET = TMB × {ACTIVITY_MULTIPLIERS[activityLevel]} = {tdee} kcal/dia</div>
              <div>• Meta = GET {targets.targetCalories >= tdee ? '+' : ''}{targets.targetCalories - tdee} kcal = {targets.targetCalories} kcal/dia</div>
            </div>
          </div>
        </div>

        {/* Right Column: Calculated Outputs */}
        <div className="lg:col-span-7 space-y-6">
          {/* Main Calculated Target Banner */}
          <div className="rounded-3xl border border-primary/30 bg-gradient-to-br from-card to-primary/5 p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/70 pb-5">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-primary">
                  Calorias Diárias Recomendadas
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="font-display text-4xl font-extrabold text-foreground">
                    {targets.targetCalories}
                  </span>
                  <span className="text-sm font-semibold text-muted-foreground">kcal / dia</span>
                </div>
              </div>

              <div className="flex flex-col sm:items-end">
                <span className="text-xs text-muted-foreground">Ritmo Semanal Estimado</span>
                <span className="font-display text-lg font-bold text-foreground flex items-center gap-1">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  {targets.targetPaceKgPerWeek > 0 ? `+${targets.targetPaceKgPerWeek}` : targets.targetPaceKgPerWeek} kg / semana
                </span>
              </div>
            </div>

            {/* BMR vs TDEE Comparison */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-5">
              <div>
                <span className="text-[11px] text-muted-foreground block font-medium">
                  Taxa Metabólica Basal (TMB)
                </span>
                <span className="font-display text-lg font-bold text-foreground">
                  {targets.bmr} kcal
                </span>
                <span className="text-[10px] text-muted-foreground block">Sobrevivência em repouso</span>
              </div>

              <div>
                <span className="text-[11px] text-muted-foreground block font-medium">
                  Gasto Energético Total (GET)
                </span>
                <span className="font-display text-lg font-bold text-foreground">
                  {targets.tdee} kcal
                </span>
                <span className="text-[10px] text-muted-foreground block">Inclui atividade diária</span>
              </div>

              <div className="col-span-2 sm:col-span-1">
                <span className="text-[11px] text-muted-foreground block font-medium">
                  Índice de Massa Corporal (IMC)
                </span>
                <span className="font-display text-lg font-bold text-foreground">
                  {bmi} kg/m²
                </span>
                <span className="text-[10px] text-muted-foreground block truncate">{bmiCategory}</span>
              </div>
            </div>
          </div>

          {/* Macronutrients Detailed Card */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-5">
            <h3 className="font-display text-base font-bold text-foreground border-b border-border pb-3">
              Distribuição Energética dos Macronutrientes
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Protein */}
              <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary">Proteínas</span>
                  <span className="text-xs font-mono font-bold text-primary">{targets.proteinPct}%</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="font-display text-3xl font-extrabold text-foreground">
                    {targets.proteinGrams}
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground">g / dia</span>
                </div>
                <div className="text-[11px] text-muted-foreground space-y-0.5 border-t border-border/50 pt-2">
                  <div>• {targets.proteinKcal} kcal</div>
                  <div>• {(targets.proteinGrams / calculationWeightKg).toFixed(1)} g / kg de peso</div>
                </div>
              </div>

              {/* Carbohydrates */}
              <div className="rounded-2xl border border-border bg-secondary/30 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Carboidratos</span>
                  <span className="text-xs font-mono font-bold text-muted-foreground">{targets.carbPct}%</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="font-display text-3xl font-extrabold text-foreground">
                    {targets.carbGrams}
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground">g / dia</span>
                </div>
                <div className="text-[11px] text-muted-foreground space-y-0.5 border-t border-border/50 pt-2">
                  <div>• {targets.carbKcal} kcal</div>
                  <div>• {(targets.carbGrams / calculationWeightKg).toFixed(1)} g / kg de peso</div>
                </div>
              </div>

              {/* Fats */}
              <div className="rounded-2xl border border-border bg-secondary/30 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Gorduras</span>
                  <span className="text-xs font-mono font-bold text-muted-foreground">{targets.fatPct}%</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="font-display text-3xl font-extrabold text-foreground">
                    {targets.fatGrams}
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground">g / dia</span>
                </div>
                <div className="text-[11px] text-muted-foreground space-y-0.5 border-t border-border/50 pt-2">
                  <div>• {targets.fatKcal} kcal</div>
                  <div>• {(targets.fatGrams / calculationWeightKg).toFixed(1)} g / kg de peso</div>
                </div>
              </div>
            </div>

            {/* Hydration Card */}
            <div className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400">
                  <Droplets className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-foreground block">
                    Meta de Hidratação Diária Estimada
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Base: 38 ml por kg corporal para praticantes de musculação
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="font-display text-2xl font-bold text-blue-400">
                  {millilitersToDisplayVolume(targets.waterMl, unitPreferences.waterVolumeUnit).toLocaleString('pt-BR', { maximumFractionDigits: unitPreferences.waterVolumeUnit === 'l' ? 2 : 0 })} {unitPreferences.waterVolumeUnit === 'l' ? 'L' : 'mL'}
                </span>
                <span className="text-[10px] text-muted-foreground block">{unitPreferences.waterVolumeUnit === 'l' ? `${targets.waterMl.toLocaleString('pt-BR')} mL` : `${(targets.waterMl / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} L`}</span>
              </div>
            </div>

            {/* Safety Guidelines */}
            <div className="rounded-2xl border border-border bg-secondary/20 p-4 text-xs text-muted-foreground space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-foreground">
                <ShieldAlert className="h-4 w-4 text-primary" />
                <span>Diretrizes de Segurança e Ajustes Contínuos</span>
              </div>
              <p>
                Os cálculos acima são estimativas determinísticas baseadas na sua biometria e rotina. O aplicativo ajusta automaticamente as calorias apenas após avaliar a <strong>média móvel de 7 dias</strong> de pesagens reais na balança, nunca com base em oscilações isoladas de um único dia.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
