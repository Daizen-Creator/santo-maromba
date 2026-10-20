import React, { useState } from 'react';
import { X, Scale, Plus } from 'lucide-react';

interface WeightModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: { date: string; weightKg: number; notes?: string; source: 'verified' | 'self_reported' }) => Promise<void>;
  initialDate?: string;
  initialWeight?: number;
}

export const WeightModal: React.FC<WeightModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialDate,
  initialWeight
}) => {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState<string>(initialDate || today);
  const [weightKg, setWeightKg] = useState<string>(initialWeight ? String(initialWeight) : '');
  const [source, setSource] = useState<'verified' | 'self_reported'>('verified');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(weightKg);
    if (isNaN(num) || num <= 30 || num >= 350) {
      setError('Por favor, informe um peso válido entre 30 kg e 350 kg.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onSave({
        date,
        weightKg: Number(num.toFixed(1)),
        notes: notes.trim() || undefined,
        source
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao registrar peso.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-foreground">
                Registrar Pesagem
              </h2>
              <p className="text-xs text-muted-foreground">
                Atualize seu peso para recalibrar a média móvel e TMB.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Data da Pesagem</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full rounded-xl border border-border bg-secondary/50 px-3.5 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Peso Corporal (kg)</label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                min="30"
                max="350"
                placeholder="Ex: 72.8"
                value={weightKg}
                onChange={e => setWeightKg(e.target.value)}
                className="w-full rounded-xl border border-border bg-secondary/50 px-3.5 py-2.5 text-sm font-semibold text-foreground focus:border-primary focus:outline-none"
                autoFocus
                required
              />
              <span className="absolute right-3.5 top-2.5 text-xs font-bold text-muted-foreground">
                kg
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Origem do Registro</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSource('verified')}
                className={`rounded-xl border p-2.5 text-xs font-semibold transition-all ${
                  source === 'verified'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-secondary/30 text-muted-foreground'
                }`}
              >
                Medição na Balança
              </button>
              <button
                type="button"
                onClick={() => setSource('self_reported')}
                className={`rounded-xl border p-2.5 text-xs font-semibold transition-all ${
                  source === 'self_reported'
                    ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                    : 'border-border bg-secondary/30 text-muted-foreground'
                }`}
              >
                Relato Anterior
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">
              Observações (opcional)
            </label>
            <input
              type="text"
              placeholder="Ex: Em jejum ao acordar, pós-treino, etc."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full rounded-xl border border-border bg-secondary/50 px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary-hover active:scale-95 transition-all disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              <span>{loading ? 'Salvando...' : 'Salvar Registro'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
