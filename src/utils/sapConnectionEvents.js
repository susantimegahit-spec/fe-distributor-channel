export const SAP_CONNECTION_RETRY_EVENT = 'sm:sap-connection-retry';
export const SAP_CONNECTION_ERROR_MESSAGE = 'The connection to SAP failed or timed out. Please retry the request.';

export const requestSapConnectionRetry = ({ retry, cancel }) => {
  window.dispatchEvent(
    new CustomEvent(SAP_CONNECTION_RETRY_EVENT, {
      detail: { retry, cancel }
    })
  );
};
