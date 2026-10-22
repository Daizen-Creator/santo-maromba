import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, CalendarDays, Save, Trash2 } from 'lucide-react';
import { PersonalDiaryDateRange, PersonalDiaryEntry, SavePersonalDiaryEntryInput } from '../../shared/types';

interface PersonalDiaryViewProps {
  onGetEntries: (range: PersonalDiaryDateRange) => Promise<PersonalDiaryEntry[]>;
  onSaveEntry: (input: SavePersonalDiaryEntryInput) => Promise<PersonalDiaryEntry>;
  onDeleteEntry: (date: string) => Promise<boolean>;
}

const localDateString = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

function getMonthRange(dateValue: string): PersonalDiaryDateRange {
  const [year, month] = dateValue.split('-').map(Number);
  return {
    fromDate: `${year}-${String(month).padStart(2, '0')}-01`,
    toDate: localDateString(new Date(year, month, 0))
  };
}

function formatDiaryDate(dateValue: string): string {
  return new Date(`${dateValue}T12:00:00`).toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
}

export const PersonalDiaryView: React.FC<PersonalDiaryViewProps> = ({ onGetEntries, onSaveEntry, onDeleteEntry }) => {
  const [selectedDate, setSelectedDate] = useState(() => localDateString(new Date()));
  const [entries, setEntries] = useState<PersonalDiaryEntry[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const selectedEntry = entries.find(entry => entry.date === selectedDate);
  const note = drafts[selectedDate] ?? selectedEntry?.note ?? '';
  const monthRange = useMemo(() => getMonthRange(selectedDate), [selectedDate]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setEntries([]);
    onGetEntries(monthRange)
      .then(result => { if (active) setEntries(result); })
      .catch(cause => {
        if (active) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar o diário.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [monthRange, onGetEntries]);

  const save = async () => {
    if (!note.trim()) return;
    setSaving(true);
    setError(null);
    setStatus(null);
    try {
      const saved = await onSaveEntry({ date: selectedDate, note });
      setEntries(current => [saved, ...current.filter(entry => entry.date !== saved.date)].sort((a, b) => b.date.localeCompare(a.date)));
      setDrafts(current => { const next = { ...current }; delete next[selectedDate]; return next; });
      setStatus('Anotação salva neste dispositivo.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar a anotação.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!selectedEntry || !window.confirm(`Excluir a anotação de ${formatDiaryDate(selectedDate)}?`)) return;
    setError(null);
    setStatus(null);
    try {
      await onDeleteEntry(selectedDate);
      setEntries(current => current.filter(entry => entry.date !== selectedDate));
      setDrafts(current => { const next = { ...current }; delete next[selectedDate]; return next; });
      setStatus('Anotação excluída.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível excluir a anotação.');
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6" aria-label="Diário pessoal">
      <section className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
            <BookOpen className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-display text-lg font-bold text-foreground">Diário pessoal</h2>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
              Registre como foi sua rotina e seu treino. As anotações ficam salvas localmente, sem envio para servidores externos.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.8fr)]">
          <div className="space-y-3">
            <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> Data da anotação</span>
              <input type="date" value={selectedDate} onChange={event => { if (event.target.value) setSelectedDate(event.target.value); setStatus(null); }} className="block w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground" />
            </label>
            <p className="text-xs capitalize text-foreground">{formatDiaryDate(selectedDate)}</p>
            <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
              Observações
              <textarea
                value={note}
                maxLength={3000}
                rows={9}
                placeholder="Como foi seu treino, sua disposição, descanso ou rotina hoje?"
                onChange={event => { setDrafts(current => ({ ...current, [selectedDate]: event.target.value })); setStatus(null); }}
                className="block w-full resize-y rounded-2xl border border-border bg-background px-3.5 py-3 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
              />
              <span className="block text-right text-[10px]">{note.length}/3000</span>
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => void save()} disabled={saving || !note.trim() || note === selectedEntry?.note} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50">
                <Save className="h-3.5 w-3.5" />{saving ? 'Salvando…' : 'Salvar anotação'}
              </button>
              {selectedEntry && (
                <button type="button" onClick={() => void remove()} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-red-500/25 px-4 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/10">
                  <Trash2 className="h-3.5 w-3.5" />Excluir
                </button>
              )}
            </div>
            {status && <p role="status" className="text-xs text-emerald-300">{status}</p>}
            {error && <p role="alert" className="text-xs text-red-300">{error}</p>}
          </div>

          <aside className="rounded-2xl border border-border/70 bg-background/35 p-4" aria-label="Anotações deste mês">
            <h3 className="text-sm font-semibold text-foreground">Neste mês</h3>
            <p className="mt-1 text-[10px] text-muted-foreground">Selecione uma data para consultar ou editar a anotação.</p>
            {loading ? <p className="mt-4 text-xs text-muted-foreground">Carregando diário…</p>
              : entries.length === 0 ? <p className="mt-4 text-xs text-muted-foreground">Ainda não há anotações neste mês.</p>
                : <ul className="mt-3 space-y-2">
                  {entries.map(entry => (
                    <li key={entry.id}>
                      <button type="button" onClick={() => { setSelectedDate(entry.date); setStatus(null); }} aria-current={entry.date === selectedDate ? 'date' : undefined} className={`w-full rounded-xl border px-3 py-2.5 text-left transition-colors ${entry.date === selectedDate ? 'border-primary/35 bg-primary/10' : 'border-border/70 bg-card/50 hover:border-primary/25'}`}>
                        <span className="block text-[10px] font-semibold capitalize text-foreground">{formatDiaryDate(entry.date)}</span>
                        <span className="mt-1 line-clamp-2 block text-[10px] leading-relaxed text-muted-foreground">{entry.note}</span>
                      </button>
                    </li>
                  ))}
                </ul>}
          </aside>
        </div>
      </section>
    </div>
  );
};
