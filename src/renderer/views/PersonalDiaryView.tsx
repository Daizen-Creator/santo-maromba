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

function summarizeDiaryEntry(entry: PersonalDiaryEntry): string {
  return [
    entry.note,
    entry.sleepHours !== undefined ? `Sono ${entry.sleepHours} h` : '',
    entry.energyLevel !== undefined ? `Energia ${entry.energyLevel}/5` : '',
    entry.symptoms ? `Como se sentiu: ${entry.symptoms}` : ''
  ].filter(Boolean).join(' · ');
}

export const PersonalDiaryView: React.FC<PersonalDiaryViewProps> = ({ onGetEntries, onSaveEntry, onDeleteEntry }) => {
  const [selectedDate, setSelectedDate] = useState(() => localDateString(new Date()));
  const [entries, setEntries] = useState<PersonalDiaryEntry[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [wellnessDrafts, setWellnessDrafts] = useState<Record<string, { sleepHours: string; energyLevel: string; symptoms: string }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const selectedEntry = entries.find(entry => entry.date === selectedDate);
  const note = drafts[selectedDate] ?? selectedEntry?.note ?? '';
  const wellness = wellnessDrafts[selectedDate] ?? {
    sleepHours: selectedEntry?.sleepHours?.toString() ?? '',
    energyLevel: selectedEntry?.energyLevel?.toString() ?? '',
    symptoms: selectedEntry?.symptoms ?? ''
  };
  const sleepHours = wellness.sleepHours.trim() ? Number(wellness.sleepHours) : undefined;
  const energyLevel = wellness.energyLevel ? Number(wellness.energyLevel) : undefined;
  const symptoms = wellness.symptoms.trim();
  const hasRecordedData = Boolean(note.trim() || sleepHours !== undefined || energyLevel !== undefined || symptoms);
  const hasChanges = !selectedEntry || note !== selectedEntry.note
    || sleepHours !== selectedEntry.sleepHours || energyLevel !== selectedEntry.energyLevel
    || symptoms !== (selectedEntry.symptoms || '');
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
    if (!hasRecordedData || !hasChanges) return;
    setSaving(true);
    setError(null);
    setStatus(null);
    try {
      const saved = await onSaveEntry({ date: selectedDate, note: note.trim(), sleepHours, energyLevel, symptoms });
      setEntries(current => [saved, ...current.filter(entry => entry.date !== saved.date)].sort((a, b) => b.date.localeCompare(a.date)));
      setDrafts(current => { const next = { ...current }; delete next[selectedDate]; return next; });
      setWellnessDrafts(current => { const next = { ...current }; delete next[selectedDate]; return next; });
      setStatus('Registro do dia salvo neste dispositivo.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar a anotação.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!selectedEntry || !window.confirm(`Excluir o registro do dia ${formatDiaryDate(selectedDate)}?`)) return;
    setError(null);
    setStatus(null);
    try {
      await onDeleteEntry(selectedDate);
      setEntries(current => current.filter(entry => entry.date !== selectedDate));
      setDrafts(current => { const next = { ...current }; delete next[selectedDate]; return next; });
      setWellnessDrafts(current => { const next = { ...current }; delete next[selectedDate]; return next; });
      setStatus('Registro do dia excluído.');
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
              Registre sono, energia, sintomas e anotações por data. Esses dados ficam salvos localmente neste dispositivo.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.8fr)]">
          <div className="space-y-3">
            <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> Data do registro</span>
              <input type="date" value={selectedDate} onChange={event => { if (event.target.value) setSelectedDate(event.target.value); setStatus(null); }} className="block w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground" />
            </label>
            <p className="text-xs capitalize text-foreground">{formatDiaryDate(selectedDate)}</p>
            <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
              Observações
              <textarea
                value={note}
                maxLength={3000}
                rows={5}
                placeholder="Como foi seu treino, sua disposição, descanso ou rotina hoje?"
                onChange={event => { setDrafts(current => ({ ...current, [selectedDate]: event.target.value })); setStatus(null); }}
                className="block w-full resize-y rounded-2xl border border-border bg-background px-3.5 py-3 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
              />
              <span className="block text-right text-[10px]">{note.length}/3000</span>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
                Horas de sono
                <input type="number" min="0" max="24" step="0.25" inputMode="decimal" value={wellness.sleepHours}
                  onChange={event => { setWellnessDrafts(current => ({ ...current, [selectedDate]: { ...wellness, sleepHours: event.target.value } })); setStatus(null); }}
                  placeholder="Ex.: 7,5" className="block w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground" />
              </label>
              <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
                Energia (1 a 5)
                <select value={wellness.energyLevel}
                  onChange={event => { setWellnessDrafts(current => ({ ...current, [selectedDate]: { ...wellness, energyLevel: event.target.value } })); setStatus(null); }}
                  className="block w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground">
                  <option value="">Sem registro</option>
                  <option value="1">1 · Muito baixa</option>
                  <option value="2">2 · Baixa</option>
                  <option value="3">3 · Moderada</option>
                  <option value="4">4 · Boa</option>
                  <option value="5">5 · Muito boa</option>
                </select>
              </label>
            </div>
            <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
              Sintomas ou como está se sentindo
              <textarea value={wellness.symptoms} maxLength={500} rows={2}
                onChange={event => { setWellnessDrafts(current => ({ ...current, [selectedDate]: { ...wellness, symptoms: event.target.value } })); setStatus(null); }}
                placeholder="Opcional. O Santo Maromba registra o relato, sem fornecer diagnóstico."
                className="block w-full resize-y rounded-xl border border-border bg-background px-3.5 py-3 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none" />
              <span className="block text-right text-[10px]">{wellness.symptoms.length}/500</span>
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => void save()} disabled={saving || !hasRecordedData || !hasChanges} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50">
                <Save className="h-3.5 w-3.5" />{saving ? 'Salvando…' : 'Salvar registro do dia'}
              </button>
              {selectedEntry && (
                <button type="button" onClick={() => void remove()} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-red-500/25 px-4 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/10">
                  <Trash2 className="h-3.5 w-3.5" />Excluir registro
                </button>
              )}
            </div>
            {status && <p role="status" className="text-xs text-emerald-300">{status}</p>}
            {error && <p role="alert" className="text-xs text-red-300">{error}</p>}
          </div>

          <aside className="rounded-2xl border border-border/70 bg-background/35 p-4" aria-label="Registros deste mês">
            <h3 className="text-sm font-semibold text-foreground">Neste mês</h3>
            <p className="mt-1 text-[10px] text-muted-foreground">Selecione uma data para consultar ou editar a anotação.</p>
            {loading ? <p className="mt-4 text-xs text-muted-foreground">Carregando diário…</p>
              : entries.length === 0 ? <p className="mt-4 text-xs text-muted-foreground">Ainda não há anotações neste mês.</p>
                : <ul className="mt-3 space-y-2">
                  {entries.map(entry => (
                    <li key={entry.id}>
                      <button type="button" onClick={() => { setSelectedDate(entry.date); setStatus(null); }} aria-current={entry.date === selectedDate ? 'date' : undefined} className={`w-full rounded-xl border px-3 py-2.5 text-left transition-colors ${entry.date === selectedDate ? 'border-primary/35 bg-primary/10' : 'border-border/70 bg-card/50 hover:border-primary/25'}`}>
                        <span className="block text-[10px] font-semibold capitalize text-foreground">{formatDiaryDate(entry.date)}</span>
                        <span className="mt-1 line-clamp-2 block text-[10px] leading-relaxed text-muted-foreground">{summarizeDiaryEntry(entry)}</span>
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
