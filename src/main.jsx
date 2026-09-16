import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { DialogProvider } from './ui/dialog';

import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <DialogProvider>
      <App />
    </DialogProvider>
  </StrictMode>,
)
