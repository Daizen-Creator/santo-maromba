import React, { useEffect, useState } from 'react';
import {
  User,
  Save,
  CheckCircle2,
  AlertTriangle,
  History,
  Dumbbell,
  Clock,
  Utensils,
  Wallet
} from 'lucide-react';
import {
  ActivityLevel,
  BiologicalSex,
  FitnessGoal,
  TrainingExperience,
  UserProfile,
  ProfileGoalHistoryRecord
} from '../../shared/types';
import { calculateAge } from '../../domain/nutrition-calculator';

interface ProfileViewProps {
  profile: UserProfile | null;
  mealsPerDay: number;
  onMealsPerDayChange: (count: number) => void;
  onSaveProfile: (profile: any) => Promise<void>;
  onGetGoalHistory: () => Promise<ProfileGoalHistoryRecord[]>;
  onOpenHistoryModal: () => void;
}

const FITNESS_GOAL_LABELS: Record<FitnessGoal, string> = {
  muscle_gain: 'Ganhar massa muscular',
  gradual_weight_gain: 'Ganhar peso gradualmente',
  maintenance: 'Manter o peso',
  fat_loss: 'Perder gordura',
  weight_reduction: 'Reduzir peso corporal',
  body_recomposition: 'Recomposição corporal'
};

const TRAINING_WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const TRAINING_WEEKDAY_LABELS: Record<number, string> = {
  0: 'Dom', 1: 'Seg', 2: 'Ter', 3: 'Qua', 4: 'Qui', 5: 'Sex', 6: 'Sáb'
};

