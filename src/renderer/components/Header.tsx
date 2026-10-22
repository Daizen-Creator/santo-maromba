import React from 'react';
import { Plus, History, Scale, Calendar } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onOpenWeightModal: () => void;
  onOpenHistoryModal: () => void;
  initialHistoryConfirmed: boolean;
  currentWeightKg?: number | null;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onOpenWeightModal,
  onOpenHistoryModal,
  initialHistoryConfirmed,
  currentWeightKg
}) => {
  const todayStr = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(new Date());

  return (
    <header className="sticky top-0 z-10 flex min-h-16 w-full shrink-0 items-center justify-between border-b border-border bg-background/80 px-4 py-2 backdrop-blur-md sm:px-6">
      <div>
        <h1 className="font-display text-base font-bold text-foreground tracking-tight sm:text-xl">
          {title}
        </h1>
        {subtitle && (
          <p className="hidden text-xs text-muted-foreground sm:block">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Date display */}
        <div className="hidden items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground md:flex">
          <Calendar className="h-3.5 w-3.5 text-primary" />
          <span className="capitalize">{todayStr}</span>
        </div>

        {/* Current Weight Pill */}
        {currentWeightKg !== null && currentWeightKg !== undefined && (
          <div className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground">
            <Scale className="h-3.5 w-3.5 text-primary" />
            <span>{currentWeightKg.toFixed(1)} kg</span>
          </div>
        )}

        {/* Initial History Alert Button */}
        {!initialHistoryConfirmed && (
          <button
            onClick={onOpenHistoryModal}
            className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-500 hover:bg-amber-500/20 transition-all animate-pulse"
            title="Confirmar dados históricos relatados"
          >
            <History className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Confirmar Relato Inicial</span>
          </button>
        )}

        {/* Fast Weigh-in Button */}
        <button
          onClick={onOpenWeightModal}
          className="flex items-center gap-2 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/30 hover:bg-primary-hover active:scale-95 transition-all"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Registrar Peso</span>
        </button>
      </div>
    </header>
  );
};
