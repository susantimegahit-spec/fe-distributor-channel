import { useEffect, useState } from 'react';
import Spinner from 'react-bootstrap/Spinner';
import Table from 'react-bootstrap/Table';

import OrderServices from '../../../services/customer-portal/OrderServices';

const firstValue = (source = {}, keys = [], fallback = '') => {
  const key = keys.find((item) => source?.[item] !== undefined && source?.[item] !== null);
  return key ? source[key] : fallback;
};

const responsePayload = (response) => response?.data?.data ?? response?.data ?? response ?? {};
const formatQuantity = (value) => {
  const quantity = Number(value);
  return Number.isFinite(quantity) ? String(Math.trunc(quantity)) : '-';
};
const orderLines = (order = {}) => {
  const rows = firstValue(order, ['details', 'lines', 'document_lines', 'documentLines', 'DocumentLines', 'items', 'products'], []);
  return Array.isArray(rows) ? rows : rows?.data || rows?.items || [];
};

export default function RescheduleOrderItemsRow({ order, expanded, colSpan = 9 }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!expanded || loaded) return;

    const orderId =
      firstValue(order, ['sales_order_id', 'salesOrderId'], '') ||
      order?.sales_order?.id ||
      order?.order?.id ||
      firstValue(order, ['id', 'requested_order_id'], '');
    if (!orderId) {
      setError('Sales Order ID tidak tersedia.');
      setLoaded(true);
      return;
    }

    let active = true;
    const fetchItems = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await OrderServices.getDetailOrder(orderId);
        if (response?.data?.success === false) throw new Error(response.data.message || 'Gagal mengambil detail Sales Order.');
        const payload = responsePayload(response);
        if (active) setItems(orderLines(payload?.sales_order ?? payload?.order ?? payload));
      } catch (fetchError) {
        if (active) setError(fetchError?.response?.data?.message || fetchError?.message || 'Gagal mengambil item Sales Order.');
      } finally {
        if (active) {
          setLoading(false);
          setLoaded(true);
        }
      }
    };
    fetchItems();
    return () => {
      active = false;
    };
  }, [expanded, loaded, order]);

  if (!expanded) return null;

  return (
    <tr className="reschedule-order-items-row">
      <td colSpan={colSpan} className="p-0">
        <div className="p-3 ps-5 bg-body-tertiary">
          {loading ? (
            <div className="text-muted py-3">
              <Spinner animation="border" size="sm" className="me-2" />
              Loading Sales Order items...
            </div>
          ) : error ? (
            <div className="text-danger py-3">{error}</div>
          ) : items.length ? (
            <Table responsive size="sm" className="mb-0 align-middle reschedule-order-items-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Item Code</th>
                  <th>Item Name</th>
                  <th className="text-end">Quantity</th>
                  <th>UoM</th>
                  <th>Warehouse</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={firstValue(item, ['id', 'line_num', 'lineNum', 'ItemCode', 'item_code'], index)}>
                    <td>{index + 1}</td>
                    <td className="fw-semibold">{firstValue(item, ['ItemCode', 'item_code', 'itemCode'], '-')}</td>
                    <td>{firstValue(item, ['ItemDescription', 'item_description', 'itemName', 'item_name', 'description'], '-')}</td>
                    <td className="text-end">{formatQuantity(firstValue(item, ['Quantity', 'quantity', 'qty', 'ordered_qty'], ''))}</td>
                    <td>{firstValue(item, ['UomCode', 'uom_code', 'uom', 'unit'], '-')}</td>
                    <td>{firstValue(item, ['WhsCode', 'whs_code', 'warehouse_code', 'warehouse'], '-')}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <div className="text-muted py-3">Tidak ada item pada Sales Order ini.</div>
          )}
        </div>
      </td>
    </tr>
  );
}
