import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import BuildPage from './ui/BuildPage.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BuildPage />
  </StrictMode>,
);
