import { useEffect, useMemo, useState } from 'react';
import moment from 'moment';
import Badge from 'react-bootstrap/Badge';
import Stack from 'react-bootstrap/Stack';
import Table from 'react-bootstrap/Table';

import MainCard from 'components/MainCard';
import OrderServices from 'services/customer-portal/OrderServices';
import { getAssignedCustomerCode, getAssignedCustomerCodes } from '../../../utils/cookies';
import { currency } from '../../../utils/global';

const getFirstValue = (source, keys = []) => {
  if (!source || typeof source !== 'object') return undefined;
  return keys.reduce((result, key) => (result !== undefined ? result : source[key]), undefined);
};

const getResponsePayload = (response) => response?.data?.data || response?.data || {};
const getEtaValue = (item = {}, keys = [], fallback = '-') => getFirstValue(item, keys) ?? fallback;
const getEtaListPayload = (payload) => {
  if (Array.isArray(payload)) return payload;
  const list = getFirstValue(payload, ['data', 'items', 'results', 'eta', 'etas', 'warnings', 'check_eta', 'checkEta']);
  if (Array.isArray(list)) return list;
  if (list && typeof list === 'object') return [list];
  if (payload && typeof payload === 'object') return [payload];
  return [];
};

export default function EtaWarningWidget() {
  const [etaWarnings, setEtaWarnings] = useState([]);
  const [isLoadingEta, setIsLoadingEta] = useState(false);
  const [etaError, setEtaError] = useState('');
  const assignedCustomerCodes = useMemo(() => getAssignedCustomerCodes(), []);
  const customerCode = getAssignedCustomerCode();
  const isDistributor = Boolean(customerCode);

  useEffect(() => {
    const fetchEtaWarning = async () => {
      setIsLoadingEta(true);
      setEtaError('');
      const payload = {
        customer_code: isDistributor ? customerCode || '' : '',
        eta_date_request: moment().format('YYYY-MM-DD')
      };

      try {
        const response = await OrderServices.getCheckEta(payload);
        if (response?.data?.success === false) {
          setEtaWarnings([]);
          setEtaError(response.data.message || 'Failed to fetch ETA warning data');
          return;
        }
        setEtaWarnings(getEtaListPayload(getResponsePayload(response)));
      } catch (error) {
        setEtaWarnings([]);
        setEtaError(error?.message || 'Failed to fetch ETA warning data');
      } finally {
        setIsLoadingEta(false);
      }
    };

    fetchEtaWarning();
  }, [assignedCustomerCodes, customerCode, isDistributor]);

  if (isLoadingEta || !etaWarnings.length) return null;

  return (
    <MainCard
      className="claim-transaction-card eta-warning-card border border-danger h-100 w-100"
      title={
        <Stack direction="horizontal" className="justify-content-between align-items-start" gap={3}>
          <Stack gap={1}>
            <Stack direction="horizontal" gap={2} className="align-items-center">
              <h5 className="mb-0">ETA Warning</h5>
              <Badge bg="danger">Warning</Badge>
            </Stack>
            <span className="text-muted f-12">
              ETA check for {moment().format('DD MMM YYYY')}
              {isDistributor && customerCode ? ` - ${customerCode}` : ''}
            </span>
          </Stack>
          <span className="avtar avtar-s bg-danger text-white eta-warning-icon">
            <i className="ti ti-alert-triangle" />
          </span>
        </Stack>
      }
    >
      {isLoadingEta ? (
        <div className="text-center text-muted py-4">Loading ETA warning data...</div>
      ) : etaError ? (
        <div className="text-center text-danger py-4">{etaError}</div>
      ) : etaWarnings.length > 0 ? (
        <Table className="mb-0 align-middle" responsive hover>
          <thead>
            <tr>
              <th>No. SO</th>
              <th>Tgl ETA</th>
              <th>Total</th>
              <th>Customer / Depo</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {etaWarnings.map((item, index) => {
              const etaDate = getEtaValue(item, ['eta_date_request', 'etaDateRequest', 'eta_date', 'etaDate', 'date'], null);
              const parsedEtaDate = moment(etaDate);
              const status = getEtaValue(item, ['status', 'type', 'level'], 'Warning');
              const salesOrderNumber = getEtaValue(
                item,
                ['sap_doc_num', 'sapDocNum', 'doc_num', 'docNum', 'order_no', 'orderNo', 'so_no', 'soNo'],
                '-'
              );
              const totalOrder = getEtaValue(item, ['doc_total', 'docTotal', 'total', 'total_order', 'totalOrder'], 0);

              return (
                <tr key={`${salesOrderNumber}-${index}`}>
                  <td className="fw-semibold">{salesOrderNumber}</td>
                  <td>{parsedEtaDate.isValid() ? parsedEtaDate.format('DD MMM YYYY') : '-'}</td>
                  <td>{currency(totalOrder)}</td>
                  <td>
                    <div className="fw-semibold">
                      {getEtaValue(item, ['customer_name', 'customerName', 'card_name', 'cardName', 'name'], '-')}
                    </div>
                    <div className="text-muted f-12">{getEtaValue(item, ['depo', 'depot', 'warehouse_name', 'warehouseName'], '-')}</div>
                  </td>
                  <td>
                    <Badge bg="danger">{status}</Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      ) : (
        <div className="text-center text-muted py-4">No ETA warning for today.</div>
      )}
    </MainCard>
  );
}
