import React, { useEffect, useState } from 'react';
import { Activity, Download, RefreshCw } from 'lucide-react';
import { AppUpdateStatus } from '../../shared/types';

const initialStatus: AppUpdateStatus = {
  state: 'checking',
  message: 'Verificando atualizações...'
};

const formatBytes = (value = 0): string => {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

export const UpdaterSplash: React.FC = () => {
  const [status, setStatus] = useState(initialStatus);

  useEffect(() => window.fitTrackAPI.onUpdateStatus(setStatus), []);

  const progress = Math.max(0, Math.min(100, status.percent ?? 0));
  const isDownloading = status.state === 'downloading';

  return (
    <main className="flex h-screen w-screen items-center justify-center bg-transparent p-5 text-zinc-100">
      <section className="w-full max-w-md overflow-hidden rounded-[28px] border border-white/10 bg-zinc-950/95 p-7 shadow-2xl shadow-black/50 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-300/10 text-emerald-200">
            {isDownloading ? <Download className="h-5 w-5" /> : <Activity className="h-5 w-5 animate-pulse" />}
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">Santo Maromba</p>
            <h1 className="mt-1 text-base font-semibold tracking-tight">Atualização do aplicativo</h1>
          </div>
        </div>

        <p className="mt-7 text-sm text-zinc-300">{status.message}</p>
        {status.version && <p className="mt-1 text-xs text-zinc-500">Versão {status.version}</p>}

        <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          {isDownloading ? (
            <div className="h-full rounded-full bg-emerald-300 transition-[width] duration-300 ease-out" style={{ width: `${progress}%` }} />
          ) : (
            <div className="h-full w-1/3 animate-pulse rounded-full bg-emerald-300/70" />
          )}
        </div>

        {isDownloading && (
          <div className="mt-2 flex justify-between text-[10px] tabular-nums text-zinc-500">
            <span>{progress.toFixed(0)}% · {formatBytes(status.transferred)} / {formatBytes(status.total)}</span>
            <span>{formatBytes(status.bytesPerSecond)}/s</span>
          </div>
        )}

        {status.state === 'downloaded' && (
          <div className="mt-5 flex items-center gap-2 text-xs text-emerald-200"><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Instalando e reiniciando...</div>
        )}
      </section>
    </main>
  );
};
