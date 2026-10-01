import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

// Safe wrappers to avoid sandbox errors inside iframes
if (typeof window !== 'undefined') {
  const originalAlert = window.alert;
  window.alert = (msg?: any) => {
    try {
      if (originalAlert) {
        originalAlert(msg);
      } else {
        console.warn('[Alert]', msg);
      }
    } catch {
      console.warn('[Alert Intercepted]', msg);
    }
  };

  const originalOpen = window.open;
  window.open = (url?: string | URL, target?: string, features?: string) => {
    try {
      return originalOpen ? originalOpen(url, target, features) : null;
    } catch {
      console.warn('[Window.open Intercepted]', url);
      return null;
    }
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
