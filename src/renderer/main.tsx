import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { UpdaterSplash } from './components/UpdaterSplash';
import './index.css';

const rootEl = document.getElementById('root');
if (rootEl) {
  const isUpdaterSplash = new URLSearchParams(window.location.search).get('update-splash') === '1';
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      {isUpdaterSplash ? <UpdaterSplash /> : <App />}
    </React.StrictMode>
  );
}
