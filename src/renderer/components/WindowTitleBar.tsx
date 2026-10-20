import React, { useCallback, useEffect, useState } from 'react';
import { Copy, Minus, Square, X } from 'lucide-react';
import appIcon from '../../../assets/santo-maromba-icon.svg';

export const WindowTitleBar: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    window.fitTrackAPI.getWindowMaximized().then(setIsMaximized).catch(error => {
      console.error('[WindowTitleBar] Não foi possível consultar a janela:', error);
    });
  }, []);

  const toggleMaximize = useCallback(async () => {
    try {
      setIsMaximized(await window.fitTrackAPI.toggleWindowMaximize());
    } catch (error) {
      console.error('[WindowTitleBar] Não foi possível redimensionar a janela:', error);
    }
  }, []);

  const performWindowAction = async (action: () => Promise<void>) => {
    try {
      await action();
    } catch (error) {
      console.error('[WindowTitleBar] Não foi possível executar a ação da janela:', error);
    }
  };

  const handleDoubleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('[data-window-control]')) return;
    void toggleMaximize();
  };

  return (
    <div
      className="window-titlebar flex h-10 shrink-0 items-center justify-between border-b border-white/[0.06] bg-[#090b0d]/95 px-3 text-zinc-300"
      onDoubleClick={handleDoubleClick}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <img src={appIcon} alt="" className="h-5 w-5 shrink-0 rounded-md" />
        <span className="truncate text-[11px] font-semibold tracking-[0.08em] text-zinc-300/90">
          SANTO MAROMBA
        </span>
        <span className="hidden rounded-full border border-emerald-300/15 bg-emerald-300/[0.07] px-2 py-0.5 text-[9px] font-medium tracking-wide text-emerald-200/80 sm:inline-flex">
          EVOLUÇÃO PESSOAL
        </span>
      </div>

      <div className="window-controls flex h-full items-center">
        <button
          type="button"
          data-window-control
          aria-label="Minimizar janela"
          title="Minimizar"
          onClick={() => void performWindowAction(() => window.fitTrackAPI.minimizeWindow())}
          className="flex h-full w-11 items-center justify-center text-zinc-400 transition-colors hover:bg-white/[0.08] hover:text-white active:bg-white/[0.12]"
        >
          <Minus className="h-3.5 w-3.5" strokeWidth={1.7} />
        </button>
        <button
          type="button"
          data-window-control
          aria-label={isMaximized ? 'Restaurar janela' : 'Maximizar janela'}
          title={isMaximized ? 'Restaurar' : 'Maximizar'}
          onClick={() => void toggleMaximize()}
          className="flex h-full w-11 items-center justify-center text-zinc-400 transition-colors hover:bg-white/[0.08] hover:text-white active:bg-white/[0.12]"
        >
          {isMaximized
            ? <Copy className="h-3 w-3" strokeWidth={1.5} />
            : <Square className="h-3 w-3" strokeWidth={1.5} />}
        </button>
        <button
          type="button"
          data-window-control
          aria-label="Fechar aplicativo"
          title="Fechar"
          onClick={() => void performWindowAction(() => window.fitTrackAPI.closeWindow())}
          className="flex h-full w-12 items-center justify-center text-zinc-400 transition-colors hover:bg-red-500 hover:text-white active:bg-red-600"
        >
          <X className="h-4 w-4" strokeWidth={1.7} />
        </button>
      </div>
    </div>
  );
};