export const ProfileView: React.FC<ProfileViewProps> = ({
  profile,
  mealsPerDay,
  onMealsPerDayChange,
  onSaveProfile,
  onGetGoalHistory,
  onOpenHistoryModal
}) => {
  const [name, setName] = useState<string>(profile?.name || '');
  const [birthDate, setBirthDate] = useState<string>(profile?.birthDate || '');
  const [heightCm, setHeightCm] = useState<string>(profile?.heightCm ? String(profile.heightCm) : '');
  const [biologicalSex, setBiologicalSex] = useState<BiologicalSex>(
    profile?.biologicalSex || 'unspecified'
  );
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(
    profile?.activityLevel || 'moderate'
  );
  const [trainingExperience, setTrainingExperience] = useState<TrainingExperience>(
    profile?.trainingExperience || 'intermediate'
  );
  const [fitnessGoal, setFitnessGoal] = useState<FitnessGoal>(
    profile?.fitnessGoal || 'muscle_gain'
  );
  const [targetWeightKg, setTargetWeightKg] = useState<string>(
    profile?.targetWeightKg ? String(profile.targetWeightKg) : ''
  );
  const [trainingDaysPerWeek, setTrainingDaysPerWeek] = useState<number>(
    profile?.trainingDaysPerWeek || 5
  );
  const [trainingWeekdays, setTrainingWeekdays] = useState<number[]>(() =>
    profile?.trainingWeekdays?.length
      ? profile.trainingWeekdays
      : TRAINING_WEEKDAY_ORDER.slice(0, profile?.trainingDaysPerWeek || 5)
  );
  const [foodBudgetMonthly, setFoodBudgetMonthly] = useState<string>(
    profile?.foodBudgetMonthly ? String(profile.foodBudgetMonthly) : ''
  );
  const [dietaryPreferences, setDietaryPreferences] = useState<string>(profile?.dietaryPreferences || '');
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string>(
    (profile?.dietaryRestrictions || []).join(', ')
  );
  const [allergies, setAllergies] = useState<string>((profile?.allergies || []).join(', '));
  const [workSchedule, setWorkSchedule] = useState<string>(profile?.workSchedule || '');
  const [studySchedule, setStudySchedule] = useState<string>(profile?.studySchedule || '');
  const [sleepSchedule, setSleepSchedule] = useState<string>(profile?.sleepSchedule || '');
  const [wakeTime, setWakeTime] = useState<string>(profile?.wakeTime || '');
  const [sleepTime, setSleepTime] = useState<string>(profile?.sleepTime || '');
  const [trainingSchedule, setTrainingSchedule] = useState<string>(profile?.trainingSchedule || '');
  const [availableEquipment, setAvailableEquipment] = useState<string>(
    (profile?.availableEquipment || []).join(', ')
  );
  const [interruptionNotes, setInterruptionNotes] = useState<string>(profile?.interruptionHistoryNotes || '');
  const [goalHistory, setGoalHistory] = useState<ProfileGoalHistoryRecord[]>([]);
  const [goalHistoryError, setGoalHistoryError] = useState<string | null>(null);

  const [saving, setSaving] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const calculatedAge = birthDate ? calculateAge(birthDate) : null;

  useEffect(() => {
    let active = true;
    onGetGoalHistory()
      .then(records => {
        if (!active) return;
        setGoalHistory(records);
        setGoalHistoryError(null);
      })
      .catch(error => {
        if (active) setGoalHistoryError(error instanceof Error ? error.message : 'Não foi possível carregar o histórico de metas.');
      });
    return () => { active = false; };
  }, [onGetGoalHistory, profile?.updatedAt]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    const restrictionsArr = dietaryRestrictions
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const equipmentArr = availableEquipment
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    try {
      await onSaveProfile({
        name,
        birthDate,
        heightCm: Number(heightCm),
        biologicalSex,
        activityLevel,
        trainingExperience,
        fitnessGoal,
        targetWeightKg: targetWeightKg ? Number(targetWeightKg) : undefined,
        mealsPerDay: Number(mealsPerDay),
        trainingDaysPerWeek: Number(trainingDaysPerWeek),
        trainingWeekdays,
        foodBudgetMonthly: foodBudgetMonthly ? Number(foodBudgetMonthly) : undefined,
        dietaryPreferences,
        dietaryRestrictions: restrictionsArr,
        allergies: allergies.split(',').map(value => value.trim()).filter(Boolean),
        availableEquipment: equipmentArr,
        workSchedule,
        studySchedule,
        sleepSchedule,
        wakeTime: wakeTime || undefined,
        sleepTime: sleepTime || undefined,
        trainingSchedule,
        interruptionHistoryNotes: interruptionNotes
      });
      setSuccessMsg('Perfil e preferências salvos com sucesso!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar perfil.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">
            Perfil do Usuário e Metas Pessoais
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure seus dados biométricos, objetivos corporais, rotina diária e restrições.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenHistoryModal}
          className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-400 hover:bg-amber-500/20 transition-all"
        >
          <History className="h-4 w-4" />
          <span>Confirmar dados do perfil</span>
        </button>
      </div>

      {successMsg && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-300 flex items-center gap-2.5">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive flex items-center gap-2.5">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Bloco 1: Biometria */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 border-b border-border pb-3">
            <User className="h-5 w-5 text-primary" />
            <h3 className="font-display text-base font-bold text-foreground">
              1. Biometria e Identificação
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Nome ou Apelido</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full rounded-xl border border-border bg-secondary/50 px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                Data de Nascimento{calculatedAge !== null ? ` (Idade: ${calculatedAge} anos)` : ''}
              </label>
              <input
                type="date"
                value={birthDate}
                onChange={e => setBirthDate(e.target.value)}
                className="w-full rounded-xl border border-border bg-secondary/50 px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Altura (cm)</label>
              <input
                type="number"
                min="100"
                max="250"
                value={heightCm}
                onChange={e => setHeightCm(e.target.value)}
                className="w-full rounded-xl border border-border bg-secondary/50 px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Sexo Biológico com Incerteza */}
          <div className="space-y-2 pt-2">
            <label className="text-xs font-semibold text-muted-foreground">
              Sexo Biológico (Utilizado para calibração da fórmula Mifflin-St Jeor)
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'male', label: 'Masculino (+5 kcal)' },
                { id: 'female', label: 'Feminino (-161 kcal)' },
                { id: 'unspecified', label: 'Não informar (Média neutra ±83 kcal)' }
              ].map(s => (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => setBiologicalSex(s.id as any)}
                  className={`rounded-xl border p-3 text-xs font-semibold text-center transition-all ${
                    biologicalSex === s.id
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-secondary/30 text-muted-foreground hover:border-border/80'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            {biologicalSex === 'unspecified' && (
              <p className="text-[11px] text-amber-400">
                • Ao optar por não informar, o sistema calcula uma média neutra e informa explicitamente a margem de incerteza energética.
              </p>
            )}
          </div>
        </div>

        {/* Bloco 2: Objetivo e Treinamento */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 border-b border-border pb-3">
            <Dumbbell className="h-5 w-5 text-primary" />
            <h3 className="font-display text-base font-bold text-foreground">
              2. Metas e Treinamento
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Objetivo Corporal</label>
              <select
                value={fitnessGoal}
                onChange={e => setFitnessGoal(e.target.value as any)}
                className="w-full rounded-xl border border-border bg-secondary/50 px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              >
                <option value="muscle_gain">1. Ganhar massa muscular (Hipertrofia - Superávit controlado)</option>
                <option value="gradual_weight_gain">2. Ganhar peso gradualmente (Superávit leve)</option>
                <option value="maintenance">3. Manter o peso (Equilíbrio metabólico)</option>
                <option value="fat_loss">4. Perder gordura (Cutting - Déficit moderado)</option>
                <option value="weight_reduction">5. Reduzir peso corporal</option>
                <option value="body_recomposition">6. Recomposição corporal (Troca de gordura por massa)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Meta de Peso Alvo (kg)</label>
              <input
                type="number"
                step="0.5"
                min="40"
                max="250"
                value={targetWeightKg}
                onChange={e => setTargetWeightKg(e.target.value)}
                className="w-full rounded-xl border border-border bg-secondary/50 px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <section className="rounded-2xl border border-border/70 bg-background/40 p-4" aria-labelledby="goal-history-heading">
            <div className="mb-3 flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              <h4 id="goal-history-heading" className="text-xs font-bold text-foreground">Histórico de metas</h4>
            </div>
            {goalHistory.length === 0 && !goalHistoryError ? (
              <p className="text-[11px] text-muted-foreground">Alterações salvas nesta versão aparecem aqui. Alterações anteriores não podem ser recuperadas.</p>
            ) : (
              <ol className="space-y-2">
                {goalHistory.map(record => {
                  const changedLabels = record.changedFields.map(field => field === 'fitnessGoal' ? 'objetivo' : 'peso-alvo').join(' e ');
                  const dateLabel = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(record.changedAt));
                  const targetLabel = record.targetWeightKg === null
                    ? 'sem peso-alvo'
                    : `${record.targetWeightKg.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg`;
                  return (
                    <li key={record.id} className="flex flex-col gap-0.5 border-l-2 border-primary/40 pl-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                      <span className="text-[11px] font-medium text-foreground">
                        {record.changeKind === 'initial' ? 'Meta inicial' : `Alteração de ${changedLabels || 'metas'}`}: {FITNESS_GOAL_LABELS[record.fitnessGoal]} · {targetLabel}
                      </span>
                      <time dateTime={record.changedAt} className="shrink-0 text-[10px] text-muted-foreground">{dateLabel}</time>
                    </li>
                  );
                })}
              </ol>
            )}
            {goalHistoryError && <p role="alert" className="mt-2 text-[11px] text-destructive">{goalHistoryError}</p>}
          </section>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Nível de Atividade Física</label>
              <select
                value={activityLevel}
                onChange={e => setActivityLevel(e.target.value as any)}
                className="w-full rounded-xl border border-border bg-secondary/50 px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              >
                <option value="sedentary">Sedentário (1.2×) - Pouco movimento</option>
                <option value="light">Leve (1.375×) - Treino 1-3 dias/sem</option>
                <option value="moderate">Moderado (1.55×) - Treino 3-5 dias/sem</option>
                <option value="heavy">Muito ativo (1.725×) - Treino 6-7 dias/sem</option>
                <option value="extreme">Extremamente ativo (1.9×) - Atleta intenso</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Experiência de Treino</label>
              <select
                value={trainingExperience}
                onChange={e => setTrainingExperience(e.target.value as any)}
                className="w-full rounded-xl border border-border bg-secondary/50 px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              >
                <option value="beginner">Iniciante (&lt; 1 ano consistente)</option>
                <option value="intermediate">Intermediário (1 a 3 anos)</option>
                <option value="advanced">Avançado (&gt; 3 anos)</option>
              </select>
            </div>

          </div>

          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between gap-3">
              <label className="text-xs font-semibold text-muted-foreground">Dias disponíveis para treinar</label>
              <span className="text-[11px] text-muted-foreground">{trainingDaysPerWeek} {trainingDaysPerWeek === 1 ? 'dia' : 'dias'} por semana</span>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {TRAINING_WEEKDAY_ORDER.map(day => {
                const selected = trainingWeekdays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      const next = selected
                        ? trainingWeekdays.filter(item => item !== day)
                        : TRAINING_WEEKDAY_ORDER.filter(item => trainingWeekdays.includes(item) || item === day);
                      if (next.length === 0) return;
                      setTrainingWeekdays(next);
                      setTrainingDaysPerWeek(next.length);
                    }}
                    className={`rounded-xl border px-3 py-2.5 text-xs font-semibold transition-colors ${selected
                      ? 'border-primary bg-primary/15 text-primary'
                      : 'border-border bg-secondary/40 text-muted-foreground hover:bg-secondary'
                    }`}
                  >
                    {TRAINING_WEEKDAY_LABELS[day]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5 pt-2">
            <label className="text-xs font-semibold text-muted-foreground">
              Equipamentos Disponíveis (separados por vírgula)
            </label>
            <input
              type="text"
              value={availableEquipment}
              onChange={e => setAvailableEquipment(e.target.value)}
              placeholder="Ex: Academia completa, Halteres, Barras, Anilhas, Banco regulável"
              className="w-full rounded-xl border border-border bg-secondary/50 px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <div className="space-y-1.5 pt-2">
            <label className="text-xs font-semibold text-muted-foreground">
              Histórico de Interrupções e Retornos
            </label>
            <textarea
              rows={2}
              value={interruptionNotes}
              onChange={e => setInterruptionNotes(e.target.value)}
              className="w-full rounded-xl border border-border bg-secondary/50 p-3 text-xs text-foreground focus:border-primary focus:outline-none"
              placeholder="Ex: Retorno em 14/10/2026 após 1 a 2 meses de interrupção..."
            />
          </div>
        </div>

        {/* Bloco 3: Nutrição, Orçamento e Restrições */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 border-b border-border pb-3">
            <Utensils className="h-5 w-5 text-primary" />
            <h3 className="font-display text-base font-bold text-foreground">
              3. Nutrição, Restrições e Orçamento
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                Refeições por Dia (3, 4, 5 ou 6)
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[3, 4, 5, 6].map(num => (
                  <button
                    type="button"
                    key={num}
                    onClick={() => onMealsPerDayChange(num)}
                    className={`rounded-xl border py-2 text-xs font-bold transition-all ${
                      mealsPerDay === num
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-secondary/30 text-muted-foreground'
                    }`}
                  >
                    {num} Refeições
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                Orçamento Alimentar Mensal Estimado (R$)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={foodBudgetMonthly}
                  onChange={e => setFoodBudgetMonthly(e.target.value)}
                  className="w-full rounded-xl border border-border bg-secondary/50 px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none pl-10"
                />
                <Wallet className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </div>

          <div className="space-y-1.5 pt-2">
            <label className="text-xs font-semibold text-muted-foreground">
              Restrições e limites de consumo (separados por vírgula)
            </label>
            <input
              type="text"
              value={dietaryRestrictions}
              onChange={e => setDietaryRestrictions(e.target.value)}
              placeholder="Ex: Sem glúten, vegetariano, limite de 2 ovos/dia"
              className="w-full rounded-xl border border-border bg-secondary/50 px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <div className="space-y-1.5 pt-2">
            <label className="text-xs font-semibold text-muted-foreground">
              Alergias alimentares (separadas por vírgula)
            </label>
            <input
              type="text"
              value={allergies}
              onChange={e => setAllergies(e.target.value)}
              placeholder="Ex: amendoim, leite, camarão"
              className="w-full rounded-xl border border-border bg-secondary/50 px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            />
            <p className="text-[10px] text-muted-foreground">As sugestões verificam os ingredientes cadastrados. Confira os rótulos e o risco de contaminação cruzada.</p>
          </div>

          <div className="space-y-1.5 pt-2">
            <label className="text-xs font-semibold text-muted-foreground">
              Preferências Alimentares
            </label>
            <textarea
              rows={2}
              value={dietaryPreferences}
              onChange={e => setDietaryPreferences(e.target.value)}
              className="w-full rounded-xl border border-border bg-secondary/50 p-3 text-xs text-foreground focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        {/* Bloco 4: Horários e Rotina Diária */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 border-b border-border pb-3">
            <Clock className="h-5 w-5 text-primary" />
            <h3 className="font-display text-base font-bold text-foreground">
              4. Horários da Rotina Diária
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Acordar</label>
              <input
                type="time"
                value={wakeTime}
                onChange={e => setWakeTime(e.target.value)}
                className="w-full rounded-xl border border-border bg-secondary/50 px-3.5 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Dormir</label>
              <input
                type="time"
                value={sleepTime}
                onChange={e => setSleepTime(e.target.value)}
                className="w-full rounded-xl border border-border bg-secondary/50 px-3.5 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Observações de sono</label>
              <input
                type="text"
                value={sleepSchedule}
                onChange={e => setSleepSchedule(e.target.value)}
                placeholder="Ex: 23:30 - 06:30"
                className="w-full rounded-xl border border-border bg-secondary/50 px-3.5 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Treino</label>
              <input
                type="text"
                value={trainingSchedule}
                onChange={e => setTrainingSchedule(e.target.value)}
                placeholder="Ex: 17:30 - 18:45"
                className="w-full rounded-xl border border-border bg-secondary/50 px-3.5 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Trabalho</label>
              <input
                type="text"
                value={workSchedule}
                onChange={e => setWorkSchedule(e.target.value)}
                placeholder="Ex: 08:00 - 17:00"
                className="w-full rounded-xl border border-border bg-secondary/50 px-3.5 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Estudos</label>
              <input
                type="text"
                value={studySchedule}
                onChange={e => setStudySchedule(e.target.value)}
                placeholder="Ex: 19:00 - 22:30"
                className="w-full rounded-xl border border-border bg-secondary/50 px-3.5 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Submit Action */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-2xl bg-primary px-7 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary-hover active:scale-95 transition-all disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? 'Salvando...' : 'Salvar Perfil e Atualizar Metas'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
