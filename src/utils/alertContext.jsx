import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import Button from 'react-bootstrap/Button';

const AlertContext = createContext(null);

const alertVariantConfig = {
  success: {
    icon: 'ti ti-circle-check',
    title: 'Berhasil',
    accent: '#16a34a',
    background: '#f0fdf4',
    color: '#166534'
  },
  danger: {
    icon: 'ti ti-alert-triangle',
    title: 'Gagal',
    accent: '#dc2626',
    background: '#fef2f2',
    color: '#991b1b'
  },
  warning: {
    icon: 'ti ti-alert-circle',
    title: 'Perhatian',
    accent: '#d97706',
    background: '#fffbeb',
    color: '#92400e'
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
  const timerRef = useRef(null);
  const [alert, setAlert] = useState({ show: false, message: '', variant: 'info', timeout: 4000 });

  const hideAlert = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    setAlert((prev) => ({ ...prev, show: false }));
  }, []);

  const showAlert = useCallback(
    (message, variant = 'info', timeout = 4000) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      setAlert({ show: true, message, variant, timeout });

      if (timeout) {
        timerRef.current = setTimeout(() => {
          hideAlert();
        }, timeout);
      }
    },
    [hideAlert]
  );

  const currentVariant = alertVariantConfig[alert.variant] || alertVariantConfig.info;

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert }}>
      {children}
      {alert.show && (
        <div
          className="position-fixed top-0 end-0 p-3"
          style={{
            zIndex: 9999,
            width: 'min(420px, calc(100vw - 24px))'
          }}
        >
          <div
            className="overflow-hidden"
            role="alert"
            aria-live="assertive"
            style={{
              background: '#fff',
              border: '1px solid rgba(15, 23, 42, 0.08)',
              borderLeft: `4px solid ${currentVariant.accent}`,
              borderRadius: 10,
              boxShadow: '0 18px 45px rgba(15, 23, 42, 0.16)'
            }}
          >
            <div className="d-flex align-items-start gap-3 p-3">
              <span
                className="d-inline-flex align-items-center justify-content-center flex-shrink-0"
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 8,
                  background: currentVariant.background,
                  color: currentVariant.color
                }}
              >
                <i className={`${currentVariant.icon} f-20`} />
              </span>

              <div className="flex-grow-1 pe-1">
                <div className="fw-semibold mb-1" style={{ color: '#111827' }}>
                  {currentVariant.title}
                </div>
                <div className="text-muted" style={{ lineHeight: 1.45 }}>
                  {alert.message}
                </div>
              </div>

              <Button variant="link-secondary" className="btn-icon avatar-s flex-shrink-0 p-0" onClick={hideAlert} aria-label="Tutup alert">
                <i className="ti ti-x" />
              </Button>
            </div>

            {Boolean(alert.timeout) && (
              <div className="bg-light" style={{ height: 3 }}>
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    background: currentVariant.accent,
                    animation: `alert-progress ${alert.timeout}ms linear forwards`
                  }}
                />
              </div>
            )}
          </div>

          <style>
            {`
              @keyframes alert-progress {
                from { width: 100%; }
                to { width: 0%; }
              }
            `}
          </style>
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
