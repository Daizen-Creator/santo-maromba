import React, { useState } from 'react';
import {
  Scale,
  Target,
  Flame,
  Droplets,
  AlertCircle,
  Activity,
  Sparkles,
  Info,
  Dumbbell,
  Camera,
  TrendingUp
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { StatCard } from '../components/StatCard';
import { DailyIntakePanel } from '../components/DailyIntakePanel';
import { DashboardSummary, Exercise, LoggedMealInput, NutritionAnalytics, NutritionAnalyticsQuery, WeightAnalyticsPoint, WorkoutSession } from '../../shared/types';
import { ScheduledWorkout } from '../../domain/workout-engine';
import { millilitersToDisplayVolume } from '../../domain/measurement-units';
import { useMeasurementUnits } from '../hooks/use-measurement-units';

interface DashboardViewProps {
  summary: DashboardSummary | null;
  analytics: WeightAnalyticsPoint[];
  onOpenWeightModal: () => void;
  onNavigateToTab: (tab: string) => void;
  onOpenHistoryModal: () => void;
  initialHistoryConfirmed: boolean;
  sessions: WorkoutSession[];
  exercises: Exercise[];
  workoutOfDay: ScheduledWorkout | null;
  onAddMeal: (meal: LoggedMealInput) => Promise<void>;
  onAddWater: (amountMl: number) => Promise<void>;
  onNavigateToShapeCompare: () => void;
  onGetNutritionAnalytics: (query: NutritionAnalyticsQuery) => Promise<NutritionAnalytics>;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  summary,
  analytics,
  onOpenWeightModal,
  onNavigateToTab,
  onOpenHistoryModal,
  initialHistoryConfirmed,
  sessions,
  exercises,
  workoutOfDay,
  onAddMeal,
  onAddWater,
  onNavigateToShapeCompare,
  onGetNutritionAnalytics
}) => {
  const { preferences: unitPreferences } = useMeasurementUnits();
  const [chartRange, setChartRange] = useState<'30d' | '90d' | 'all'>('all');
  const [selectedExerciseId, setSelectedExerciseId] = useState('');
  const [nutritionAnalytics, setNutritionAnalytics] = useState<NutritionAnalytics | null>(null);
  const [nutritionAnalyticsError, setNutritionAnalyticsError] = useState<string | null>(null);
  const [nutritionAnalyticsLoading, setNutritionAnalyticsLoading] = useState(false);

  React.useEffect(() => {
    let active = true;
    const to = new Date();
    const from = new Date(to.getFullYear(), to.getMonth(), to.getDate() - 6);
    const formatDate = (date: Date) => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
    setNutritionAnalyticsLoading(true);
    onGetNutritionAnalytics({ fromDate: formatDate(from), toDate: formatDate(to) })
      .then(result => {
        if (!active) return;
        setNutritionAnalytics(result);
        setNutritionAnalyticsError(null);
      })
      .catch(error => {
        if (!active) return;
        setNutritionAnalyticsError(error instanceof Error ? error.message : 'Não foi possível calcular as médias nutricionais.');
      })
      .finally(() => { if (active) setNutritionAnalyticsLoading(false); });
    return () => { active = false; };
  }, [onGetNutritionAnalytics, summary?.caloriesLogged, summary?.proteinLoggedG, summary?.carbsLoggedG, summary?.fatsLoggedG]);

  const filteredAnalytics = React.useMemo(() => {
    if (!analytics || analytics.length === 0) return [];
    if (chartRange === 'all') return analytics;

    const now = new Date().getTime();
    const days = chartRange === '30d' ? 30 : 90;
    const cutoff = now - days * 24 * 60 * 60 * 1000;

    return analytics.filter(pt => new Date(pt.date).getTime() >= cutoff);
  }, [analytics, chartRange]);

  const targets = summary?.nutritionTargets;
  React.useEffect(() => {
    if (!exercises.some(exercise => exercise.id === selectedExerciseId)) {
      setSelectedExerciseId(exercises[0]?.id || '');
    }
  }, [exercises, selectedExerciseId]);

  const currentMonthPrefix = (() => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-`;
  })();
  const trainingDates = React.useMemo(() => new Set(
    sessions
      .filter(session => session.completed && session.date.startsWith(currentMonthPrefix))
      .map(session => session.date)
  ), [sessions, currentMonthPrefix]);
  const currentMonthCells = React.useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const offset = (new Date(year, month, 1).getDay() + 6) % 7;
    return [
      ...Array.from({ length: offset }, () => null),
      ...Array.from({ length: days }, (_, index) =>
        [year, String(month + 1).padStart(2, '0'), String(index + 1).padStart(2, '0')].join('-')
      )
    ];
  }, [currentMonthPrefix]);
  const exerciseLoadPoints = React.useMemo(() => {
    const byDate = new Map<string, number>();
    for (const session of sessions) {
      if (!session.completed) continue;
      for (const set of session.sets) {
        if (set.exerciseId !== selectedExerciseId) continue;
        byDate.set(session.date, Math.max(byDate.get(session.date) || 0, set.weightKg));
      }
    }
    return [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, weightKg]) => ({ date, weightKg }));
  }, [sessions, selectedExerciseId]);

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Alert Banner for Unconfirmed Initial History */}
      {!initialHistoryConfirmed && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Confira seu perfil
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Confirme altura, data de nascimento e meta. Pesagens e medidas só aparecem depois que você as registra.
              </p>
            </div>
          </div>
          <button
            onClick={onOpenHistoryModal}
            className="shrink-0 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-black hover:bg-amber-400 transition-all shadow-md shadow-amber-500/20 active:scale-95"
          >
            Revisar e Confirmar
          </button>
        </div>
      )}

      {/* Outdated Data Alert */}
      {summary?.outdatedDataAlerts && summary.outdatedDataAlerts.length > 0 && (
        <div className="space-y-2">
          {summary.outdatedDataAlerts.map((alert, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-xs text-blue-200 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 shrink-0 text-blue-400" />
                <span>{alert}</span>
              </div>
              <button
                onClick={onOpenWeightModal}
                className="shrink-0 font-semibold text-blue-400 hover:underline"
              >
                Atualizar agora
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Top 4 Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Peso Atual"
          value={summary?.currentWeightKg ? summary.currentWeightKg.toFixed(1) : '--'}
          unit="kg"
          icon={Scale}
          delta={summary?.weeklyWeightDeltaKg}
          deltaSuffix="kg nesta semana"
          origin="registrado"
          highlight
        />

        <StatCard
          title="Média Móvel (7 Dias)"
          value={summary?.movingAverage7dKg ? summary.movingAverage7dKg.toFixed(1) : '--'}
          unit="kg"
          icon={Activity}
          subtitle="Atenua flutuações de água e sódio"
          origin="calculado"
        />

        <StatCard
          title="Meta Corporal"
          value={summary?.targetWeightKg ? `${summary.targetWeightKg.toFixed(1)}` : '--'}
          unit="kg"
          icon={Target}
          subtitle={
            summary?.weightProgressPct !== null && summary?.weightProgressPct !== undefined
              ? `${summary.weightProgressPct}% do progresso concluído`
              : 'Defina no seu perfil'
          }
          origin="registrado"
        />

        <StatCard
          title="Calorias Alvo Diárias"
          value={targets?.targetCalories || '--'}
          unit="kcal"
          icon={Flame}
          subtitle={
            targets
              ? `${targets.tdee} kcal GET (${targets.targetCalories >= targets.tdee ? '+' : ''}${targets.targetCalories - targets.tdee} kcal)`
              : summary?.currentWeightKg
                ? 'Preencha seu perfil para calcular metas'
                : 'Registre seu peso atual para calcular metas'
          }
          origin="calculado"
        />
      </div>

      {/* Nutrition Plan & Macronutrients Card */}
      {targets && (
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Sparkles className="h-4 w-4" />
                </span>
                <h2 className="font-display text-base font-bold text-foreground">
                  Planejamento Calórico e Macronutrientes
                </h2>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Fórmula: {targets.formulaUsed}
                {targets.uncertaintyNotes && (
                  <span className="block text-amber-400 mt-0.5">• {targets.uncertaintyNotes}</span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium">Classificação IMC:</span>
              <span className="rounded-lg border border-border bg-secondary px-2.5 py-1 text-xs font-semibold text-foreground">
                {targets.bmi} kg/m² ({targets.bmiCategory})
              </span>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {/* Protein */}
            <div className="rounded-2xl border border-border bg-secondary/30 p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">Proteína</span>
                <span className="font-mono text-muted-foreground">{targets.proteinPct}%</span>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="font-display text-2xl font-bold text-primary">
                  {targets.proteinGrams}
                </span>
                <span className="text-xs text-muted-foreground">g/dia</span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {targets.proteinKcal} kcal • {summary?.currentWeightKg ? `~${(targets.proteinGrams / summary.currentWeightKg).toFixed(1)} g/kg` : 'peso atual não registrado'}
              </p>
            </div>

            {/* Carbs */}
            <div className="rounded-2xl border border-border bg-secondary/30 p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">Carboidratos</span>
                <span className="font-mono text-muted-foreground">{targets.carbPct}%</span>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="font-display text-2xl font-bold text-foreground">
                  {targets.carbGrams}
                </span>
                <span className="text-xs text-muted-foreground">g/dia</span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {targets.carbKcal} kcal • Combustível de treino
              </p>
            </div>

            {/* Fats */}
            <div className="rounded-2xl border border-border bg-secondary/30 p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">Gorduras</span>
                <span className="font-mono text-muted-foreground">{targets.fatPct}%</span>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="font-display text-2xl font-bold text-foreground">
                  {targets.fatGrams}
                </span>
                <span className="text-xs text-muted-foreground">g/dia</span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {targets.fatKcal} kcal • Síntese hormonal
              </p>
            </div>

            {/* Water */}
            <div className="rounded-2xl border border-border bg-secondary/30 p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground flex items-center gap-1">
                  <Droplets className="h-3.5 w-3.5 text-blue-400" />
                  Hidratação Alvo
                </span>
                <span className="text-[10px] text-blue-400 font-semibold uppercase">Estimada</span>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="font-display text-2xl font-bold text-blue-400">
                  {millilitersToDisplayVolume(targets.waterMl, unitPreferences.waterVolumeUnit).toLocaleString('pt-BR', { maximumFractionDigits: unitPreferences.waterVolumeUnit === 'l' ? 2 : 0 })}
                </span>
                <span className="text-xs text-muted-foreground">{unitPreferences.waterVolumeUnit === 'l' ? 'L/dia' : 'mL/dia'}</span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                ~38 ml/kg • {(targets.waterMl / 250).toFixed(0)} copos de 250 ml
              </p>
            </div>
          </div>
        </div>
      )}

      <DailyIntakePanel summary={summary} onAddMeal={onAddMeal} onAddWater={onAddWater} />

      <section className="rounded-3xl border border-border bg-card p-5 shadow-sm" aria-label="Médias de nutrição dos últimos sete dias">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 pb-3">
          <div>
            <h2 className="font-display text-base font-bold text-foreground">Média alimentar dos últimos 7 dias</h2>
            <p className="mt-1 text-xs text-muted-foreground">Média calculada somente nos dias com consumo registrado ({nutritionAnalytics?.trackedDays || 0}/7).</p>
          </div>
          {nutritionAnalyticsLoading && <span className="text-[11px] text-muted-foreground">Atualizando…</span>}
        </div>
        {nutritionAnalyticsError ? (
          <p role="alert" className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">{nutritionAnalyticsError}</p>
        ) : nutritionAnalytics?.averages ? (
          <>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: 'Calorias', value: `${Math.round(nutritionAnalytics.averages.calories)} kcal` },
                { label: 'Proteína', value: `${nutritionAnalytics.averages.proteinG.toFixed(1)} g` },
                { label: 'Carboidratos', value: `${nutritionAnalytics.averages.carbsG.toFixed(1)} g` },
                { label: 'Gorduras', value: `${nutritionAnalytics.averages.fatsG.toFixed(1)} g` }
              ].map(metric => (
                <div key={metric.label} className="rounded-xl border border-border/70 bg-secondary/30 p-3">
                  <span className="block text-[10px] text-muted-foreground">{metric.label} · média/dia</span>
                  <strong className="mt-1 block text-sm font-semibold text-foreground">{metric.value}</strong>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2" aria-label="Consumo por dia com registros">
              {nutritionAnalytics.days.map(day => (
                <span key={day.date} className="text-[10px] text-muted-foreground">
                  {new Date(`${day.date}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' })}: <strong className="text-foreground">{Math.round(day.calories)} kcal</strong>
                </span>
              ))}
            </div>
          </>
        ) : (
          <p className="mt-4 text-xs text-muted-foreground">Ainda não há consumo registrado nesse período. Dias sem dados não entram na média.</p>
        )}
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-bold text-foreground">Frequência de treino</h2>
              <p className="mt-1 text-xs text-muted-foreground">Dias com sessões concluídas em {new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date())}.</p>
            </div>
            <Dumbbell className="h-4 w-4 text-primary" />
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((day, index) => <span key={`${day}-${index}`} className="pb-1 text-center text-[9px] text-muted-foreground">{day}</span>)}
            {currentMonthCells.map((date, index) => date ? (
              <span
                key={date}
                title={trainingDates.has(date) ? `${date}: treino concluído` : `${date}: sem treino registrado`}
                className={`flex aspect-square items-center justify-center rounded-md text-[9px] ${trainingDates.has(date) ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20' : 'border border-border/50 bg-secondary/45 text-muted-foreground'}`}
              >
                {Number(date.slice(-2))}
              </span>
            ) : <span key={`blank-${index}`} />)}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-[10px] text-muted-foreground">
            <span>{trainingDates.size} dia(s) treinado(s) no mês</span>
            <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-secondary" /> Sem treino <i className="ml-2 h-2.5 w-2.5 rounded-sm bg-primary" /> Treino concluído</span>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-base font-bold text-foreground">Progressão de cargas</h2>
              <p className="mt-1 text-xs text-muted-foreground">Maior carga registrada em cada sessão para o exercício selecionado.</p>
            </div>
            <select value={selectedExerciseId} onChange={event => setSelectedExerciseId(event.target.value)} disabled={!exercises.length} className="max-w-full rounded-xl border border-border bg-secondary/50 px-3 py-2 text-xs text-foreground">
              {exercises.map(exercise => <option key={exercise.id} value={exercise.id}>{exercise.name}</option>)}
            </select>
          </div>
          <div className="h-56 w-full">
            {exerciseLoadPoints.length === 0 ? (
              <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-border px-5 text-center text-xs text-muted-foreground">
                Ainda não há cargas registradas para este exercício.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={exerciseLoadPoints} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} tickFormatter={date => date.slice(5).replace('-', '/')} axisLine={false} tickLine={false} />
                  <YAxis unit="kg" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 11 }} formatter={(value: number) => [`${value} kg`, 'Maior carga']} labelFormatter={label => `Data: ${label}`} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Line type="monotone" dataKey="weightKg" name="Carga máxima registrada" stroke="#76d0a0" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border border-primary/20 bg-gradient-to-br from-card to-primary/5 p-5">
          <div className="flex items-center gap-2 text-primary"><Dumbbell className="h-4 w-4" /><span className="text-xs font-bold">Próximo treino programado</span></div>
          {workoutOfDay ? (
            <>
              <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-primary">
                {workoutOfDay.daysUntil === 0
                  ? 'Hoje'
                  : new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }).format(workoutOfDay.scheduledDate)}
              </p>
              <h3 className="mt-1 font-display text-sm font-bold text-foreground">{workoutOfDay.plan.splitTitle}</h3>
              <p className="mt-1 text-[11px] text-muted-foreground">{workoutOfDay.plan.focusMuscles} · {workoutOfDay.plan.exercises.length} exercícios</p>
            </>
          ) : <p className="mt-3 text-xs text-muted-foreground">Nenhum treino programado disponível no perfil.</p>}
          <button onClick={() => onNavigateToTab('workouts')} className="mt-4 rounded-xl bg-primary px-3.5 py-2 text-[11px] font-bold text-primary-foreground">Abrir treino</button>
        </div>
        <div className="rounded-3xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-primary"><Camera className="h-4 w-4" /><span className="text-xs font-bold">Comparar evolução</span></div>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Abra duas datas registradas e compare suas fotos lado a lado.</p>
          <button onClick={onNavigateToShapeCompare} className="mt-4 rounded-xl border border-border bg-secondary/50 px-3.5 py-2 text-[11px] font-bold text-foreground hover:border-primary/40">Comparar fotos</button>
        </div>
        <div className="rounded-3xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-primary"><TrendingUp className="h-4 w-4" /><span className="text-xs font-bold">Cenário de projeção física</span></div>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Explore uma previsão estimada com base nas medidas e nos registros do seu perfil.</p>
          <button onClick={() => onNavigateToTab('projection')} className="mt-4 rounded-xl border border-border bg-secondary/50 px-3.5 py-2 text-[11px] font-bold text-foreground hover:border-primary/40">Abrir projeção</button>
        </div>
      </section>

      {/* Weight Chart Section */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <h2 className="font-display text-base font-bold text-foreground">
              Trajetória e Tendência de Peso Corporal
            </h2>
            <p className="text-xs text-muted-foreground">
              Comparação entre pesagens individuais e a média móvel de 7 dias
            </p>
          </div>

          <div className="flex items-center gap-1.5 rounded-xl border border-border bg-secondary/50 p-1">
            {[
              { id: '30d', label: '30 Dias' },
              { id: '90d', label: '90 Dias' },
              { id: 'all', label: 'Tudo' }
            ].map(r => (
              <button
                key={r.id}
                onClick={() => setChartRange(r.id as any)}
                className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                  chartRange === r.id
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 h-72 w-full">
          {filteredAnalytics.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <Scale className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm font-semibold text-muted-foreground">
                Nenhum dado de peso registrado para exibir no gráfico.
              </p>
              <button
                onClick={onOpenWeightModal}
                className="mt-3 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
              >
                Registrar Primeira Pesagem
              </button>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={filteredAnalytics} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222736" opacity={0.5} />
                <XAxis
                  dataKey="date"
                  stroke="#6b7280"
                  fontSize={11}
                  tickFormatter={val => {
                    const parts = val.split('-');
                    return `${parts[2]}/${parts[1]}`;
                  }}
                />
                <YAxis
                  stroke="#6b7280"
                  fontSize={11}
                  domain={['dataMin - 2', 'dataMax + 2']}
                  unit="kg"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0d111a',
                    border: '1px solid #1f293d',
                    borderRadius: '12px',
                    fontSize: '12px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                  }}
                  formatter={(val: any, name: any) => [
                    `${val} kg`,
                    name === 'weightKg' ? 'Peso Registrado' : 'Média Móvel (7d)'
                  ]}
                  labelFormatter={lbl => `Data: ${lbl}`}
                />
                <Line
                  type="monotone"
                  dataKey="weightKg"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#38bdf8' }}
                  name="weightKg"
                />
                <Line
                  type="monotone"
                  dataKey="movingAverage7d"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={false}
                  name="movingAverage7d"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground border-t border-border/50 pt-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-sky-400" />
              <span>Pesagem Registrada</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-1 w-4 rounded-full bg-emerald-500" />
              <span>Média Móvel (7 Dias)</span>
            </div>
          </div>

          <button
            onClick={() => onNavigateToTab('weight')}
            className="font-semibold text-primary hover:underline"
          >
            Ver histórico em tabela →
          </button>
        </div>
      </div>
    </div>
  );
};
