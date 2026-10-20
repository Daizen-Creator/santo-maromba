import React, { useEffect, useState } from 'react';
import { X, History, AlertTriangle, ShieldCheck } from 'lucide-react';

interface InitialHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: {
    confirmedHeightCm: number;
    confirmedBirthDate: string;
    eggLimitAccepted: boolean;
    targetWeightKg: number;
  }) => Promise<void>;
  defaultHeightCm?: number;
  defaultBirthDate?: string;
  defaultTargetWeightKg?: number;
}

export const InitialHistoryModal: React.FC<InitialHistoryModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  defaultHeightCm,
  defaultBirthDate,
  defaultTargetWeightKg
}) => {
  const [heightCm, setHeightCm] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [targetWeightKg, setTargetWeightKg] = useState('');
  const [eggLimitAccepted, setEggLimitAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setHeightCm(defaultHeightCm ? String(defaultHeightCm) : '');
    setBirthDate(defaultBirthDate || '');
    setTargetWeightKg(defaultTargetWeightKg ? String(defaultTargetWeightKg) : '');
    setEggLimitAccepted(false);
    setError(null);
  }, [isOpen, defaultHeightCm, defaultBirthDate, defaultTargetWeightKg]);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onConfirm({
        confirmedHeightCm: Number(heightCm),
        confirmedBirthDate: birthDate,
        targetWeightKg: Number(targetWeightKg),
        eggLimitAccepted
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Falha ao salvar seus dados.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-start justify-between border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <History className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-foreground">Confirme seus dados</h2>
              <p className="text-xs text-muted-foreground">Confira as informações que serão usadas nos cálculos.</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-6">
          <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4 text-xs text-amber-200/90 leading-relaxed space-y-2">
            <div className="flex items-center gap-2 font-semibold text-amber-400">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span>Seus registros continuam vazios até você adicioná-los</span>
            </div>
            <p>O aplicativo não cria pesagens, medidas, fotos ou histórico de treino por conta própria. Só os valores que você confirmar entram nos cálculos.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground" htmlFor="confirmed-height">Altura atual (cm)</label>
              <input
                id="confirmed-height"
                type="number"
                min="100"
                max="250"
                step="0.1"
                value={heightCm}
                onChange={event => setHeightCm(event.target.value)}
                className="w-full rounded-xl border border-border bg-secondary/50 px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground" htmlFor="confirmed-birth-date">Data de nascimento</label>
              <input
                id="confirmed-birth-date"
                type="date"
                value={birthDate}
                onChange={event => setBirthDate(event.target.value)}
                className="w-full rounded-xl border border-border bg-secondary/50 px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                required
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground" htmlFor="confirmed-target-weight">Meta pessoal de peso (kg)</label>
              <input
                id="confirmed-target-weight"
                type="number"
                min="40"
                max="200"
                step="0.5"
                value={targetWeightKg}
                onChange={event => setTargetWeightKg(event.target.value)}
                className="w-full rounded-xl border border-border bg-secondary/50 px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                required
              />
            </div>
          </div>

          <label className="flex items-start gap-3 rounded-2xl border border-border bg-secondary/30 p-4 text-xs text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={eggLimitAccepted}
              onChange={event => setEggLimitAccepted(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            <span>
              <strong className="block">Tenho uma restrição de aproximadamente 2 ovos por dia</strong>
              <span className="mt-1 block text-muted-foreground">Marque somente se essa restrição se aplica a você.</span>
            </span>
          </label>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button type="button" onClick={onClose} disabled={loading} className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="rounded-xl bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary-hover disabled:opacity-50">
              {loading ? 'Salvando...' : 'Confirmar dados'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
