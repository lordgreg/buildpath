import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import TestsPage from './ui/TestsPage.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TestsPage />
  </StrictMode>,
);
