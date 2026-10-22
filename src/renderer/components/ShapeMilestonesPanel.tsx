import React, { FormEvent, useEffect, useState } from 'react';
import { Flag, Pencil, Trash2 } from 'lucide-react';
import { BodyMeasurementRecord, ShapeMilestone, ShapeMilestoneInput, ShapeMilestoneMetric } from '../../shared/types';
import { getShapeMilestoneProgress } from '../../domain/shape-milestones';

interface MetricOption { key: ShapeMilestoneMetric; label: string; unit: string; defaultDirection: 'increase' | 'decrease' }
const METRICS: MetricOption[] = [
  { key: 'weightKg', label: 'Peso', unit: 'kg', defaultDirection: 'decrease' },
  { key: 'bodyFatPct', label: 'Gordura corporal', unit: '%', defaultDirection: 'decrease' },
  { key: 'waistCircCm', label: 'Cintura', unit: 'cm', defaultDirection: 'decrease' },
  { key: 'armFlexedCm', label: 'Braço contraído', unit: 'cm', defaultDirection: 'increase' },
  { key: 'chestCm', label: 'Peitoral', unit: 'cm', defaultDirection: 'increase' },
  { key: 'shoulderCircCm', label: 'Ombros', unit: 'cm', defaultDirection: 'increase' },
  { key: 'thighCm', label: 'Coxa', unit: 'cm', defaultDirection: 'increase' },
  { key: 'hipCm', label: 'Quadril', unit: 'cm', defaultDirection: 'decrease' },
  { key: 'calfCm', label: 'Panturrilha', unit: 'cm', defaultDirection: 'increase' }
];

interface ShapeMilestonesPanelProps {
  measurements: BodyMeasurementRecord[];
  onGet: () => Promise<ShapeMilestone[]>;
  onSave: (input: ShapeMilestoneInput) => Promise<ShapeMilestone>;
  onDelete: (id: string) => Promise<void>;
}

