import PropTypes from 'prop-types';
import { useEffect, useRef } from 'react';

export default function Turnstile({ siteKey, onVerify, theme = 'light' }) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);

  useEffect(() => {
    let script = document.querySelector('script[src*="challenges.cloudflare.com/turnstile"]');
    
    const initializeTurnstile = () => {
      if (window.turnstile && containerRef.current && !widgetIdRef.current) {
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token) => {
            onVerify(token);
          },
          theme: theme,
          'expired-callback': () => {
            onVerify(null);
          },
          'error-callback': () => {
            onVerify(null);
          }
        });
      }
    };

    if (!script) {
      script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.onload = initializeTurnstile;
      document.body.appendChild(script);
    } else {
      if (window.turnstile) {
        initializeTurnstile();
      } else {
        script.addEventListener('load', initializeTurnstile);
      }
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, onVerify, theme]);

  return <div ref={containerRef} className="d-flex justify-content-center my-3" />;
}

Turnstile.propTypes = {
  siteKey: PropTypes.string.isRequired,
  onVerify: PropTypes.func.isRequired,
  theme: PropTypes.string
};
