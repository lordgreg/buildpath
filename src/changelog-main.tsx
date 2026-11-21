import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Changelog from './ui/Changelog.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Changelog />
  </StrictMode>,
);