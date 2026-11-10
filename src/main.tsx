import {StrictMode, useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

function BootstrappedApp() {
  useEffect(() => {
    document.getElementById('boot-status')?.remove();
  }, []);

  return <App />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BootstrappedApp />
  </StrictMode>,
);
