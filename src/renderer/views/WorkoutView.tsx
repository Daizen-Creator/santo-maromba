import React, { useEffect, useMemo, useState } from 'react';
import {
  Dumbbell,
  Play,
  CheckCircle2,
  Calendar,
  Clock,
  Plus,
  Trash2,
  Search,
  Award,
  ImagePlus,
  TrendingUp,
  Timer,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Exercise, ExerciseMediaInput, MuscleGroup, SaveWorkoutScheduleInput, SaveWorkoutTemplateInput, WorkoutScheduleEntry, WorkoutSession, WorkoutSet, WorkoutTemplate, WorkoutTemplatePlan } from '../../shared/types';
import { DailyWorkoutPlan, getNextScheduledWorkout, WorkoutEngine } from '../../domain/workout-engine';
import { YouTubePlayer } from '../components/YouTubePlayer';
import { formatRestTime, remainingRestSeconds } from '../../domain/rest-timer';
import { compareWorkoutSetWithHistory } from '../../domain/workout-comparison';
import { hydrateWorkoutTemplate, serializeWorkoutPlans } from '../../domain/workout-templates';
import { getWorkoutScheduleStatus } from '../../domain/workout-schedule';
import { getWorkoutWeekDates, shiftWorkoutWeek } from '../../domain/workout-week-calendar';

const OFFLINE_EXERCISE_IMAGE: Record<MuscleGroup, string> = {
  peitoral: './catalog-assets/exercise-peitoral.png',
  costas: './catalog-assets/exercise-costas.png',
  ombros: './catalog-assets/exercise-ombros.png',
  biceps: './catalog-assets/exercise-biceps.png',
  antebracos: './catalog-assets/exercise-antebracos.png',
  triceps: './catalog-assets/exercise-triceps.png',
  quadriceps: './catalog-assets/exercise-quadriceps.jpeg',
  posteriores: './catalog-assets/exercise-posteriores.png',
  gluteos: './catalog-assets/exercise-gluteos.webp',
  panturrilhas: './catalog-assets/exercise-panturrilhas.png',
  abdomen: './catalog-assets/exercise-abdomen.png'
};

const getLocalIsoDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

interface WorkoutViewProps {
  exercises: Exercise[];
  sessions: WorkoutSession[];
  workoutSplit: DailyWorkoutPlan[];
  onLogSession: (sessionData: any) => Promise<void>;
  onAddExerciseMedia: (input: ExerciseMediaInput) => Promise<void>;
  onDeleteExerciseMedia: (id: string) => Promise<void>;
  onGetWorkoutTemplates: () => Promise<WorkoutTemplate[]>;
  onSaveWorkoutTemplate: (input: SaveWorkoutTemplateInput) => Promise<WorkoutTemplate>;
  onGetWorkoutSchedule: () => Promise<WorkoutScheduleEntry[]>;
  onSaveWorkoutScheduleEntry: (input: SaveWorkoutScheduleInput) => Promise<WorkoutScheduleEntry>;
}

