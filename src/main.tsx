import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

// Suppress benign HMR, WebSocket, and cross-origin Turnstile script errors in sandbox preview
if (typeof window !== 'undefined') {
  window.onerror = function (message) {
    const msgStr = String(message || '');
    if (
      msgStr.includes('Script error') ||
      msgStr.includes('turnstile') ||
      msgStr.includes('challenges.cloudflare.com') ||
      msgStr.includes('WebSocket') ||
      msgStr.includes('websocket') ||
      msgStr.includes('HMR')
    ) {
      return true; // Prevents error propagation to sandbox overlay
    }
    return false;
  };

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason?.message || event.reason?.toString() || '';
    if (
      reason.includes('WebSocket') ||
      reason.includes('websocket') ||
      reason.includes('HMR') ||
      reason.includes('vite') ||
      reason.includes('Script error') ||
      reason.includes('turnstile') ||
      reason.includes('challenges.cloudflare.com')
    ) {
      event.preventDefault();
      event.stopPropagation();
    }
  });

  window.addEventListener(
    'error',
    (event) => {
      const message = event.message || '';
      if (
        message.includes('WebSocket') ||
        message.includes('websocket') ||
        message.includes('Script error') ||
        message.includes('turnstile') ||
        message.includes('challenges.cloudflare.com')
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
    true
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
