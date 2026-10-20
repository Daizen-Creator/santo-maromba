import { app } from 'electron';
import { autoUpdater, ProgressInfo, UpdateInfo } from 'electron-updater';
import { AppUpdateStatus } from '../shared/types';

// O app consulta este repositório público quando há conexão com a internet.
export const GITHUB_UPDATE_OWNER: string = 'Daizen-Creator';
export const GITHUB_UPDATE_REPOSITORY: string = 'santo-maromba';

export const canUseAutoUpdates = (): boolean =>
  app.isPackaged
  && process.platform === 'win32'
  && !process.env.PORTABLE_EXECUTABLE_DIR
  && GITHUB_UPDATE_OWNER.trim().length > 0
  && GITHUB_UPDATE_REPOSITORY.trim().length > 0;

export class AutoUpdateManager {
  private finished = false;
  private installTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private readonly sendStatus: (status: AppUpdateStatus) => void,
    private readonly revealMainWindow: () => void
  ) {}

  async start(): Promise<void> {
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = false;

    autoUpdater.on('checking-for-update', () => this.sendStatus({
      state: 'checking', message: 'Verificando atualizações...'
    }));
    autoUpdater.on('update-available', (info: UpdateInfo) => this.sendStatus({
      state: 'available', message: `Baixando versão ${info.version}...`, version: info.version
    }));
    autoUpdater.on('update-not-available', () => {
      this.sendStatus({ state: 'not-available', message: 'Aplicativo atualizado.' });
      this.finishAfter(450);
    });
    autoUpdater.on('download-progress', (progress: ProgressInfo) => this.sendStatus({
      state: 'downloading',
      message: 'Baixando atualização...',
      percent: progress.percent,
      transferred: progress.transferred,
      total: progress.total,
      bytesPerSecond: progress.bytesPerSecond
    }));
    autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
      this.sendStatus({ state: 'downloaded', message: 'Instalando e reiniciando...', version: info.version });
      this.installTimer = setTimeout(() => autoUpdater.quitAndInstall(true, true), 1200);
    });
    autoUpdater.on('error', (error: Error) => {
      this.sendStatus({ state: 'error', message: `Não foi possível atualizar: ${error.message}` });
      this.finishAfter(1800);
    });

    this.sendStatus({ state: 'checking', message: 'Verificando atualizações...' });
    try {
      await autoUpdater.checkForUpdates();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao consultar os lançamentos.';
      this.sendStatus({ state: 'error', message: `Não foi possível verificar atualizações: ${message}` });
      this.finishAfter(1800);
    }
  }

  dispose(): void {
    if (this.installTimer) clearTimeout(this.installTimer);
    autoUpdater.removeAllListeners();
  }

  private finishAfter(delayMs: number): void {
    if (this.finished) return;
    this.finished = true;
    setTimeout(this.revealMainWindow, delayMs);
  }
}