export const WorkoutView: React.FC<WorkoutViewProps> = ({
  exercises,
  sessions,
  workoutSplit,
  onLogSession,
  onAddExerciseMedia,
  onDeleteExerciseMedia,
  onGetWorkoutTemplates,
  onSaveWorkoutTemplate,
  onGetWorkoutSchedule,
  onSaveWorkoutScheduleEntry
}) => {
  const [activeTab, setActiveTab] = useState<'today' | 'split' | 'agenda' | 'exercises' | 'history'>('today');
  const [homeTrainingMode, setHomeTrainingMode] = useState(false);
  const progressionEngine = useMemo(() => new WorkoutEngine(exercises), [exercises]);
  const [appliedWorkoutTemplate, setAppliedWorkoutTemplate] = useState<WorkoutTemplate | null>(null);
  const activeWorkoutSplit = useMemo(
    () => appliedWorkoutTemplate
      ? hydrateWorkoutTemplate(appliedWorkoutTemplate, exercises)
      : homeTrainingMode ? progressionEngine.generateHomeSplit() : workoutSplit,
    [appliedWorkoutTemplate, exercises, homeTrainingMode, progressionEngine, workoutSplit]
  );

  // Treino Ativo do Dia
  const upcomingWorkout = useMemo(() => getNextScheduledWorkout(activeWorkoutSplit), [activeWorkoutSplit]);
  const todayPlan = upcomingWorkout?.plan || null;
  const scheduledDayLabel = upcomingWorkout
    ? upcomingWorkout.daysUntil === 0
      ? 'Treino programado para hoje'
      : `Próximo treino · ${new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }).format(upcomingWorkout.scheduledDate)}`
    : '';
  const [activeSets, setActiveSets] = useState<Array<{
    exerciseId: string;
    exerciseName: string;
    setNumber: number;
    weightKg: number;
    reps: number;
    completed: boolean;
    rpe?: number;
    rir?: number;
    notes?: string;
  }>>([]);

  const [sessionDuration, setSessionDuration] = useState<number>(0);
  const [sessionRpe, setSessionRpe] = useState<number>(0);
  const [sessionNotes, setSessionNotes] = useState('');
  const [sessionDiscomfortLevel, setSessionDiscomfortLevel] = useState('');
  const [sessionDiscomfortArea, setSessionDiscomfortArea] = useState('');
  const [sessionRecoveryRating, setSessionRecoveryRating] = useState('');
  const [warmupCompleted, setWarmupCompleted] = useState(false);
  const [cooldownCompleted, setCooldownCompleted] = useState(false);
  const [savingSession, setSavingSession] = useState<boolean>(false);
  const [sessionSuccessMsg, setSessionSuccessMsg] = useState<string | null>(null);
  const [sessionValidationError, setSessionValidationError] = useState<string | null>(null);
  const [workoutTemplates, setWorkoutTemplates] = useState<WorkoutTemplate[]>([]);
  const [workoutTemplateName, setWorkoutTemplateName] = useState('');
  const [workoutTemplateDraft, setWorkoutTemplateDraft] = useState<WorkoutTemplatePlan[] | null>(null);
  const [workoutTemplateDraftId, setWorkoutTemplateDraftId] = useState<string | null>(null);
  const [workoutTemplateDraftName, setWorkoutTemplateDraftName] = useState('');
  const [selectedWorkoutTemplateId, setSelectedWorkoutTemplateId] = useState('');
  const [savingWorkoutTemplate, setSavingWorkoutTemplate] = useState(false);
  const [workoutTemplateMessage, setWorkoutTemplateMessage] = useState<string | null>(null);
  const [workoutTemplateError, setWorkoutTemplateError] = useState<string | null>(null);
  const [workoutSchedule, setWorkoutSchedule] = useState<WorkoutScheduleEntry[]>([]);
  const [calendarWeekAnchor, setCalendarWeekAnchor] = useState(getLocalIsoDate);
  const calendarWeekDates = useMemo(() => getWorkoutWeekDates(calendarWeekAnchor), [calendarWeekAnchor]);
  const [scheduleDate, setScheduleDate] = useState(getLocalIsoDate);
  const [scheduleKind, setScheduleKind] = useState<SaveWorkoutScheduleInput['kind']>('training');
  const [scheduleTitle, setScheduleTitle] = useState('');
  const [scheduleNotes, setScheduleNotes] = useState('');
  const [scheduleMessage, setScheduleMessage] = useState<string | null>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [restTimer, setRestTimer] = useState<{ exerciseName: string; durationSeconds: number; endsAtMs: number } | null>(null);
  const [restNowMs, setRestNowMs] = useState(() => Date.now());
  const [restCompleteMessage, setRestCompleteMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    onGetWorkoutTemplates()
      .then(templates => {
        if (!active) return;
        setWorkoutTemplates(templates);
        setSelectedWorkoutTemplateId(templates[0]?.id || '');
      })
      .catch(error => {
        if (active) setWorkoutTemplateError(error instanceof Error ? error.message : 'Não foi possível carregar os modelos de treino.');
      });
    return () => { active = false; };
  }, [onGetWorkoutTemplates]);

  useEffect(() => {
    let active = true;
    onGetWorkoutSchedule()
      .then(entries => { if (active) setWorkoutSchedule(entries); })
      .catch(error => { if (active) setScheduleError(error instanceof Error ? error.message : 'Não foi possível carregar a agenda de treino.'); });
    return () => { active = false; };
  }, [onGetWorkoutSchedule]);

  const handleSaveSchedule = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingSchedule(true);
    setScheduleError(null);
    setScheduleMessage(null);
    try {
      const saved = await onSaveWorkoutScheduleEntry({
        date: scheduleDate,
        kind: scheduleKind,
        title: scheduleTitle || undefined,
        notes: scheduleNotes || undefined
      });
      setWorkoutSchedule(current => [saved, ...current.filter(item => item.date !== saved.date)].sort((a, b) => b.date.localeCompare(a.date)));
      setScheduleMessage(`Agenda de ${saved.date} salva como ${saved.kind === 'training' ? 'treino' : saved.kind === 'rest' ? 'descanso' : 'deload'}.`);
    } catch (error) {
      setScheduleError(error instanceof Error ? error.message : 'Não foi possível salvar o dia planejado.');
    } finally {
      setSavingSchedule(false);
    }
  };

  const editScheduleEntry = (entry: WorkoutScheduleEntry) => {
    setScheduleDate(entry.date);
    setScheduleKind(entry.kind);
    setScheduleTitle(entry.title || '');
    setScheduleNotes(entry.notes || '');
    setScheduleMessage(null);
    setScheduleError(null);
  };

  useEffect(() => {
    if (!restTimer) return;
    const timerId = window.setInterval(() => setRestNowMs(Date.now()), 200);
    return () => window.clearInterval(timerId);
  }, [restTimer]);

  const restRemainingSeconds = restTimer
    ? remainingRestSeconds(restTimer.endsAtMs, restNowMs)
    : 0;

  useEffect(() => {
    if (!restTimer || restRemainingSeconds > 0) return;
    setRestCompleteMessage(`Descanso de ${restTimer.exerciseName} concluído.`);
    setRestTimer(null);
  }, [restTimer, restRemainingSeconds]);

  const startRestTimer = (exerciseName: string, durationSeconds: number) => {
    const duration = Math.max(1, Math.round(durationSeconds));
    setRestCompleteMessage(null);
    setRestNowMs(Date.now());
    setRestTimer({ exerciseName, durationSeconds: duration, endsAtMs: Date.now() + duration * 1000 });
  };

  // Filtros de Exercícios
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | 'all'>('all');
  const [searchExercise, setSearchExercise] = useState<string>('');
  const [uploadingExerciseId, setUploadingExerciseId] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const historyByExercise = useMemo(() => {
    const history = new Map<string, WorkoutSet[]>();
    for (const session of [...sessions].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt))) {
      for (const set of session.sets) {
        if (!set.completed) continue;
        const exerciseSets = history.get(set.exerciseId) || [];
        exerciseSets.push(set);
        history.set(set.exerciseId, exerciseSets);
      }
    }
    return history;
  }, [sessions]);
  const filteredExercises = exercises.filter(ex => {
    const matchMuscle = selectedMuscle === 'all' || ex.primaryMuscle === selectedMuscle;
    const matchSearch = ex.name.toLowerCase().includes(searchExercise.toLowerCase());
    return matchMuscle && matchSearch;
  });

  const handleAddSet = (exerciseId: string, exerciseName: string) => {
    const nextSetNumber = activeSets.filter(s => s.exerciseId === exerciseId).length + 1;
    setActiveSets(prev => [
      ...prev,
      {
        exerciseId,
        exerciseName,
        setNumber: nextSetNumber,
        weightKg: 0,
        reps: 0,
        completed: false
      }
    ]);
  };

  const handleUploadExerciseMedia = async (exerciseId: string, file?: File) => {
    if (!file) return;
    setUploadingExerciseId(exerciseId);
    setMediaError(null);
    try {
      await onAddExerciseMedia({
        exerciseId,
        originalName: file.name,
        mimeType: file.type as ExerciseMediaInput['mimeType'],
        imageBytes: new Uint8Array(await file.arrayBuffer())
      });
    } catch (reason) {
      setMediaError(reason instanceof Error ? reason.message : 'Não foi possível anexar esta mídia.');
    } finally {
      setUploadingExerciseId(null);
    }
  };

  const handleRemoveSet = (index: number) => {
    setActiveSets(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveWorkoutTemplate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setWorkoutTemplateError(null);
    setWorkoutTemplateMessage(null);
    setSavingWorkoutTemplate(true);
    try {
      const template = await onSaveWorkoutTemplate({
        name: workoutTemplateName,
        plans: serializeWorkoutPlans(activeWorkoutSplit)
      });
      setWorkoutTemplates(current => [template, ...current.filter(item => item.id !== template.id)]);
      setSelectedWorkoutTemplateId(template.id);
      setWorkoutTemplateName('');
      setWorkoutTemplateMessage(`Modelo “${template.name}” salvo com ${template.plans.length} dias.`);
    } catch (error) {
      setWorkoutTemplateError(error instanceof Error ? error.message : 'Não foi possível salvar o modelo de treino.');
    } finally {
      setSavingWorkoutTemplate(false);
    }
  };

  const startWorkoutTemplateDraft = (template?: WorkoutTemplate) => {
    setWorkoutTemplateError(null);
    setWorkoutTemplateMessage(null);
    setWorkoutTemplateDraftId(template?.id || null);
    setWorkoutTemplateDraftName(template?.name || '');
    setWorkoutTemplateDraft(template
      ? template.plans.map(plan => ({ ...plan, exercises: plan.exercises.map(item => ({ ...item })) }))
      : serializeWorkoutPlans(activeWorkoutSplit));
  };

  const updateWorkoutTemplateDraftPlan = (planIndex: number, update: (plan: WorkoutTemplatePlan) => WorkoutTemplatePlan) => {
    setWorkoutTemplateDraft(current => current?.map((plan, index) => index === planIndex ? update(plan) : plan) || null);
  };

  const handleSaveWorkoutTemplateDraft = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!workoutTemplateDraft) return;
    setWorkoutTemplateError(null);
    setWorkoutTemplateMessage(null);
    setSavingWorkoutTemplate(true);
    try {
      const template = await onSaveWorkoutTemplate({
        ...(workoutTemplateDraftId ? { id: workoutTemplateDraftId } : {}),
        name: workoutTemplateDraftName,
        plans: workoutTemplateDraft
      });
      setWorkoutTemplates(current => [template, ...current.filter(item => item.id !== template.id)]);
      setSelectedWorkoutTemplateId(template.id);
      setAppliedWorkoutTemplate(template);
      setHomeTrainingMode(false);
      setWorkoutTemplateDraft(null);
      setWorkoutTemplateDraftId(null);
      setWorkoutTemplateMessage(`Divisão “${template.name}” ${workoutTemplateDraftId ? 'atualizada' : 'criada'} e aplicada.`);
    } catch (error) {
      setWorkoutTemplateError(error instanceof Error ? error.message : 'Não foi possível salvar a divisão personalizada.');
    } finally {
      setSavingWorkoutTemplate(false);
    }
  };

  const handleApplyWorkoutTemplate = () => {
    setWorkoutTemplateError(null);
    setWorkoutTemplateMessage(null);
    if (activeSets.length > 0) {
      setWorkoutTemplateError('Finalize ou remova as séries em andamento antes de aplicar outro modelo.');
      return;
    }
    const template = workoutTemplates.find(item => item.id === selectedWorkoutTemplateId);
    if (!template) {
      setWorkoutTemplateError('Selecione um modelo de treino salvo.');
      return;
    }
    try {
      const plans = hydrateWorkoutTemplate(template, exercises);
      if (!plans.some(plan => plan.exercises.length > 0)) throw new Error('Este modelo não contém exercícios disponíveis.');
      setHomeTrainingMode(false);
      setAppliedWorkoutTemplate(template);
      setWorkoutTemplateMessage(`Modelo “${template.name}” aplicado à divisão desta sessão.`);
    } catch (error) {
      setWorkoutTemplateError(error instanceof Error ? error.message : 'Não foi possível aplicar o modelo de treino.');
    }
  };

  const handleFinishWorkout = async (completed: boolean) => {
    if (!activeSets.some(set => set.completed) || (completed && activeSets.some(set => !set.completed))) {
      setSessionValidationError(completed
        ? 'Marque todas as séries concluídas ou salve a sessão como parcial.'
        : 'Marque ao menos uma série concluída para registrar uma sessão parcial.');
      return;
    }
    if (sessionDuration < 1 || sessionRpe < 1 || sessionRpe > 10 || activeSets.some(set => set.weightKg <= 0 || set.reps < 1 || (set.rpe !== undefined && (set.rpe < 1 || set.rpe > 10)) || (set.rir !== undefined && (set.rir < 0 || set.rir > 10)))) {
      setSessionValidationError('Informe a duração, o esforço percebido e uma carga e repetições reais para cada série.');
      return;
    }
    setSavingSession(true);
    setSessionSuccessMsg(null);
    setSessionValidationError(null);
    try {
      await onLogSession({
        date: (() => { const now = new Date(); return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-'); })(),
        splitName: todayPlan ? todayPlan.splitTitle : 'Treino Concluído',
        completed,
        durationMinutes: sessionDuration,
        perceivedExertion: sessionRpe,
        discomfortLevel: sessionDiscomfortLevel === '' ? undefined : Number(sessionDiscomfortLevel),
        discomfortArea: Number(sessionDiscomfortLevel) > 0 ? sessionDiscomfortArea.trim() || undefined : undefined,
        recoveryRating: sessionRecoveryRating === '' ? undefined : Number(sessionRecoveryRating),
        warmupCompleted,
        cooldownCompleted,
        notes: sessionNotes.trim() || undefined,
        sets: activeSets.map(({ exerciseId, setNumber, weightKg, reps, completed: setCompleted, rpe, rir, notes }) => ({
          exerciseId, setNumber, weightKg, reps, completed: setCompleted, rpe, rir, notes: notes?.trim() || undefined
        }))
      });
      setSessionSuccessMsg(completed
        ? 'Treino concluído e salvo no histórico!'
        : 'Sessão parcial salva no histórico; ela não conta como treino concluído.');
      setActiveSets([]);
      setSessionDuration(0);
      setSessionRpe(0);
      setSessionNotes('');
      setSessionDiscomfortLevel('');
      setSessionDiscomfortArea('');
      setSessionRecoveryRating('');
      setWarmupCompleted(false);
      setCooldownCompleted(false);
      setTimeout(() => setSessionSuccessMsg(null), 4000);
    } catch (error: any) {
      setSessionValidationError(error.message || 'Não foi possível salvar o treino.');
    } finally {
      setSavingSession(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* View Header com Abas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">
            Treinamento & Progressão de Cargas
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Divisões semanais adaptadas, registro de séries em tempo real e biblioteca anatômica de exercícios
          </p>
        </div>

        <div className="flex items-center gap-1.5 rounded-2xl border border-border bg-secondary/50 p-1">
          {[
            { id: 'today', label: 'Treino de Hoje', icon: Play },
            { id: 'split', label: 'Minha Divisão', icon: Calendar },
            { id: 'agenda', label: 'Agenda', icon: Calendar },
            { id: 'exercises', label: 'Biblioteca de Exercícios', icon: Dumbbell },
            { id: 'history', label: 'Histórico & PRs', icon: Award }
          ].map(t => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                aria-label={t.label}
                title={t.label}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden md:inline">{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {sessionSuccessMsg && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{sessionSuccessMsg}</span>
        </div>
      )}

      {sessionValidationError && (
        <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive">
          {sessionValidationError}
        </div>
      )}

      {/* 1. ABA TREINO DE HOJE (LOG EM TEMPO REAL) */}
      {activeTab === 'today' && (
        <div className="space-y-6">
          {todayPlan && todayPlan.exercises.length > 0 ? (
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
                <div>
                  <span className="text-xs font-bold text-primary uppercase tracking-wider block">
                    {scheduledDayLabel}
                  </span>
                  <h3 className="font-display text-lg font-bold text-foreground">
                    {todayPlan.splitTitle}
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    Foco: {todayPlan.focusMuscles}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{sessionDuration > 0 ? `${sessionDuration} min` : 'duração não informada'}</span>
                  </div>
                  <span className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-xs font-bold text-emerald-400">
                    Sessão Ativa
                  </span>
                </div>
              </div>

              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-muted-foreground">Observações do treino</span>
                <textarea
                  value={sessionNotes}
                  maxLength={500}
                  rows={2}
                  aria-label="Observações do treino"
                  placeholder="Como foi a sessão? Anote desconfortos ou ajustes para a próxima vez."
                  onChange={event => setSessionNotes(event.target.value)}
                  className="w-full resize-y rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/70"
                />
              </label>

              <div className="grid gap-3 rounded-2xl border border-border/70 bg-background/50 p-4 sm:grid-cols-3">
                <label className="block space-y-1.5">
                  <span className="text-xs font-semibold text-muted-foreground">Desconforto (opcional)</span>
                  <select
                    value={sessionDiscomfortLevel}
                    aria-label="Intensidade do desconforto"
                    onChange={event => {
                      const value = event.target.value;
                      setSessionDiscomfortLevel(value);
                      if (value === '' || value === '0') setSessionDiscomfortArea('');
                    }}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground"
                  >
                    <option value="">Não registrado</option>
                    {Array.from({ length: 11 }, (_, level) => (
                      <option key={level} value={level}>{level === 0 ? '0 — Sem desconforto' : `${level} / 10`}</option>
                    ))}
                  </select>
                </label>
                {Number(sessionDiscomfortLevel) > 0 ? (
                  <label className="block space-y-1.5">
                    <span className="text-xs font-semibold text-muted-foreground">Região afetada</span>
                    <input
                      value={sessionDiscomfortArea}
                      maxLength={120}
                      aria-label="Região do desconforto"
                      placeholder="Ex.: ombro esquerdo"
                      onChange={event => setSessionDiscomfortArea(event.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/70"
                    />
                  </label>
                ) : <div className="hidden sm:block" />}
                <label className="block space-y-1.5">
                  <span className="text-xs font-semibold text-muted-foreground">Recuperação percebida (opcional)</span>
                  <select
                    value={sessionRecoveryRating}
                    aria-label="Recuperação percebida"
                    onChange={event => setSessionRecoveryRating(event.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground"
                  >
                    <option value="">Não registrada</option>
                    {[1, 2, 3, 4, 5].map(rating => <option key={rating} value={rating}>{rating} / 5</option>)}
                  </select>
                </label>
              </div>

              {/* Registro de Séries */}
              <div className="space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                  Séries e Cargas Realizadas
                </span>

                <div className="space-y-2.5">
                  {activeSets.map((set, sIdx) => {
                    const comparison = compareWorkoutSetWithHistory(set, historyByExercise.get(set.exerciseId) || []);
                    const formatDelta = (value: number, unit: string) => `${value > 0 ? '+' : ''}${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}${unit}`;
                    return (
                    <div
                      key={sIdx}
                      className="rounded-2xl border border-border bg-secondary/30 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary font-bold text-foreground">
                          #{set.setNumber}
                        </span>
                        <div className="min-w-0 flex-1">
                          <strong className="text-foreground block">{set.exerciseName}</strong>
                          <span className="text-[11px] text-muted-foreground">
                            Carga: {set.weightKg > 0 ? `${set.weightKg} kg` : 'não informada'} • Reps: {set.reps > 0 ? set.reps : 'não informadas'}{set.rpe ? ` • RPE ${set.rpe}` : ''}{set.rir !== undefined ? ` • RIR ${set.rir}` : ''}
                          </span>
                          <span className="block text-[10px] text-sky-300" aria-live="polite">
                            {comparison
                              ? `Anterior: ${comparison.previous.weightKg} kg × ${comparison.previous.reps}${comparison.weightDeltaKg !== undefined && comparison.repsDelta !== undefined && comparison.volumeDelta !== undefined ? ` · Atual: ${set.weightKg} kg × ${set.reps} (${formatDelta(comparison.weightDeltaKg, ' kg')}; ${formatDelta(comparison.repsDelta, ' reps')}; volume ${formatDelta(comparison.volumeDelta, ' kg·reps')})` : ''}`
                              : 'Sem série anterior registrada'}
                          </span>
                          <input
                            type="text"
                            value={set.notes ?? ''}
                            maxLength={200}
                            aria-label={`Observação da série ${set.setNumber} de ${set.exerciseName}`}
                            placeholder="Observação desta série"
                            onChange={event => setActiveSets(prev => prev.map((current, idx) => idx === sIdx ? { ...current, notes: event.target.value } : current))}
                            className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/70"
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 self-end sm:flex-nowrap sm:gap-3 sm:self-auto">
                        <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <input type="checkbox" checked={set.completed} aria-label={`Marcar série ${set.setNumber} de ${set.exerciseName} como concluída`}
                            onChange={event => setActiveSets(prev => prev.map((current, idx) => idx === sIdx ? { ...current, completed: event.target.checked } : current))} />
                          Feita
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            value={set.weightKg}
                            onChange={e => {
                              const val = Number(e.target.value);
                              setActiveSets(prev =>
                                prev.map((s, idx) => (idx === sIdx ? { ...s, weightKg: val } : s))
                              );
                            }}
                            className="w-16 rounded-lg border border-border bg-background p-1.5 text-xs font-bold text-center text-foreground"
                          />
                          <span className="text-muted-foreground">kg</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="0"
                            value={set.reps}
                            onChange={e => {
                              const val = Number(e.target.value);
                              setActiveSets(prev =>
                                prev.map((s, idx) => (idx === sIdx ? { ...s, reps: val } : s))
                              );
                            }}
                            className="w-14 rounded-lg border border-border bg-background p-1.5 text-xs font-bold text-center text-foreground"
                          />
                          <span className="text-muted-foreground">reps</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="1"
                            max="10"
                            placeholder="—"
                            value={set.rpe ?? ''}
                            aria-label={`RPE da série ${set.setNumber}`}
                            onChange={e => {
                              const value = e.target.value === '' ? undefined : Number(e.target.value);
                              setActiveSets(prev => prev.map((current, idx) => idx === sIdx ? { ...current, rpe: value } : current));
                            }}
                            className="w-12 rounded-lg border border-border bg-background p-1.5 text-xs text-center text-foreground"
                          />
                          <span className="text-muted-foreground">RPE</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="0"
                            max="10"
                            step="0.5"
                            placeholder="—"
                            value={set.rir ?? ''}
                            aria-label={`RIR da série ${set.setNumber}`}
                            onChange={e => {
                              const value = e.target.value === '' ? undefined : Number(e.target.value);
                              setActiveSets(prev => prev.map((current, idx) => idx === sIdx ? { ...current, rir: value } : current));
                            }}
                            className="w-12 rounded-lg border border-border bg-background p-1.5 text-xs text-center text-foreground"
                          />
                          <span className="text-muted-foreground">RIR</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveSet(sIdx)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    );
                  })}
                </div>

                {/* Adicionar Séries de Exercícios Recomendados */}
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-semibold text-muted-foreground block">
                    Exercícios Programados para Hoje:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {todayPlan.exercises.map((item, eIdx) => (
                      <div key={eIdx} className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleAddSet(item.exercise.id, item.exercise.name)}
                          className="flex items-center gap-1.5 rounded-xl border border-border bg-secondary/50 px-3 py-1.5 text-xs font-semibold text-foreground transition-all hover:border-primary hover:text-primary"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Adicionar série: {item.exercise.name}</span>
                        </button>
                        <button type="button" onClick={() => startRestTimer(item.exercise.name, item.restSeconds)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                          aria-label={`Iniciar descanso de ${formatRestTime(item.restSeconds)} para ${item.exercise.name}`}>
                          <Timer className="h-3.5 w-3.5" />Descanso {formatRestTime(item.restSeconds)}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {restTimer && (
                  <div role="timer" aria-live="off" className="rounded-2xl border border-primary/25 bg-primary/[0.06] p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">Descanso · {restTimer.exerciseName}</p>
                        <strong className="mt-1 block font-mono text-2xl tabular-nums text-foreground">{formatRestTime(restRemainingSeconds)}</strong>
                      </div>
                      <button type="button" onClick={() => setRestTimer(null)} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground">Encerrar</button>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full rounded-full bg-primary transition-[width] duration-200" style={{ width: `${Math.min(100, Math.max(0, ((restTimer.durationSeconds - restRemainingSeconds) / restTimer.durationSeconds) * 100))}%` }} />
                    </div>
                  </div>
                )}
                {restCompleteMessage && <p role="status" className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">{restCompleteMessage}</p>}

                <fieldset className="grid gap-2 rounded-2xl border border-border/70 bg-background/40 p-4 sm:grid-cols-2">
                  <legend className="px-1 text-xs font-semibold text-muted-foreground">Preparação e encerramento</legend>
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border/60 bg-card/50 px-3 py-2.5 text-xs text-foreground transition hover:border-primary/40">
                    <input type="checkbox" checked={warmupCompleted} onChange={event => setWarmupCompleted(event.target.checked)} className="h-4 w-4 accent-primary" />
                    <span><strong className="block">Aquecimento</strong><span className="text-[10px] text-muted-foreground">Marcar quando concluir antes das séries.</span></span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border/60 bg-card/50 px-3 py-2.5 text-xs text-foreground transition hover:border-primary/40">
                    <input type="checkbox" checked={cooldownCompleted} onChange={event => setCooldownCompleted(event.target.checked)} className="h-4 w-4 accent-primary" />
                    <span><strong className="block">Volta à calma</strong><span className="text-[10px] text-muted-foreground">Marcar quando concluir após o treino.</span></span>
                  </label>
                </fieldset>

                {/* Finalizar Treino */}
                <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <span className="text-xs text-muted-foreground">Duração (min):</span>
                    <input
                      type="number"
                      min="1"
                      max="1440"
                      value={sessionDuration}
                      onChange={e => setSessionDuration(Number(e.target.value))}
                      className="w-16 rounded-xl border border-border bg-secondary/50 p-1.5 text-xs text-center font-bold text-foreground"
                    />
                    <span className="text-xs text-muted-foreground">Esforço Percebido (RPE 1-10):</span>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={sessionRpe}
                      onChange={e => setSessionRpe(Number(e.target.value))}
                      className="w-16 rounded-xl border border-border bg-secondary/50 p-1.5 text-xs text-center font-bold text-foreground"
                    />
                  </div>

                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                    <button type="button" onClick={() => void handleFinishWorkout(false)} disabled={savingSession || activeSets.length === 0}
                      className="w-full rounded-2xl border border-border px-4 py-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-50 sm:w-auto">
                      {savingSession ? 'Salvando…' : 'Salvar como parcial'}
                    </button>
                    <button type="button" onClick={() => void handleFinishWorkout(true)} disabled={savingSession || activeSets.length === 0}
                      className="w-full rounded-2xl bg-primary px-6 py-2.5 text-xs font-bold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:bg-primary-hover active:scale-95 disabled:opacity-50 sm:w-auto">
                      {savingSession ? 'Salvando…' : 'Concluir treino'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : todayPlan ? (
            <div className="rounded-3xl border border-border bg-card p-8 text-center">
              <p className="text-sm font-semibold text-foreground">Recuperação ativa programada</p>
              <p className="mt-2 text-xs text-muted-foreground">{todayPlan.focusMuscles}. {todayPlan.recoveryNotes}</p>
            </div>
          ) : (
            <div className="rounded-3xl border border-border bg-card p-10 text-center text-xs text-muted-foreground">
              Nenhum treino programado para os próximos dias. Confira sua divisão semanal.
            </div>
          )}
        </div>
      )}

      {/* 2. ABA MINHA DIVISÃO */}
      {activeTab === 'split' && (
        <div className="space-y-5">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-display text-base font-bold text-foreground">
                  {appliedWorkoutTemplate
                    ? `Modelo aplicado: ${appliedWorkoutTemplate.name}`
                    : homeTrainingMode ? 'Rotina semanal em casa' : 'Estrutura semanal programada'}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {homeTrainingMode
                    ? 'Divisão de três dias sem halteres, gerada a partir da biblioteca local.'
                    : 'Divisão calculada para respeitar o tempo de recuperação entre as sessões.'}
                </p>
              </div>
              {appliedWorkoutTemplate ? (
                <button type="button" onClick={() => setAppliedWorkoutTemplate(null)} className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/15">
                  Voltar à divisão semanal
                </button>
              ) : (
                <button
                  type="button"
                  aria-pressed={homeTrainingMode}
                  onClick={() => setHomeTrainingMode(current => !current)}
                  className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/15"
                >
                  {homeTrainingMode ? 'Voltar à divisão semanal' : 'Gerar treino em casa sem halteres'}
                </button>
              )}
            </div>
            {homeTrainingMode && (
              <p role="status" className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-100/80">
                Alguns movimentos precisam de barra fixa, colchonete ou banco/apoio firme; confira as instruções e não improvise ancoragens.
              </p>
            )}
            {appliedWorkoutTemplate && <p role="status" className="text-xs text-emerald-300">Modelo aplicado: {appliedWorkoutTemplate.name}</p>}
            <div className="grid gap-4 border-t border-border/60 pt-4 lg:grid-cols-2">
              <form onSubmit={handleSaveWorkoutTemplate} className="flex flex-col gap-2 sm:flex-row">
                <input
                  required
                  minLength={1}
                  maxLength={80}
                  value={workoutTemplateName}
                  onChange={event => setWorkoutTemplateName(event.target.value)}
                  placeholder="Nome do modelo de treino"
                  aria-label="Nome do modelo de treino"
                  className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/70"
                />
                <button type="submit" disabled={savingWorkoutTemplate} className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:border-primary/40 disabled:opacity-50">
                  {savingWorkoutTemplate ? 'Salvando…' : 'Salvar divisão como modelo'}
                </button>
              </form>
              <div className="flex flex-col gap-2 sm:flex-row">
                <select
                  value={selectedWorkoutTemplateId}
                  onChange={event => setSelectedWorkoutTemplateId(event.target.value)}
                  disabled={!workoutTemplates.length}
                  aria-label="Modelo de treino salvo"
                  className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground"
                >
                  {!workoutTemplates.length && <option value="">Nenhum modelo salvo</option>}
                  {workoutTemplates.map(template => <option key={template.id} value={template.id}>{template.name} · {template.plans.length} dias</option>)}
                </select>
                <button type="button" onClick={handleApplyWorkoutTemplate} disabled={!workoutTemplates.length} className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50">
                  Aplicar modelo
                </button>
              </div>
              <div className="col-span-full flex flex-wrap gap-2">
                <button type="button" onClick={() => startWorkoutTemplateDraft()} className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/15">
                  Criar divisão editável
                </button>
                <button type="button" onClick={() => startWorkoutTemplateDraft(workoutTemplates.find(template => template.id === selectedWorkoutTemplateId))} disabled={!selectedWorkoutTemplateId} className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:border-primary/40 disabled:opacity-50">
                  Editar modelo selecionado
                </button>
              </div>
            </div>
            {workoutTemplateMessage && <p role="status" className="text-xs text-emerald-300">{workoutTemplateMessage}</p>}
            {workoutTemplateError && <p role="alert" className="text-xs text-destructive">{workoutTemplateError}</p>}
          </div>

          {workoutTemplateDraft && (
            <form onSubmit={handleSaveWorkoutTemplateDraft} className="space-y-4 rounded-3xl border border-primary/25 bg-card p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <label className="block min-w-0 flex-1 space-y-1.5">
                  <span className="text-xs font-semibold text-muted-foreground">Nome da divisão</span>
                  <input required maxLength={80} value={workoutTemplateDraftName} onChange={event => setWorkoutTemplateDraftName(event.target.value)} placeholder="Ex.: ABC com foco em força" className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground" />
                </label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setWorkoutTemplateDraft(null); setWorkoutTemplateDraftId(null); }} className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground">Cancelar</button>
                  <button type="submit" disabled={savingWorkoutTemplate} className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">{savingWorkoutTemplate ? 'Salvando…' : workoutTemplateDraftId ? 'Salvar alterações' : 'Salvar divisão'}</button>
                </div>
              </div>
              <div className="space-y-3">
                {workoutTemplateDraft.map((plan, planIndex) => (
                  <section key={`${plan.dayName}-${planIndex}`} className="space-y-3 rounded-2xl border border-border/70 bg-background/50 p-4">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="space-y-1 text-[11px] text-muted-foreground">Dia
                        <input required maxLength={40} value={plan.dayName} onChange={event => updateWorkoutTemplateDraftPlan(planIndex, current => ({ ...current, dayName: event.target.value }))} className="w-full rounded-lg border border-border bg-background px-2.5 py-2 text-xs text-foreground" />
                      </label>
                      <label className="space-y-1 text-[11px] text-muted-foreground">Nome do treino
                        <input required maxLength={120} value={plan.splitTitle} onChange={event => updateWorkoutTemplateDraftPlan(planIndex, current => ({ ...current, splitTitle: event.target.value }))} className="w-full rounded-lg border border-border bg-background px-2.5 py-2 text-xs text-foreground" />
                      </label>
                      <label className="space-y-1 text-[11px] text-muted-foreground">Foco muscular
                        <input maxLength={200} value={plan.focusMuscles} onChange={event => updateWorkoutTemplateDraftPlan(planIndex, current => ({ ...current, focusMuscles: event.target.value }))} className="w-full rounded-lg border border-border bg-background px-2.5 py-2 text-xs text-foreground" />
                      </label>
                      <label className="space-y-1 text-[11px] text-muted-foreground">Recuperação
                        <input maxLength={500} value={plan.recoveryNotes} onChange={event => updateWorkoutTemplateDraftPlan(planIndex, current => ({ ...current, recoveryNotes: event.target.value }))} className="w-full rounded-lg border border-border bg-background px-2.5 py-2 text-xs text-foreground" />
                      </label>
                    </div>
                    <div className="space-y-2">
                      {plan.exercises.map((item, exerciseIndex) => (
                        <div key={`${item.exerciseId}-${exerciseIndex}`} className="grid items-end gap-2 rounded-xl border border-border/60 bg-card/50 p-3 sm:grid-cols-[minmax(0,2fr)_75px_minmax(0,1fr)_90px_90px_auto]">
                          <label className="space-y-1 text-[10px] text-muted-foreground">Exercício
                            <select required value={item.exerciseId} onChange={event => updateWorkoutTemplateDraftPlan(planIndex, current => ({ ...current, exercises: current.exercises.map((exercise, index) => index === exerciseIndex ? { ...exercise, exerciseId: event.target.value } : exercise) }))} className="w-full rounded-lg border border-border bg-background px-2 py-2 text-xs text-foreground">
                              {exercises.map(exercise => <option key={exercise.id} value={exercise.id}>{exercise.name}</option>)}
                            </select>
                          </label>
                          <label className="space-y-1 text-[10px] text-muted-foreground">Séries
                            <input type="number" min="1" max="30" required value={item.sets} onChange={event => updateWorkoutTemplateDraftPlan(planIndex, current => ({ ...current, exercises: current.exercises.map((exercise, index) => index === exerciseIndex ? { ...exercise, sets: Number(event.target.value) } : exercise) }))} className="w-full rounded-lg border border-border bg-background px-2 py-2 text-xs text-foreground" />
                          </label>
                          <label className="space-y-1 text-[10px] text-muted-foreground">Repetições
                            <input required maxLength={50} value={item.repRange} onChange={event => updateWorkoutTemplateDraftPlan(planIndex, current => ({ ...current, exercises: current.exercises.map((exercise, index) => index === exerciseIndex ? { ...exercise, repRange: event.target.value } : exercise) }))} className="w-full rounded-lg border border-border bg-background px-2 py-2 text-xs text-foreground" />
                          </label>
                          <label className="space-y-1 text-[10px] text-muted-foreground">Descanso (s)
                            <input type="number" min="0" max="3600" required value={item.restSeconds} onChange={event => updateWorkoutTemplateDraftPlan(planIndex, current => ({ ...current, exercises: current.exercises.map((exercise, index) => index === exerciseIndex ? { ...exercise, restSeconds: Number(event.target.value) } : exercise) }))} className="w-full rounded-lg border border-border bg-background px-2 py-2 text-xs text-foreground" />
                          </label>
                          <label className="space-y-1 text-[10px] text-muted-foreground">Carga (kg)
                            <input type="number" min="0.1" max="1000" step="0.5" placeholder="Opcional" value={item.recommendedWeightKg ?? ''} onChange={event => updateWorkoutTemplateDraftPlan(planIndex, current => ({ ...current, exercises: current.exercises.map((exercise, index) => index === exerciseIndex ? { ...exercise, recommendedWeightKg: event.target.value === '' ? undefined : Number(event.target.value) } : exercise) }))} className="w-full rounded-lg border border-border bg-background px-2 py-2 text-xs text-foreground" />
                          </label>
                          <button type="button" aria-label={`Remover ${exercises.find(exercise => exercise.id === item.exerciseId)?.name || 'exercício'}`} onClick={() => updateWorkoutTemplateDraftPlan(planIndex, current => ({ ...current, exercises: current.exercises.filter((_, index) => index !== exerciseIndex) }))} className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-wrap justify-between gap-2">
                      <button type="button" disabled={!exercises.length || workoutTemplateDraft.reduce((total, draftPlan) => total + draftPlan.exercises.length, 0) >= 120 || plan.exercises.length >= 50} onClick={() => updateWorkoutTemplateDraftPlan(planIndex, current => ({ ...current, exercises: [...current.exercises, { exerciseId: exercises[0].id, sets: 3, repRange: '8–12', restSeconds: 90 }] }))} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-[11px] font-semibold text-foreground hover:border-primary/40 disabled:opacity-50"><Plus className="h-3.5 w-3.5" />Adicionar exercício</button>
                      <button type="button" onClick={() => setWorkoutTemplateDraft(current => current?.filter((_, index) => index !== planIndex) || null)} className="rounded-lg px-3 py-2 text-[11px] font-semibold text-destructive hover:bg-destructive/10">Remover dia</button>
                    </div>
                  </section>
                ))}
              </div>
              <button type="button" disabled={workoutTemplateDraft.length >= 14} onClick={() => setWorkoutTemplateDraft(current => current ? [...current, { dayName: `Dia ${current.length + 1}`, splitTitle: 'Novo treino', focusMuscles: '', recoveryNotes: '', exercises: [] }] : null)} className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-foreground hover:border-primary/40 disabled:opacity-50"><Plus className="h-3.5 w-3.5" />Adicionar dia</button>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {activeWorkoutSplit.map((plan, pIdx) => (
              <div key={pIdx} className="rounded-3xl border border-border bg-card p-5 shadow-sm space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <span className="text-xs font-bold text-primary">{plan.dayName}</span>
                    <span className="text-[10px] text-muted-foreground">{plan.exercises.length} exercícios</span>
                  </div>

                  <h4 className="font-display text-sm font-bold text-foreground">{plan.splitTitle}</h4>
                  <span className="text-[11px] text-muted-foreground block">
                    Foco: {plan.focusMuscles}
                  </span>

                  <ul className="text-xs text-foreground/80 space-y-1.5 pt-2">
                    {plan.exercises.map((item, eIdx) => (
                      <li key={eIdx} className="flex items-center justify-between">
                        <span>• {item.exercise.name}</span>
                        <span className="text-[11px] font-bold text-muted-foreground">
                          {item.sets} × {item.repRange}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="text-[11px] text-muted-foreground italic border-t border-border/50 pt-2">
                  {plan.recoveryNotes}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'agenda' && (
        <section className="space-y-5 rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <header className="border-b border-border pb-3">
            <h3 className="font-display text-base font-bold text-foreground">Agenda e recuperação</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Treinos planejados sem sessão registrada aparecem como perdidos depois da data. Descanso e deload ficam identificados separadamente.
            </p>
          </header>

          <section aria-label="Calendário semanal de treinos" className="space-y-3 rounded-2xl border border-border/70 bg-background/40 p-3 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Semana de treinos</h4>
                <p className="mt-1 text-[11px] text-foreground">
                  {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(`${calendarWeekDates[0]}T12:00:00`))}
                  {' — '}
                  {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${calendarWeekDates[6]}T12:00:00`))}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" aria-label="Semana anterior" onClick={() => setCalendarWeekAnchor(date => shiftWorkoutWeek(date, -1))}
                  className="rounded-lg border border-border p-2 text-muted-foreground transition hover:text-foreground"><ChevronLeft className="h-4 w-4" /></button>
                <button type="button" onClick={() => setCalendarWeekAnchor(getLocalIsoDate())}
                  className="rounded-lg border border-border px-3 py-2 text-[11px] font-semibold text-muted-foreground transition hover:text-foreground">Hoje</button>
                <button type="button" aria-label="Próxima semana" onClick={() => setCalendarWeekAnchor(date => shiftWorkoutWeek(date, 1))}
                  className="rounded-lg border border-border p-2 text-muted-foreground transition hover:text-foreground"><ChevronRight className="h-4 w-4" /></button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
              {calendarWeekDates.map(date => {
                const entry = workoutSchedule.find(item => item.date === date);
                const daySessions = sessions.filter(session => session.date === date);
                const scheduleStatus = entry ? getWorkoutScheduleStatus(entry, sessions, getLocalIsoDate()) : null;
                const statusLabel = scheduleStatus === 'training' || scheduleStatus === 'scheduled' ? 'Treino planejado'
                  : scheduleStatus === 'completed' ? 'Treino realizado'
                    : scheduleStatus === 'partial' ? 'Sessão parcial'
                      : scheduleStatus === 'missed' ? 'Treino perdido'
                        : scheduleStatus === 'rest' ? 'Descanso'
                          : scheduleStatus === 'deload' ? 'Deload'
                            : daySessions.length > 0 ? (daySessions.some(session => session.completed) ? 'Treino realizado' : 'Sessão parcial')
                              : 'Sem treino previsto';
                const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(new Date(`${date}T12:00:00`));
                const dayNumber = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(`${date}T12:00:00`));
                return (
                  <article key={date} aria-label={`${weekday} ${dayNumber}: ${statusLabel}`}
                    aria-current={date === getLocalIsoDate() ? 'date' : undefined}
                    className={`min-h-28 rounded-xl border p-3 ${date === getLocalIsoDate() ? 'border-primary/40 bg-primary/[0.05]' : 'border-border/60 bg-secondary/20'}`}>
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-semibold uppercase text-muted-foreground">{weekday}</span>
                      <span className="text-[10px] tabular-nums text-foreground">{dayNumber}</span>
                    </div>
                    <p className="mt-2 text-[11px] font-semibold leading-snug text-foreground">{entry?.title || (entry ? statusLabel : daySessions[0]?.splitName || statusLabel)}</p>
                    <span className="mt-1 inline-flex rounded-full border border-border/70 px-2 py-0.5 text-[9px] font-medium text-muted-foreground">{statusLabel}</span>
                    {entry?.notes && <p className="mt-1 line-clamp-2 text-[10px] text-muted-foreground">{entry.notes}</p>}
                    {!entry && daySessions.length === 0 && (
                      <button type="button" onClick={() => { setScheduleDate(date); setScheduleKind('training'); }}
                        className="mt-2 rounded-md px-1.5 py-1 text-[10px] font-semibold text-primary transition hover:bg-primary/10">
                        Planejar dia
                      </button>
                    )}
                  </article>
                );
              })}
            </div>
          </section>

          <form onSubmit={handleSaveSchedule} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="space-y-1.5 text-xs font-semibold text-muted-foreground">
              <span>Data</span>
              <input required type="date" value={scheduleDate} onChange={event => setScheduleDate(event.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground" />
            </label>
            <label className="space-y-1.5 text-xs font-semibold text-muted-foreground">
              <span>Tipo do dia</span>
              <select value={scheduleKind} onChange={event => setScheduleKind(event.target.value as SaveWorkoutScheduleInput['kind'])}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground">
                <option value="training">Treino planejado</option>
                <option value="rest">Descanso</option>
                <option value="deload">Deload / redução de carga</option>
              </select>
            </label>
            <label className="space-y-1.5 text-xs font-semibold text-muted-foreground">
              <span>Nome ou foco (opcional)</span>
              <input value={scheduleTitle} maxLength={80} onChange={event => setScheduleTitle(event.target.value)} placeholder="Ex.: Full Body A"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground/70" />
            </label>
            <label className="space-y-1.5 text-xs font-semibold text-muted-foreground">
              <span>Nota (opcional)</span>
              <input value={scheduleNotes} maxLength={400} onChange={event => setScheduleNotes(event.target.value)} placeholder="Motivo do descanso ou ajuste"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground/70" />
            </label>
            <div className="sm:col-span-2 lg:col-span-4">
              <button type="submit" disabled={savingSchedule}
                className="rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground transition hover:bg-primary-hover disabled:opacity-50">
                {savingSchedule ? 'Salvando…' : 'Salvar dia na agenda'}
              </button>
            </div>
          </form>

          {scheduleMessage && <p role="status" className="text-xs text-emerald-300">{scheduleMessage}</p>}
          {scheduleError && <p role="alert" className="text-xs text-destructive">{scheduleError}</p>}

          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Dias registrados</h4>
            {workoutSchedule.length === 0 ? (
              <p className="rounded-xl border border-border/60 bg-secondary/30 p-4 text-xs text-muted-foreground">Ainda não há dias na agenda. Registre treino, descanso ou deload para acompanhar a semana.</p>
            ) : workoutSchedule.map(entry => {
              const status = getWorkoutScheduleStatus(entry, sessions, getLocalIsoDate());
              const labels: Record<typeof status, string> = {
                training: 'Treino planejado', scheduled: 'Treino agendado', completed: 'Treino realizado',
                partial: 'Sessão parcial', missed: 'Treino perdido', rest: 'Descanso planejado', deload: 'Deload planejado'
              };
              const colors: Record<typeof status, string> = {
                training: 'border-sky-500/25 bg-sky-500/5 text-sky-200', scheduled: 'border-sky-500/25 bg-sky-500/5 text-sky-200',
                completed: 'border-emerald-500/25 bg-emerald-500/5 text-emerald-200', partial: 'border-amber-500/25 bg-amber-500/5 text-amber-200',
                missed: 'border-rose-500/25 bg-rose-500/5 text-rose-200', rest: 'border-border bg-secondary/30 text-muted-foreground',
                deload: 'border-primary/25 bg-primary/5 text-primary'
              };
              return (
                <article key={entry.id} className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-background/50 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-xs text-foreground">
                        {new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(`${entry.date}T12:00:00`))}
                      </strong>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${colors[status]}`}>{labels[status]}</span>
                    </div>
                    {entry.title && <p className="text-xs text-muted-foreground">{entry.title}</p>}
                    {entry.notes && <p className="text-[11px] text-muted-foreground/80">{entry.notes}</p>}
                  </div>
                  <button type="button" onClick={() => editScheduleEntry(entry)} className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-[11px] font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground">
                    Editar dia
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* 3. ABA BIBLIOTECA DE EXERCÍCIOS */}
      {activeTab === 'exercises' && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-border bg-card p-5 shadow-sm space-y-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar por exercício..."
                value={searchExercise}
                onChange={e => setSearchExercise(e.target.value)}
                className="w-full rounded-xl border border-border bg-secondary/50 py-2.5 pl-9 pr-3.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
              <Search className="absolute left-3 top-3 h-3.5 w-3.5 text-muted-foreground" />
            </div>

            {/* Músculos */}
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/50">
              {[
                { id: 'all', label: 'Todos' },
                { id: 'peitoral', label: 'Peitoral' },
                { id: 'costas', label: 'Costas' },
                { id: 'ombros', label: 'Ombros' },
                { id: 'biceps', label: 'Bíceps' },
                { id: 'triceps', label: 'Tríceps' },
                { id: 'antebracos', label: 'Antebraços' },
                { id: 'quadriceps', label: 'Quadríceps' },
                { id: 'posteriores', label: 'Posteriores' },
                { id: 'gluteos', label: 'Glúteos' },
                { id: 'panturrilhas', label: 'Panturrilhas' },
                { id: 'abdomen', label: 'Abdômen' }
              ].map(m => (
                <button
                  key={m.id}
                  onClick={() => setSelectedMuscle(m.id as any)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                    selectedMuscle === m.id
                      ? 'border border-primary bg-primary/10 text-primary'
                      : 'border border-border bg-secondary/30 text-muted-foreground hover:border-border/80'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {mediaError && <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">{mediaError}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredExercises.map(ex => (
              <div key={ex.id} className="rounded-3xl border border-border bg-card p-5 shadow-sm space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  {ex.imageUrl && (
                    <div className="overflow-hidden rounded-2xl border border-border bg-secondary/30">
                      <img
                        src={ex.imageUrl}
                        alt={`Referência visual: ${ex.name}`}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className="aspect-[16/9] w-full object-contain"
                        onError={event => {
                          const image = event.currentTarget;
                          if (!image.src.includes('/catalog-assets/')) image.src = OFFLINE_EXERCISE_IMAGE[ex.primaryMuscle];
                          else image.style.visibility = 'hidden';
                        }}
                      />
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="rounded-lg bg-secondary px-2 py-0.5 text-[10px] font-bold text-primary uppercase">
                      {ex.primaryMuscle}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{ex.equipment}</span>
                  </div>

                  <h4 className="font-display text-sm font-bold text-foreground">{ex.name}</h4>

                  <p className="text-xs text-muted-foreground leading-relaxed">{ex.description || ex.instructions}</p>
                  {ex.executionTips && (
                    <div className="rounded-xl border border-primary/15 bg-primary/5 p-2 text-[11px] text-muted-foreground">
                      <strong className="text-primary">Dica de execução:</strong> {ex.executionTips}
                    </div>
                  )}
                  {ex.imageCredit && (
                    <p className="text-[9px] leading-relaxed text-muted-foreground/70">
                      Crédito da imagem: {ex.imageCredit.split(' · ')[0]} ·{' '}
                      <a
                        href={ex.imageCredit.includes('3.0') ? 'https://creativecommons.org/licenses/by-sa/3.0/' : 'https://creativecommons.org/licenses/by-sa/4.0/'}
                        target="_blank"
                        rel="noreferrer"
                        className="underline decoration-dotted underline-offset-2 hover:text-primary"
                      >
                        {ex.imageCredit.includes('CC BY-SA') ? ex.imageCredit.match(/CC BY-SA [^·]+/)?.[0] : 'Fonte Unsplash'}
                      </a>{' '}· wger.de
                    </p>
                  )}
                  <YouTubePlayer url={ex.youtubeUrl} title={ex.name} />

                  {ex.commonErrors && (
                    <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-2 text-[11px] text-destructive">
                      <strong>Erro comum:</strong> {ex.commonErrors}
                    </div>
                  )}

                  {(historyByExercise.get(ex.id)?.length || 0) > 0 ? (
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-primary">
                        <TrendingUp className="h-3.5 w-3.5" /> Sugestão para a próxima sessão
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {progressionEngine.suggestProgression(ex.id, historyByExercise.get(ex.id) || []).suggestedWeightKg} kg · {progressionEngine.suggestProgression(ex.id, historyByExercise.get(ex.id) || []).rationale}
                      </p>
                    </div>
                  ) : (
                    <p className="rounded-xl border border-border/60 bg-secondary/30 p-3 text-[11px] text-muted-foreground">
                      Ainda sem histórico de carga. Registre uma sessão para receber uma sugestão personalizada.
                    </p>
                  )}

                  {ex.media?.length ? (
                    <div className="grid grid-cols-2 gap-2">
                      {ex.media.map(media => (
                        <div key={media.id} className="group relative overflow-hidden rounded-xl border border-border bg-black/80">
                          {media.mimeType === 'video/mp4' ? (
                            <video src={media.filePath} controls loop muted playsInline className="aspect-video w-full object-contain" />
                          ) : (
                            <img src={media.filePath} alt={`Demonstração de ${ex.name}`} className="aspect-video w-full object-contain" />
                          )}
                          <button
                            type="button"
                            aria-label={`Excluir mídia ${media.originalName}`}
                            onClick={() => {
                              if (window.confirm('Excluir esta mídia de demonstração?')) {
                                void onDeleteExerciseMedia(media.id).catch(reason => setMediaError(reason instanceof Error ? reason.message : 'Não foi possível excluir a mídia.'));
                              }
                            }}
                            className="absolute right-2 top-2 rounded-lg bg-black/70 p-1.5 text-white opacity-0 transition group-hover:opacity-100 hover:bg-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-muted-foreground">Sem foto ou vídeo de demonstração anexado.</p>
                  )}
                </div>

                <div className="space-y-2 border-t border-border/50 pt-3">
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-secondary/40 px-3 py-2 text-[11px] font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-primary">
                    <ImagePlus className="h-3.5 w-3.5" />
                    {uploadingExerciseId === ex.id ? 'Salvando mídia...' : 'Anexar demonstração'}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/gif,video/mp4"
                      className="sr-only"
                      disabled={uploadingExerciseId === ex.id}
                      onChange={event => { void handleUploadExerciseMedia(ex.id, event.target.files?.[0]); event.currentTarget.value = ''; }}
                    />
                  </label>
                  {ex.alternatives && ex.alternatives.length > 0 && (
                    <div className="text-[10px] text-muted-foreground">
                      <span>Alternativas: {ex.alternatives.join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. ABA HISTÓRICO DE TREINOS */}
      {activeTab === 'history' && (
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-5">
          <h3 className="font-display text-base font-bold text-foreground border-b border-border pb-3">
            Histórico de Sessões de Treino
          </h3>

          <div className="space-y-4">
            {sessions.length === 0 ? (
              <div className="py-10 text-center text-xs text-muted-foreground">
                Nenhum treino registrado ainda. Conclua seu treino na aba "Treino de Hoje".
              </div>
            ) : (
              sessions.map(s => (
                <div key={s.id} className="rounded-2xl border border-border bg-secondary/30 p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <strong className="text-foreground">{s.splitName} <span className={`ml-2 text-[10px] ${s.completed ? 'text-emerald-300' : 'text-amber-200'}`}>{s.completed ? 'Concluído' : 'Parcial'}</span></strong>
                    <span className="text-muted-foreground">{s.date} • {s.durationMinutes} min</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {s.sets.filter(set => set.completed).length}/{s.sets.length} séries concluídas • RPE: {s.perceivedExertion}/10
                  </div>
                  {s.notes && <p className="rounded-lg border border-border/70 bg-background/60 px-3 py-2 text-xs text-muted-foreground whitespace-pre-wrap">Treino: {s.notes}</p>}
                  {(s.discomfortLevel !== undefined || s.recoveryRating !== undefined) && (
                    <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                      {s.discomfortLevel !== undefined && <span className="rounded-lg border border-border bg-card/60 px-2 py-1">Desconforto: {s.discomfortLevel}/10{s.discomfortArea ? ` · ${s.discomfortArea}` : ''}</span>}
                      {s.recoveryRating !== undefined && <span className="rounded-lg border border-border bg-card/60 px-2 py-1">Recuperação: {s.recoveryRating}/5</span>}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                    <span className={`rounded-lg border px-2 py-1 ${s.warmupCompleted ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-border bg-card/60'}`}>Aquecimento: {s.warmupCompleted ? 'concluído' : 'não marcado'}</span>
                    <span className={`rounded-lg border px-2 py-1 ${s.cooldownCompleted ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-border bg-card/60'}`}>Volta à calma: {s.cooldownCompleted ? 'concluída' : 'não marcada'}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {s.sets.map(set => (
                      <div key={set.id} className={`max-w-full rounded-lg border px-2 py-1 text-[10px] ${set.isPr ? 'border-amber-400/30 bg-amber-400/10 text-amber-300' : 'border-border bg-card/60 text-muted-foreground'}`}>
                        <span>{set.exerciseName}: {set.weightKg} kg × {set.reps}{set.rpe ? ` · RPE ${set.rpe}` : ''}{set.rir !== undefined ? ` · RIR ${set.rir}` : ''}{!set.completed ? ' · não concluída' : ''}{set.isPr ? ' · PR' : ''}</span>
                        {set.notes && <span className="mt-1 block whitespace-pre-wrap">Nota: {set.notes}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
