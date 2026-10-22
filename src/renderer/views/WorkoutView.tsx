import React, { useMemo, useState } from 'react';
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
  TrendingUp
} from 'lucide-react';
import { Exercise, ExerciseMediaInput, MuscleGroup, WorkoutSession, WorkoutSet } from '../../shared/types';
import { DailyWorkoutPlan, getNextScheduledWorkout, WorkoutEngine } from '../../domain/workout-engine';
import { YouTubePlayer } from '../components/YouTubePlayer';

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

interface WorkoutViewProps {
  exercises: Exercise[];
  sessions: WorkoutSession[];
  workoutSplit: DailyWorkoutPlan[];
  onLogSession: (sessionData: any) => Promise<void>;
  onAddExerciseMedia: (input: ExerciseMediaInput) => Promise<void>;
  onDeleteExerciseMedia: (id: string) => Promise<void>;
}

export const WorkoutView: React.FC<WorkoutViewProps> = ({
  exercises,
  sessions,
  workoutSplit,
  onLogSession,
  onAddExerciseMedia,
  onDeleteExerciseMedia
}) => {
  const [activeTab, setActiveTab] = useState<'today' | 'split' | 'exercises' | 'history'>('today');

  // Treino Ativo do Dia
  const upcomingWorkout = useMemo(() => getNextScheduledWorkout(workoutSplit), [workoutSplit]);
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
    rpe?: number;
  }>>([]);

  const [sessionDuration, setSessionDuration] = useState<number>(0);
  const [sessionRpe, setSessionRpe] = useState<number>(0);
  const [savingSession, setSavingSession] = useState<boolean>(false);
  const [sessionSuccessMsg, setSessionSuccessMsg] = useState<string | null>(null);
  const [sessionValidationError, setSessionValidationError] = useState<string | null>(null);

  // Filtros de Exercícios
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | 'all'>('all');
  const [searchExercise, setSearchExercise] = useState<string>('');
  const [uploadingExerciseId, setUploadingExerciseId] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const historyByExercise = useMemo(() => {
    const history = new Map<string, WorkoutSet[]>();
    for (const session of [...sessions].sort((a, b) => a.date.localeCompare(b.date))) {
      if (!session.completed) continue;
      for (const set of session.sets) {
        const exerciseSets = history.get(set.exerciseId) || [];
        exerciseSets.push(set);
        history.set(set.exerciseId, exerciseSets);
      }
    }
    return history;
  }, [sessions]);
  const progressionEngine = useMemo(() => new WorkoutEngine(exercises), [exercises]);

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
        reps: 0
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

  const handleFinishWorkout = async () => {
    if (sessionDuration < 1 || sessionRpe < 1 || sessionRpe > 10 || activeSets.some(set => set.weightKg <= 0 || set.reps < 1 || (set.rpe !== undefined && (set.rpe < 1 || set.rpe > 10)))) {
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
        completed: true,
        durationMinutes: sessionDuration,
        perceivedExertion: sessionRpe,
        sets: activeSets.map(({ exerciseId, setNumber, weightKg, reps, rpe }) => ({
          exerciseId, setNumber, weightKg, reps, rpe
        }))
      });
      setSessionSuccessMsg('Treino registrado com sucesso no histórico!');
      setActiveSets([]);
      setSessionDuration(0);
      setSessionRpe(0);
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
            { id: 'exercises', label: 'Biblioteca de Exercícios', icon: Dumbbell },
            { id: 'history', label: 'Histórico & PRs', icon: Award }
          ].map(t => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
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

              {/* Registro de Séries */}
              <div className="space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                  Séries e Cargas Realizadas
                </span>

                <div className="space-y-2.5">
                  {activeSets.map((set, sIdx) => (
                    <div
                      key={sIdx}
                      className="rounded-2xl border border-border bg-secondary/30 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary font-bold text-foreground">
                          #{set.setNumber}
                        </span>
                        <div>
                          <strong className="text-foreground block">{set.exerciseName}</strong>
                          <span className="text-[11px] text-muted-foreground">
                            Carga: {set.weightKg > 0 ? `${set.weightKg} kg` : 'não informada'} • Reps: {set.reps > 0 ? set.reps : 'não informadas'}{set.rpe ? ` • RPE ${set.rpe}` : ''}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-auto">
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

                        <button
                          type="button"
                          onClick={() => handleRemoveSet(sIdx)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Adicionar Séries de Exercícios Recomendados */}
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-semibold text-muted-foreground block">
                    Exercícios Programados para Hoje:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {todayPlan.exercises.map((item, eIdx) => (
                      <button
                        key={eIdx}
                        type="button"
                        onClick={() => handleAddSet(item.exercise.id, item.exercise.name)}
                        className="flex items-center gap-1.5 rounded-xl border border-border bg-secondary/50 px-3 py-1.5 text-xs font-semibold text-foreground hover:border-primary hover:text-primary transition-all"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Adicionar Série: {item.exercise.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

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

                  <button
                    type="button"
                    onClick={handleFinishWorkout}
                    disabled={savingSession || activeSets.length === 0}
                    className="w-full sm:w-auto rounded-2xl bg-primary px-6 py-2.5 text-xs font-bold text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary-hover active:scale-95 transition-all disabled:opacity-50"
                  >
                    {savingSession ? 'Salvando...' : 'Concluir Treino e Salvar'}
                  </button>
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
            <h3 className="font-display text-base font-bold text-foreground">
              Estrutura Semanal Programada
            </h3>
            <p className="text-xs text-muted-foreground">
              Divisão calculada para respeitar o tempo de supercompensação das fibras musculares e fadiga do SNC.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {workoutSplit.map((plan, pIdx) => (
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
            Histórico de Sessões Concluídas
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
                    <strong className="text-foreground">{s.splitName}</strong>
                    <span className="text-muted-foreground">{s.date} • {s.durationMinutes} min</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {s.sets.length} séries registradas • RPE: {s.perceivedExertion}/10
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {s.sets.map(set => (
                      <span key={set.id} className={`rounded-lg border px-2 py-1 text-[10px] ${set.isPr ? 'border-amber-400/30 bg-amber-400/10 text-amber-300' : 'border-border bg-card/60 text-muted-foreground'}`}>
                        {set.exerciseName}: {set.weightKg} kg × {set.reps}{set.rpe ? ` · RPE ${set.rpe}` : ''}{set.isPr ? ' · PR' : ''}
                      </span>
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
