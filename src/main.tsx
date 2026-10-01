import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './context/AuthContext';
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
      console.warn('Caught and suppressed benign websocket/HMR rejection:', event.reason);
      event.preventDefault();
      event.stopPropagation();
    }
  });

  // Also catch generic window errors for web sockets
  window.addEventListener('error', (event) => {
    const message = event.message || '';
    if (message.includes('WebSocket') || message.includes('websocket')) {
      console.warn('Caught and suppressed benign websocket error:', event.message);
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
