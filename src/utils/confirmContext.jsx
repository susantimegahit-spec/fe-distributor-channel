import { createContext, useCallback, useContext, useState } from 'react';

import ConfirmDialog from '../components/ConfirmDialog';

const ConfirmContext = createContext(null);

const initialConfirmState = {
  show: false,
  title: '',
  subTitle: '',
  onConfirm: null
};

export const ConfirmProvider = ({ children }) => {
  const [confirmState, setConfirmState] = useState(initialConfirmState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hideConfirm = useCallback(() => {
    if (isSubmitting) return;

    setConfirmState(initialConfirmState);
  }, [isSubmitting]);

  const showConfirm = useCallback((config) => {
    setConfirmState({
      ...initialConfirmState,
      ...config,
      show: true
    });
  }, []);

  const submitConfirm = useCallback(async () => {
    if (!confirmState.onConfirm) {
      setConfirmState(initialConfirmState);
      return;
    }

    setIsSubmitting(true);

    try {
      await confirmState.onConfirm();
      setConfirmState(initialConfirmState);
    } finally {
      setIsSubmitting(false);
    }
  }, [confirmState]);

  return (
    <ConfirmContext.Provider value={{ showConfirm, hideConfirm }}>
      {children}
      <ConfirmDialog
        show={confirmState.show}
        onCancel={hideConfirm}
        onSubmit={submitConfirm}
        title={confirmState.title}
        subTitle={confirmState.subTitle}
        loading={isSubmitting}
      />
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const context = useContext(ConfirmContext);

  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }

  return context;
};
