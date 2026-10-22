import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { UpdaterSplash } from './components/UpdaterSplash';
import './index.css';
import { api } from './services/api';

if (typeof window !== 'undefined' && !api.isElectron() && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(new URL('./sw.js', document.baseURI), { scope: './' })
      .catch(error => console.error('[PWA] Não foi possível ativar o modo offline:', error));
  });
}

const rootEl = document.getElementById('root');
if (rootEl) {
  const isUpdaterSplash = new URLSearchParams(window.location.search).get('update-splash') === '1';
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      {isUpdaterSplash ? <UpdaterSplash /> : <App />}
    </React.StrictMode>
  );
}
