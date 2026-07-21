import { useEffect, useMemo, useState } from 'react';
import moment from 'moment';
import Badge from 'react-bootstrap/Badge';
import Form from 'react-bootstrap/Form';
import Stack from 'react-bootstrap/Stack';
import Table from 'react-bootstrap/Table';

import MainCard from 'components/MainCard';
import OrderServices from '../../../services/customer-portal/OrderServices';
import { useAlert } from '../../../utils/alertContext';

const getList = (response) => {
  const payload = response?.data?.data ?? response?.data;
  if (Array.isArray(payload)) return payload;

  const list = payload?.data || payload?.items || payload?.results || payload?.sales_returns || payload?.salesReturns;
  return Array.isArray(list) ? list : [];
};

const getValue = (item, keys, fallback = '-') => {
  for (const key of keys) {
    const value = key.split('.').reduce((source, path) => source?.[path], item);
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return fallback;
};

const getStatusColor = (status) => {
  const value = String(status || '').toUpperCase();
  if (['APPROVED', 'COMPLETED', 'SUCCESS'].includes(value)) return 'success';
  if (['REJECTED', 'FAILED', 'CANCELLED', 'CANCELED'].includes(value)) return 'danger';
  return 'warning';
};

export default function OrderRetur() {
  const { showAlert } = useAlert();
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');

  useEffect(() => {
    const fetchReturns = async () => {
      setLoading(true);
      try {
        const response = await OrderServices.getRetur();
        if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to fetch return data');
        setReturns(getList(response));
      } catch (error) {
        setReturns([]);
        showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch return data', 'danger');
      } finally {
        setLoading(false);
      }
    };

    fetchReturns();
  }, [showAlert]);

  const filteredReturns = useMemo(() => {
    const search = keyword.trim().toLowerCase();
    if (!search) return returns;

    return returns.filter((item) =>
      [
        getValue(item, ['id'], ''),
        getValue(item, ['sales_order.sap_doc_num', 'salesOrder.sapDocNum', 'sales_order_id'], ''),
        getValue(item, ['sales_order.customer_name', 'salesOrder.customerName', 'customer_name'], ''),
        getValue(item, ['reason'], ''),
        getValue(item, ['status'], '')
      ].some((value) => String(value).toLowerCase().includes(search))
    );
  }, [keyword, returns]);

  return (
    <MainCard
      title={
        <Stack gap={1}>
          <h5 className="mb-0">Retur</h5>
          <span className="text-muted f-12">Sales order return requests.</span>
        </Stack>
      }
    >
      <Form.Control
        type="search"
        value={keyword}
        onChange={(event) => setKeyword(event.target.value)}
        placeholder="Search order, customer, reason, or status..."
        className="mb-3"
      />
      <Table responsive hover bordered className="mb-0 align-middle">
        <thead>
          <tr>
            <th>No.</th>
            <th>No. Sales Order</th>
            <th>Customer / Depo</th>
            <th>Reason</th>
            <th>Items</th>
            <th>Date</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={7} className="text-center text-muted py-4">Loading return data...</td></tr>
          ) : filteredReturns.length ? (
            filteredReturns.map((item, index) => {
              const status = getValue(item, ['status'], 'Pending');
              const items = getValue(item, ['items', 'details', 'return_items', 'returnItems'], []);
              const date = getValue(item, ['created_at', 'createdAt', 'request_date', 'requestDate'], '');

              return (
                <tr key={getValue(item, ['id'], index)}>
                  <td>{index + 1}</td>
                  <td className="fw-semibold">
                    {getValue(item, ['sales_order.sap_doc_num', 'salesOrder.sapDocNum', 'sales_order.doc_num', 'sales_order_id'])}
                  </td>
                  <td>
                    <div className="fw-semibold">
                      {getValue(item, ['sales_order.customer_name', 'salesOrder.customerName', 'customer_name'])}
                    </div>
                    <small className="text-muted">{getValue(item, ['sales_order.depo', 'salesOrder.depo', 'depo'])}</small>
                  </td>
                  <td className="text-wrap">{getValue(item, ['reason'])}</td>
                  <td>{Array.isArray(items) ? items.length : '-'}</td>
                  <td>{date && moment(date).isValid() ? moment(date).format('DD MMM YYYY') : '-'}</td>
                  <td><Badge bg={getStatusColor(status)}>{String(status).replace(/_/g, ' ')}</Badge></td>
                </tr>
              );
            })
          ) : (
            <tr><td colSpan={7} className="text-center text-muted py-4">No return data found.</td></tr>
          )}
        </tbody>
      </Table>
    </MainCard>
  );
}
