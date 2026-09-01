import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RegisterPage } from './registerPage';
import './style.css';

const root = document.getElementById('root');

if (!root) throw new Error('No #root element to mount into');

createRoot(root).render(
  <StrictMode>
    <RegisterPage />
  </StrictMode>
);
