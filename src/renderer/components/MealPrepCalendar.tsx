import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import { MealPrepEvent, MealPrepEventInput, Recipe } from '../../shared/types';
import { getWorkoutWeekDates, shiftWorkoutWeek } from '../../domain/workout-week-calendar';

const dateValue = (date: Date) => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
const dayLabel = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'short' });
const statusText: Record<MealPrepEvent['status'], string> = {
  planned: 'Planejado', prepared: 'Preparado', cancelled: 'Cancelado'
};

interface MealPrepCalendarProps {
  recipes: Recipe[];
  onGetEvents: (range: { fromDate: string; toDate: string }) => Promise<MealPrepEvent[]>;
  onSaveEvent: (input: MealPrepEventInput) => Promise<MealPrepEvent>;
  onDeleteEvent: (id: string) => Promise<void>;
}

export const MealPrepCalendar: React.FC<MealPrepCalendarProps> = ({ recipes, onGetEvents, onSaveEvent, onDeleteEvent }) => {
  const [weekAnchor, setWeekAnchor] = useState(() => dateValue(new Date()));
  const weekDates = useMemo(() => getWorkoutWeekDates(weekAnchor), [weekAnchor]);
  const [events, setEvents] = useState<MealPrepEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => dateValue(new Date()));
  const [scheduledTime, setScheduledTime] = useState('09:00');
  const [recipeId, setRecipeId] = useState('');
  const [servings, setServings] = useState(1);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<MealPrepEvent['status']>('planned');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      setEvents(await onGetEvents({ fromDate: weekDates[0], toDate: weekDates[6] }));
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os preparos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let current = true;
    setLoading(true);
    onGetEvents({ fromDate: weekDates[0], toDate: weekDates[6] })
      .then(result => { if (current) { setEvents(result); setError(null); } })
      .catch(cause => { if (current) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os preparos.'); })
      .finally(() => { if (current) setLoading(false); });
    if (!weekDates.includes(selectedDate)) setSelectedDate(weekDates[0]);
    return () => { current = false; };
  }, [weekDates[0], weekDates[6], onGetEvents]);

  useEffect(() => {
    if (!recipeId && recipes.length) setRecipeId(recipes[0].id);
  }, [recipes, recipeId]);

  const resetForm = () => {
    setEditingId(null);
    setScheduledTime('09:00');
    setServings(1);
    setNotes('');
    setStatus('planned');
    setMessage(null);
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!recipeId) { setError('Escolha uma receita para programar o preparo.'); return; }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await onSaveEvent({
        id: editingId || undefined, date: selectedDate, scheduledTime, recipeId,
        servings, notes: notes.trim() || undefined, status
      });
      setMessage(editingId ? 'Preparo atualizado no calendário.' : 'Preparo adicionado ao calendário.');
      resetForm();
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar este preparo.');
    } finally {
      setSaving(false);
    }
  };

  const edit = (event: MealPrepEvent) => {
    setEditingId(event.id);
    setSelectedDate(event.date);
    setScheduledTime(event.scheduledTime);
    setRecipeId(event.recipeId);
    setServings(event.servings);
    setNotes(event.notes || '');
    setStatus(event.status);
    setMessage(null);
    setError(null);
  };

  const remove = async (event: MealPrepEvent) => {
    if (!window.confirm(`Excluir o preparo de ${event.recipeName} em ${event.date}?`)) return;
    setError(null);
    setMessage(null);
    try {
      await onDeleteEvent(event.id);
      if (editingId === event.id) resetForm();
      setMessage('Preparo removido do calendário.');
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível excluir este preparo.');
    }
  };

  return (
    <section className="space-y-5 rounded-3xl border border-border bg-card p-5 shadow-sm" aria-label="Calendário de preparo de refeições">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold text-foreground"><CalendarDays className="h-4 w-4 text-primary" /> Calendário de preparo</h2>
          <p className="mt-1 text-xs text-muted-foreground">Programe quando vai cozinhar cada receita. O horário de preparo fica separado do horário de consumo.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Semana anterior" onClick={() => setWeekAnchor(date => shiftWorkoutWeek(date, -1))} className="rounded-lg border border-border p-2 text-muted-foreground hover:text-foreground"><ChevronLeft size={16} /></button>
          <span className="min-w-36 text-center text-xs text-foreground">{dayLabel(weekDates[0])} – {dayLabel(weekDates[6])}</span>
          <button type="button" aria-label="Próxima semana" onClick={() => setWeekAnchor(date => shiftWorkoutWeek(date, 1))} className="rounded-lg border border-border p-2 text-muted-foreground hover:text-foreground"><ChevronRight size={16} /></button>
        </div>
      </header>

      {error && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</p>}
      {message && <p role="status" className="text-xs text-emerald-300">{message}</p>}

      <form onSubmit={event => void save(event)} className="grid gap-3 rounded-2xl border border-border/70 bg-background/35 p-4 md:grid-cols-2 xl:grid-cols-5">
        <h3 className="md:col-span-2 xl:col-span-5 text-sm font-semibold text-foreground">{editingId ? 'Editar preparo' : 'Novo preparo'}</h3>
        <label className="grid gap-1 text-[11px] text-muted-foreground">Dia
          <input type="date" value={selectedDate} min={weekDates[0]} max={weekDates[6]} onChange={event => setSelectedDate(event.target.value)} required className="rounded-lg border border-border bg-background px-2.5 py-2 text-xs text-foreground" />
        </label>
        <label className="grid gap-1 text-[11px] text-muted-foreground">Horário de preparo
          <input type="time" value={scheduledTime} onChange={event => setScheduledTime(event.target.value)} required className="rounded-lg border border-border bg-background px-2.5 py-2 text-xs text-foreground" />
        </label>
        <label className="grid gap-1 text-[11px] text-muted-foreground">Receita
          <select value={recipeId} onChange={event => setRecipeId(event.target.value)} required className="rounded-lg border border-border bg-background px-2.5 py-2 text-xs text-foreground">
            {recipes.map(recipe => <option key={recipe.id} value={recipe.id}>{recipe.name}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-[11px] text-muted-foreground">Porções
          <input type="number" min="1" max="50" value={servings} onChange={event => setServings(Number(event.target.value))} required className="rounded-lg border border-border bg-background px-2.5 py-2 text-xs text-foreground" />
        </label>
        <label className="grid gap-1 text-[11px] text-muted-foreground">Estado
          <select value={status} onChange={event => setStatus(event.target.value as MealPrepEvent['status'])} className="rounded-lg border border-border bg-background px-2.5 py-2 text-xs text-foreground">
            <option value="planned">Planejado</option><option value="prepared">Preparado</option><option value="cancelled">Cancelado</option>
          </select>
        </label>
        <label className="grid gap-1 text-[11px] text-muted-foreground md:col-span-2 xl:col-span-4">Observação
          <input maxLength={1000} value={notes} onChange={event => setNotes(event.target.value)} placeholder="Ex.: preparar porções para congelar" className="rounded-lg border border-border bg-background px-2.5 py-2 text-xs text-foreground" />
        </label>
        <div className="flex items-end gap-2">
          <button type="submit" disabled={saving || !recipes.length} className="min-h-9 flex-1 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-50">{saving ? 'Salvando…' : editingId ? 'Salvar alterações' : 'Adicionar ao calendário'}</button>
          {editingId && <button type="button" onClick={resetForm} className="min-h-9 rounded-xl border border-border px-3 py-2 text-xs text-muted-foreground">Cancelar edição</button>}
        </div>
      </form>

      {loading ? <p className="text-xs text-muted-foreground">Carregando calendário…</p> : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {weekDates.map(date => {
            const dayEvents = events.filter(event => event.date === date);
            return (
              <article key={date} className={`min-h-32 rounded-2xl border p-3 ${date === selectedDate ? 'border-primary/50 bg-primary/[0.04]' : 'border-border/70 bg-background/35'}`}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <button type="button" onClick={() => { setSelectedDate(date); setMessage(null); }} className="text-left text-xs font-semibold capitalize text-foreground">{dayLabel(date)}</button>
                  <button type="button" onClick={() => { setSelectedDate(date); resetForm(); }} className="rounded-lg border border-border px-2 py-1 text-[10px] text-primary">+ Preparo</button>
                </div>
                {dayEvents.length === 0 ? <p className="py-2 text-[10px] text-muted-foreground">Sem preparo programado.</p> : (
                  <ul className="space-y-2">
                    {dayEvents.map(event => (
                      <li key={event.id} className="rounded-xl border border-border/70 bg-card/70 p-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[11px] font-semibold text-foreground">{event.scheduledTime} · {event.recipeName}</p>
                            <p className="mt-0.5 text-[10px] text-muted-foreground">{event.servings} porção(ões) · {statusText[event.status]}</p>
                            {event.notes && <p className="mt-1 break-words text-[10px] text-muted-foreground">{event.notes}</p>}
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <button type="button" aria-label={`Editar preparo de ${event.recipeName}`} onClick={() => edit(event)} className="rounded-md p-1.5 text-muted-foreground hover:text-foreground"><Pencil size={13} /></button>
                            <button type="button" aria-label={`Excluir preparo de ${event.recipeName}`} onClick={() => void remove(event)} className="rounded-md p-1.5 text-muted-foreground hover:text-red-300"><Trash2 size={13} /></button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
