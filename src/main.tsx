import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

// Suppress benign HMR and WebSocket errors from showing as Unhandled Rejections in the sandbox preview
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason?.message || event.reason?.toString() || '';
    if (
      reason.includes('WebSocket') ||
      reason.includes('websocket') ||
      reason.includes('HMR') ||
      reason.includes('vite')
    ) {
      event.preventDefault();
      event.stopPropagation();
    }
  });

  // Also catch generic window errors for web sockets
  window.addEventListener(
    'error',
    (event) => {
      const message = event.message || '';
      if (message.includes('WebSocket') || message.includes('websocket')) {
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
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