export const ShapeMilestonesPanel: React.FC<ShapeMilestonesPanelProps> = ({ measurements, onGet, onSave, onDelete }) => {
  const [milestones, setMilestones] = useState<ShapeMilestone[]>([]);
  const [metric, setMetric] = useState<ShapeMilestoneMetric>('waistCircCm');
  const [title, setTitle] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [direction, setDirection] = useState<'increase' | 'decrease'>('decrease');
  const [targetDate, setTargetDate] = useState('');
  const [notes, setNotes] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const metricOption = METRICS.find(option => option.key === metric)!;

  useEffect(() => {
    let active = true;
    onGet().then(items => { if (active) { setMilestones(items); setError(null); } })
      .catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os marcos.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [onGet]);

  const clearForm = () => {
    setEditingId(null); setTitle(''); setTargetValue(''); setDirection(metricOption.defaultDirection);
    setTargetDate(''); setNotes(''); setMessage(null);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true); setError(null); setMessage(null);
    try {
      const saved = await onSave({
        id: editingId || undefined, title, metric, targetValue: Number(targetValue), direction,
        targetDate: targetDate || undefined, notes: notes.trim() || undefined
      });
      setMilestones(current => [...current.filter(item => item.id !== saved.id), saved]
        .sort((a, b) => (a.targetDate || '9999-12-31').localeCompare(b.targetDate || '9999-12-31')));
      clearForm();
      setMessage(editingId ? 'Marco atualizado.' : 'Marco salvo. O progresso usa somente medições registradas.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar o marco.');
    } finally { setSaving(false); }
  };

  const remove = async (item: ShapeMilestone) => {
    if (!window.confirm(`Excluir o marco “${item.title}”?`)) return;
    setError(null); setMessage(null);
    try {
      await onDelete(item.id);
      setMilestones(current => current.filter(entry => entry.id !== item.id));
      if (editingId === item.id) clearForm();
      setMessage('Marco removido.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível excluir o marco.'); }
  };

  return (
    <section className="space-y-5 rounded-3xl border border-border bg-card p-5 shadow-sm" aria-label="Marcos de evolução física">
      <header className="flex items-start gap-3 border-b border-border pb-4">
        <span className="rounded-xl border border-primary/20 bg-primary/10 p-2 text-primary"><Flag size={17} /></span>
        <div><h2 className="text-base font-bold text-foreground">Marcos de evolução</h2>
          <p className="mt-1 text-xs text-muted-foreground">Defina uma meta mensurável e acompanhe o valor mais recente salvo no histórico corporal.</p></div>
      </header>

      {error && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</p>}
      {message && <p role="status" className="text-xs text-emerald-300">{message}</p>}

      <form onSubmit={event => void submit(event)} className="grid gap-3 rounded-2xl border border-border/70 bg-background/35 p-4 md:grid-cols-2 xl:grid-cols-3">
        <h3 className="md:col-span-2 xl:col-span-3 text-sm font-semibold text-foreground">{editingId ? 'Editar marco' : 'Novo marco'}</h3>
        <label className="grid gap-1 text-[11px] text-muted-foreground">Nome do marco
          <input required maxLength={100} value={title} onChange={event => setTitle(event.target.value)} placeholder="Ex.: reduzir medida da cintura" className="rounded-lg border border-border bg-background px-2.5 py-2 text-xs text-foreground" />
        </label>
        <label className="grid gap-1 text-[11px] text-muted-foreground">Medida
          <select value={metric} onChange={event => { const next = event.target.value as ShapeMilestoneMetric; setMetric(next); setDirection(METRICS.find(option => option.key === next)!.defaultDirection); }} className="rounded-lg border border-border bg-background px-2.5 py-2 text-xs text-foreground">
            {METRICS.map(option => <option key={option.key} value={option.key}>{option.label} ({option.unit})</option>)}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="grid gap-1 text-[11px] text-muted-foreground">Meta ({metricOption.unit})
            <input required type="number" min="0.1" max="10000" step={metric === 'bodyFatPct' ? '0.1' : '0.1'} value={targetValue} onChange={event => setTargetValue(event.target.value)} className="rounded-lg border border-border bg-background px-2.5 py-2 text-xs text-foreground" />
          </label>
          <label className="grid gap-1 text-[11px] text-muted-foreground">Direção
            <select value={direction} onChange={event => setDirection(event.target.value as 'increase' | 'decrease')} className="rounded-lg border border-border bg-background px-2.5 py-2 text-xs text-foreground">
              <option value="decrease">Reduzir</option><option value="increase">Aumentar</option>
            </select>
          </label>
        </div>
        <label className="grid gap-1 text-[11px] text-muted-foreground">Data-alvo (opcional)
          <input type="date" value={targetDate} onChange={event => setTargetDate(event.target.value)} className="rounded-lg border border-border bg-background px-2.5 py-2 text-xs text-foreground" />
        </label>
        <label className="grid gap-1 text-[11px] text-muted-foreground md:col-span-2">Observação
          <input maxLength={1000} value={notes} onChange={event => setNotes(event.target.value)} placeholder="Contexto pessoal para esta meta" className="rounded-lg border border-border bg-background px-2.5 py-2 text-xs text-foreground" />
        </label>
        <div className="flex items-end gap-2 xl:col-span-3">
          <button type="submit" disabled={saving} className="min-h-9 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50">{saving ? 'Salvando…' : editingId ? 'Salvar alterações' : 'Salvar marco'}</button>
          {editingId && <button type="button" onClick={clearForm} className="min-h-9 rounded-xl border border-border px-4 py-2 text-xs text-muted-foreground">Cancelar edição</button>}
        </div>
      </form>

      {loading ? <p className="text-xs text-muted-foreground">Carregando marcos…</p> : milestones.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-xs text-muted-foreground">Nenhum marco cadastrado. Seus dados corporais não são preenchidos por estimativas.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {milestones.map(item => {
            const option = METRICS.find(candidate => candidate.key === item.metric)!;
            const progress = getShapeMilestoneProgress(item, measurements);
            const current = progress.currentValue;
            return <article key={item.id} className="rounded-2xl border border-border bg-background/35 p-4">
              <div className="flex items-start justify-between gap-3">
                <div><h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-1 text-[10px] text-muted-foreground">{option.label} · meta para {item.direction === 'increase' ? 'aumentar' : 'reduzir'}{item.targetDate ? ` até ${new Date(`${item.targetDate}T12:00:00`).toLocaleDateString('pt-BR')}` : ''}</p></div>
                <div className="flex shrink-0 gap-1">
                  <button type="button" aria-label={`Editar marco ${item.title}`} onClick={() => { setEditingId(item.id); setTitle(item.title); setMetric(item.metric); setTargetValue(String(item.targetValue)); setDirection(item.direction); setTargetDate(item.targetDate || ''); setNotes(item.notes || ''); setMessage(null); setError(null); }} className="rounded-md p-1.5 text-muted-foreground hover:text-foreground"><Pencil size={13} /></button>
                  <button type="button" aria-label={`Excluir marco ${item.title}`} onClick={() => void remove(item)} className="rounded-md p-1.5 text-muted-foreground hover:text-red-300"><Trash2 size={13} /></button>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-border/70 p-2.5"><p className="text-[10px] text-muted-foreground">Atual · histórico</p><p className="mt-1 text-base font-semibold text-foreground">{current === undefined ? 'Sem medição' : `${current.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${option.unit}`}</p></div>
                <div className="rounded-xl border border-border/70 p-2.5"><p className="text-[10px] text-muted-foreground">Meta</p><p className="mt-1 text-base font-semibold text-foreground">{item.targetValue.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} {option.unit}</p></div>
              </div>
              <p className={`mt-3 rounded-lg px-2.5 py-2 text-[10px] ${progress.reached ? 'bg-emerald-500/10 text-emerald-200' : 'bg-secondary/60 text-muted-foreground'}`}>
                {current === undefined ? 'Registre esta medida para acompanhar o marco.' : progress.reached ? 'Marco atingido conforme a medição mais recente.' : `${progress.distanceToTarget!.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${option.unit} para a meta.`}
              </p>
              {item.notes && <p className="mt-2 text-[10px] text-muted-foreground">{item.notes}</p>}
            </article>;
          })}
        </div>
      )}
    </section>
  );
};
