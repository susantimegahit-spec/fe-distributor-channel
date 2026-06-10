import React, { createContext, useContext, useState, useCallback } from 'react';
import { Alert } from 'react-bootstrap';

const AlertContext = createContext(null);

export const AlertProvider = ({ children }) => {
  const [alert, setAlert] = useState({ show: false, message: '', variant: 'info' });

  // Function to dismiss the active alert
  const hideAlert = useCallback(() => {
    setAlert((prev) => ({ ...prev, show: false }));
  }, []);

  // Function to trigger a new alert with auto-dismiss options
  const showAlert = useCallback(
    (message, variant = 'info', timeout = 4000) => {
      setAlert({ show: true, message, variant });

      if (timeout) {
        setTimeout(() => {
          hideAlert();
        }, timeout);
      }
    },
    [hideAlert]
  );

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert }}>
      {children}
      {alert.show && (
        <div className="position-fixed top-0 start-50 translate-middle-x mt-3" style={{ zIndex: 9999, minWidth: '300px' }}>
          <Alert variant={alert.variant} dismissible onClose={hideAlert}>
            {alert.message}
          </Alert>
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
