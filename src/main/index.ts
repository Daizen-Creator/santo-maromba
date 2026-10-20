import { app, BrowserWindow, protocol } from 'electron';
import path from 'path';
import { closeDatabase, getDatabase } from '../database/connection';
import { IPC_CHANNELS } from '../shared/ipc-channels';
import { registerIpcHandlers } from './ipc-handlers';
import { AutoUpdateManager, canUseAutoUpdates } from './update-manager';

protocol.registerSchemesAsPrivileged([{
  scheme: 'fittrack-photo',
  privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true }
}, {
  scheme: 'fittrack-exercise',
  privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true }
}, {
  scheme: 'fittrack-customization',
  privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true }
}]);

let mainWindow: BrowserWindow | null = null;
let updaterSplash: BrowserWindow | null = null;
let startupUpdateGate = false;
let mainWindowReady = false;
let updateManager: AutoUpdateManager | null = null;

// Mantém a pasta de dados existente mesmo com o novo nome exibido no Windows.
app.setName('fittrack-personal');

// Evita que uma falha do processo gráfico separado impeça a abertura do app.
app.commandLine.appendSwitch('in-process-gpu');

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1080,
    minHeight: 700,
    title: 'Santo Maromba',
    backgroundColor: '#07090e',
    frame: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindowReady = true;
    if (!startupUpdateGate) mainWindow?.show();
  });

  // Carrega URL de desenvolvimento ou arquivo compilado
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (isDev && process.env.ELECTRON_DEV_URL) {
    await mainWindow.loadURL(process.env.ELECTRON_DEV_URL);
  } else if (isDev) {
    try {
      await mainWindow.loadURL('http://localhost:5173');
    } catch {
      await mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
    }
  } else {
    await mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function createUpdaterSplash(): Promise<BrowserWindow> {
  updaterSplash = new BrowserWindow({
    width: 460,
    height: 280,
    frame: false,
    transparent: true,
    resizable: false,
    maximizable: false,
    minimizable: false,
    show: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  updaterSplash.once('ready-to-show', () => updaterSplash?.show());
  updaterSplash.on('closed', () => { updaterSplash = null; });
  await updaterSplash.loadFile(path.join(__dirname, '../../dist/index.html'), {
    query: { 'update-splash': '1' }
  });
  return updaterSplash;
}

function revealMainWindow(): void {
  startupUpdateGate = false;
  if (mainWindowReady) mainWindow?.show();
  if (updaterSplash && !updaterSplash.isDestroyed()) updaterSplash.close();
  updaterSplash = null;
}

app.whenReady().then(async () => {
  try {
    startupUpdateGate = canUseAutoUpdates();
    const db = await getDatabase();
    const photoDirectory = path.join(app.getPath('userData'), 'photos');
    const exerciseMediaDirectory = path.join(app.getPath('userData'), 'exercise_media');
    const customizationMediaDirectory = path.join(app.getPath('userData'), 'customization_media');
    const service = registerIpcHandlers(db, photoDirectory, exerciseMediaDirectory, customizationMediaDirectory);
    service.migrateLegacyPhotoFiles();
    protocol.handle('fittrack-photo', async request => {
      try {
        const photoId = decodeURIComponent(new URL(request.url).hostname);
        const image = service.getPhotoImage(photoId);
        return new Response(new Uint8Array(image.bytes), {
          headers: { 'Content-Type': image.mimeType, 'Cache-Control': 'no-store' }
        });
      } catch {
        return new Response('Foto não encontrada.', { status: 404 });
      }
    });
    protocol.handle('fittrack-exercise', async request => {
      try {
        const mediaId = decodeURIComponent(new URL(request.url).hostname);
        const media = service.getExerciseMediaImage(mediaId);
        return new Response(new Uint8Array(media.bytes), {
          headers: { 'Content-Type': media.mimeType, 'Cache-Control': 'no-store' }
        });
      } catch {
        return new Response('Mídia não encontrada.', { status: 404 });
      }
    });
    protocol.handle('fittrack-customization', async request => {
      try {
        const mediaId = decodeURIComponent(new URL(request.url).hostname);
        const media = service.getCustomizationMediaImage(mediaId);
        return new Response(new Uint8Array(media.bytes), {
          headers: { 'Content-Type': media.mimeType, 'Cache-Control': 'no-store' }
        });
      } catch {
        return new Response('Mídia de personalização não encontrada.', { status: 404 });
      }
    });
    await createWindow();

    if (startupUpdateGate) {
      try {
        const splash = await createUpdaterSplash();
        updateManager = new AutoUpdateManager(
          status => {
            if (!splash.isDestroyed()) splash.webContents.send(IPC_CHANNELS.UPDATE_STATUS, status);
          },
          revealMainWindow
        );
        await updateManager.start();
      } catch (error) {
        console.error('[Updater] Falha ao abrir a interface de atualização:', error);
        revealMainWindow();
      }
    }
  } catch (err) {
    console.error('[Main] Falha fatal ao iniciar Santo Maromba:', err);
    app.quit();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  updateManager?.dispose();
  closeDatabase();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
