import React, { useState } from 'react';
import {
  Scale,
  Plus,
  Trash2,
  Calendar,
  Search,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';
import { WeightAnalyticsPoint, WeightRecord } from '../../shared/types';

interface WeightHistoryViewProps {
  records: WeightRecord[];
  analytics: WeightAnalyticsPoint[];
  onOpenWeightModal: () => void;
  onDeleteRecord: (id: string) => Promise<void>;
}

export const WeightHistoryView: React.FC<WeightHistoryViewProps> = ({
  records,
  analytics,
  onOpenWeightModal,
  onDeleteRecord
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'verified' | 'self_reported'>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Map analytics for fast moving average lookup by date
  const maMap = React.useMemo(() => {
    const map = new Map<string, number | null>();
    for (const a of analytics) {
      map.set(a.date, a.movingAverage7d);
    }
    return map;
  }, [analytics]);

  // Sort records newest first for table display
  const sortedRecords = React.useMemo(() => {
    return [...records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [records]);

  const filteredRecords = React.useMemo(() => {
    return sortedRecords.filter(r => {
      const matchSearch =
        r.date.includes(searchTerm) || (r.notes && r.notes.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchSource = sourceFilter === 'all' || r.source === sourceFilter;
      return matchSearch && matchSource;
    });
  }, [sortedRecords, searchTerm, sourceFilter]);

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza de que deseja excluir este registro de peso?')) {
      setDeletingId(id);
      try {
        await onDeleteRecord(id);
      } finally {
        setDeletingId(null);
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">
            Histórico de Pesagens Corporais
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Todos os registros persistidos localmente no banco de dados SQLite com cálculo de média móvel
          </p>
        </div>

        <button
          onClick={onOpenWeightModal}
          className="flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary-hover active:scale-95 transition-all self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Registrar Nova Pesagem</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="Buscar por data ou anotação..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-border bg-secondary/50 py-2 pl-9 pr-3.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'verified', label: 'Balança (Verificados)' },
            { id: 'self_reported', label: 'Relatos Anteriores' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setSourceFilter(f.id as any)}
              className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                sourceFilter === f.id
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-secondary/30 text-muted-foreground hover:border-border/80'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Records Table */}
      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-secondary/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3.5">Data</th>
                <th className="px-5 py-3.5">Peso</th>
                <th className="px-5 py-3.5">Média Móvel (7d)</th>
                <th className="px-5 py-3.5">Origem</th>
                <th className="px-5 py-3.5">Observações</th>
                <th className="px-5 py-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">
                    <Scale className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
                    <span>Nenhum registro encontrado com os filtros aplicados.</span>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec, idx) => {
                  const ma = maMap.get(rec.date);
                  // Delta compared to next older record
                  const olderRec = sortedRecords[idx + 1];
                  const delta = olderRec ? Number((rec.weightKg - olderRec.weightKg).toFixed(1)) : null;

                  return (
                    <tr key={rec.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-5 py-3.5 font-semibold text-foreground flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{rec.date}</span>
                      </td>

                      <td className="px-5 py-3.5 font-display text-sm font-bold text-foreground">
                        <div className="flex items-center gap-2">
                          <span>{rec.weightKg.toFixed(1)} kg</span>
                          {delta !== null && (
                            <span
                              className={`flex items-center text-[10px] font-semibold ${
                                delta > 0
                                  ? 'text-emerald-400'
                                  : delta < 0
                                  ? 'text-blue-400'
                                  : 'text-muted-foreground'
                              }`}
                            >
                              {delta > 0 ? (
                                <ArrowUpRight className="h-3 w-3" />
                              ) : delta < 0 ? (
                                <ArrowDownRight className="h-3 w-3" />
                              ) : (
                                <Minus className="h-3 w-3" />
                              )}
                              {delta > 0 ? `+${delta}` : delta}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-3.5 font-medium text-emerald-400">
                        {ma ? `${ma.toFixed(1)} kg` : '--'}
                      </td>

                      <td className="px-5 py-3.5">
                        {rec.source === 'verified' ? (
                          <span className="inline-flex items-center gap-1 rounded-md border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-400">
                            <CheckCircle className="h-3 w-3" />
                            Verificado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
                            <Clock className="h-3 w-3" />
                            Relato Anterior
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-muted-foreground max-w-xs truncate">
                        {rec.notes || '—'}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => handleDelete(rec.id)}
                          disabled={deletingId === rec.id}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-40"
                          title="Excluir pesagem"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
