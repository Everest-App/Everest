import React from 'react';
import ReactDOM from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import App from './App.tsx';
import { ThemeProvider } from './contexts/ThemeContext.tsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HelmetProvider>
      <ThemeProvider defaultTheme="dark" storageKey="everest-theme">
        <App />
      </ThemeProvider>
    </HelmetProvider>
  </React.StrictMode>,
);
