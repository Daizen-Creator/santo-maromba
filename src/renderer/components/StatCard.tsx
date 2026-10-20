import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export type DataOrigin = 'registrado' | 'calculado' | 'estimado';

interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: LucideIcon;
  subtitle?: string;
  delta?: number | null;
  deltaSuffix?: string;
  origin?: DataOrigin;
  highlight?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  unit,
  icon: Icon,
  subtitle,
  delta,
  deltaSuffix = 'kg',
  origin = 'calculado',
  highlight = false
}) => {
  const originBadges: Record<DataOrigin, { label: string; className: string }> = {
    registrado: {
      label: 'Registrado',
      className: 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    },
    calculado: {
      label: 'Calculado',
      className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    },
    estimado: {
      label: 'Estimado',
      className: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    }
  };

  const badge = originBadges[origin];

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-card p-5 transition-all duration-200 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 ${
        highlight ? 'border-primary/30 ring-1 ring-primary/20' : 'border-border'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <span className="text-xs font-semibold text-muted-foreground">{title}</span>
        </div>

        <span
          className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${badge.className}`}
        >
          {badge.label}
        </span>
      </div>

      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="font-display text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          {value}
        </span>
        {unit && <span className="text-xs font-semibold text-muted-foreground">{unit}</span>}
      </div>

      {(subtitle || delta !== undefined) && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          {delta !== undefined && delta !== null && (
            <div
              className={`flex items-center gap-0.5 font-semibold ${
                delta > 0
                  ? 'text-emerald-400'
                  : delta < 0
                  ? 'text-blue-400'
                  : 'text-muted-foreground'
              }`}
            >
              {delta > 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : delta < 0 ? (
                <TrendingDown className="h-3 w-3" />
              ) : (
                <Minus className="h-3 w-3" />
              )}
              <span>
                {delta > 0 ? `+${delta}` : delta} {deltaSuffix}
              </span>
            </div>
          )}
          {subtitle && <span>{subtitle}</span>}
        </div>
      )}
    </div>
  );
};
