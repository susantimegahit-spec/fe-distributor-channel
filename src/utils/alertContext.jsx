import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import Button from 'react-bootstrap/Button';

const AlertContext = createContext(null);

const alertVariantConfig = {
  success: {
    icon: 'ti ti-circle-check',
    title: 'Berhasil',
    accent: '#16a34a',
    background: '#ecfdf5',
    color: '#047857'
  },
  danger: {
    icon: 'ti ti-alert-circle',
    title: 'Gagal',
    accent: '#ef4444',
    background: '#fef2f2',
    color: '#b91c1c'
  },
  warning: {
    icon: 'ti ti-alert-circle',
    title: 'Perhatian',
    accent: '#f59e0b',
    background: '#fffbeb',
    color: '#b45309'
  },
  info: {
    icon: 'ti ti-info-circle',
    title: 'Informasi',
    accent: '#2563eb',
    background: '#eff6ff',
    color: '#1d4ed8'
  }
};

export const AlertProvider = ({ children }) => {
  const timersRef = useRef(new Map());
  const [alerts, setAlerts] = useState([]);

  const clearTimer = useCallback((id) => {
    const timer = timersRef.current.get(id);

    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const dismissAlert = useCallback(
    (id) => {
      clearTimer(id);
      setAlerts((prev) => prev.filter((item) => item.id !== id));
    },
    [clearTimer]
  );

  const hideAlert = useCallback(
    (id) => {
      if (id) {
        dismissAlert(id);
        return;
      }

      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current.clear();
      setAlerts([]);
    },
    [dismissAlert]
  );

  const showAlert = useCallback(
    (message, variant = 'info', timeout = 4000) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const safeVariant = alertVariantConfig[variant] ? variant : 'info';

      setAlerts((prev) => [...prev.slice(-2), { id, message, variant: safeVariant, timeout }]);

      if (timeout) {
        const timer = setTimeout(() => {
          dismissAlert(id);
        }, timeout);
        timersRef.current.set(id, timer);
      }
    },
    [dismissAlert]
  );

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current.clear();
    };
  }, []);

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert }}>
      {children}
      {alerts.length > 0 && (
        <div className="sm-alert-viewport" aria-live="polite" aria-atomic="false">
          {alerts.map((alert) => {
            const currentVariant = alertVariantConfig[alert.variant] || alertVariantConfig.info;

            return (
              <div
                key={alert.id}
                className="sm-alert-toast"
                role="alert"
                style={{
                  '--sm-alert-accent': currentVariant.accent,
                  '--sm-alert-bg': currentVariant.background,
                  '--sm-alert-color': currentVariant.color,
                  '--sm-alert-duration': `${alert.timeout}ms`
                }}
              >
                <div className="sm-alert-body">
                  <span className="sm-alert-icon">
                    <i className={`${currentVariant.icon} f-20`} />
                  </span>

                  <div className="sm-alert-content">
                    <div className="sm-alert-title">{currentVariant.title}</div>
                    <div className="sm-alert-message">{alert.message}</div>
                  </div>

                  <Button
                    variant="link-secondary"
                    className="sm-alert-close btn-icon avatar-s flex-shrink-0 p-0"
                    onClick={() => hideAlert(alert.id)}
                    aria-label="Tutup alert"
                  >
                    <i className="ti ti-x" />
                  </Button>
                </div>

                {Boolean(alert.timeout) && (
                  <div className="sm-alert-progress">
                    <span />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </AlertContext.Provider>
  );
};

// Custom hook for simple consumption
export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};
