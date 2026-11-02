import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './shell.css';
import './fitness-home.css';
import './personal.css';
import './motion.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// The standalone Android/file build never registers a service worker.
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(() => {}); });
}
