import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, LoaderCircle } from 'lucide-react';
import { ApplyWeeklyMealTemplateResult, DailyMealEntry, DailyMealHistoryQuery, DailyMealStatus, MealTemplate, ReorderDailyMealsInput } from '../../shared/types';
import { moveDailyMealSlot, sortDailyMealEntries } from '../../domain/daily-meal-order';
import { getWorkoutWeekDates, shiftWorkoutWeek } from '../../domain/workout-week-calendar';

interface WeeklyMealPlannerProps {
  templates: MealTemplate[];
  selectedTemplateId: string;
  onSelectTemplate: (templateId: string) => void;
  onGetMealHistory: (query: DailyMealHistoryQuery) => Promise<DailyMealEntry[]>;
  onApplyTemplate: (input: { templateId: string; weekStartDate: string }) => Promise<ApplyWeeklyMealTemplateResult>;
  onReorderMeals: (input: ReorderDailyMealsInput) => Promise<DailyMealEntry[]>;
}

const localDate = (date: Date) => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
const formatDay = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
const mealStatusLabel: Record<DailyMealStatus, string> = {
  pending: 'Planejada', preparing: 'Preparando', consumed: 'Consumida', partial: 'Parcial',
  deferred: 'Adiada', skipped: 'Ignorada', cancelled: 'Cancelada'
};

export const WeeklyMealPlanner: React.FC<WeeklyMealPlannerProps> = ({
  templates, selectedTemplateId, onSelectTemplate, onGetMealHistory, onApplyTemplate, onReorderMeals
}) => {
  const [weekAnchor, setWeekAnchor] = useState(() => localDate(new Date()));
  const weekDates = useMemo(() => getWorkoutWeekDates(weekAnchor), [weekAnchor]);
  const [entries, setEntries] = useState<DailyMealEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [reorderingDate, setReorderingDate] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const results = await onGetMealHistory({ fromDate: weekDates[0], toDate: weekDates[6] });
      setEntries(results);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar o plano semanal.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let current = true;
    setLoading(true);
    onGetMealHistory({ fromDate: weekDates[0], toDate: weekDates[6] })
      .then(result => { if (current) { setEntries(result); setError(null); } })
      .catch(cause => { if (current) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar o plano semanal.'); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [weekDates[0], weekDates[6], onGetMealHistory]);

  const applyTemplate = async () => {
    if (!selectedTemplateId) return;
    setApplying(true);
    setMessage(null);
    setError(null);
    try {
      const result = await onApplyTemplate({ templateId: selectedTemplateId, weekStartDate: weekDates[0] });
      setMessage(`${result.copiedCount} refeição(ões) adicionada(s) em ${result.dates.length} dias; ${result.skippedCount} horário(s) existente(s) preservado(s).`);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível aplicar o modelo à semana.');
    } finally {
      setApplying(false);
    }
  };

  const reorder = async (date: string, slotId: string, direction: -1 | 1) => {
    const meals = sortDailyMealEntries(entries.filter(entry => entry.date === date));
    const slotIds = moveDailyMealSlot(meals, slotId, direction);
    if (slotIds.every((id, index) => id === meals[index]?.slotId)) return;
    setReorderingDate(date);
    setError(null);
    try {
      const saved = await onReorderMeals({ date, slotIds });
      setEntries(current => [...current.filter(entry => entry.date !== date), ...saved]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar a ordem das refeições.');
      await refresh();
    } finally {
      setReorderingDate(null);
    }
  };

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card/70 p-4" aria-label="Planejamento semanal de refeições">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Plano semanal</h3>
          <p className="mt-1 text-xs text-muted-foreground">Aplique um modelo salvo aos sete dias. Refeições já registradas são preservadas.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Semana anterior" onClick={() => setWeekAnchor(date => shiftWorkoutWeek(date, -1))} className="rounded-lg border border-border p-2 text-muted-foreground transition hover:text-foreground">
            <ChevronLeft size={16} />
          </button>
          <span className="min-w-32 text-center text-xs font-medium text-foreground">{formatDay(weekDates[0])} – {formatDay(weekDates[6])}</span>
          <button type="button" aria-label="Próxima semana" onClick={() => setWeekAnchor(date => shiftWorkoutWeek(date, 1))} className="rounded-lg border border-border p-2 text-muted-foreground transition hover:text-foreground">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor="weekly-meal-template">Modelo salvo para aplicar</label>
        <select id="weekly-meal-template" value={selectedTemplateId} onChange={event => onSelectTemplate(event.target.value)} disabled={!templates.length} className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground disabled:opacity-50">
          {templates.length === 0 && <option value="">Salve um modelo diário primeiro</option>}
          {templates.map(template => <option key={template.id} value={template.id}>{template.name} · {template.meals.length} refeições</option>)}
        </select>
        <button type="button" onClick={() => void applyTemplate()} disabled={!selectedTemplateId || applying} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-50">
          {applying ? 'Montando semana…' : 'Aplicar à semana'}
        </button>
      </div>

      {message && <p role="status" className="text-xs text-emerald-300">{message}</p>}
      {error && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</p>}
      {loading ? <p className="flex items-center gap-2 text-xs text-muted-foreground"><LoaderCircle size={14} className="animate-spin" /> Carregando refeições salvas…</p> : (
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {weekDates.map(date => {
            const meals = sortDailyMealEntries(entries.filter(entry => entry.date === date));
            return (
              <div key={date} className="rounded-xl border border-border/70 bg-background/50 p-3">
                <h4 className="mb-2 text-xs font-semibold capitalize text-foreground">{formatDay(date)}</h4>
                {meals.length === 0 ? <p className="text-[11px] text-muted-foreground">Sem refeições planejadas</p> : (
                  <ol className="space-y-1.5">
                    {meals.map((meal, index) => (
                      <li key={meal.slotId} className="flex items-center gap-2 rounded-lg bg-card px-2.5 py-2">
                        <span className="min-w-0 flex-1 truncate text-xs text-foreground">{meal.scheduledTime} · {meal.mealName}</span>
                        <span className="text-[10px] text-muted-foreground">{mealStatusLabel[meal.status]}</span>
                        <button type="button" aria-label={`Mover ${meal.mealName} para cima`} disabled={index === 0 || reorderingDate === date} onClick={() => void reorder(date, meal.slotId, -1)} className="rounded p-1 text-muted-foreground transition hover:text-foreground disabled:opacity-30"><ArrowUp size={13} /></button>
                        <button type="button" aria-label={`Mover ${meal.mealName} para baixo`} disabled={index === meals.length - 1 || reorderingDate === date} onClick={() => void reorder(date, meal.slotId, 1)} className="rounded p-1 text-muted-foreground transition hover:text-foreground disabled:opacity-30"><ArrowDown size={13} /></button>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
