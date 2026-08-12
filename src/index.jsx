import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';

// styles
import './index.scss';

// project-imports
import App from './App';
import store from './redux/store';

import '@fontsource/montserrat/500.css';

const container = document.getElementById('root');
const root = createRoot(container);

// ==============================|| MAIN - REACT DOM RENDER ||============================== //

root.render(
  <Provider store={store}>
    <App />
  </Provider>
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    let refreshing = false;

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .then((registration) => {
        registration.update();

        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;

          newWorker?.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });
      })
      .catch(() => {});
  });
}
