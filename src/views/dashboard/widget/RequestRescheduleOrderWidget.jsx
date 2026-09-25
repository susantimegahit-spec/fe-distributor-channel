import { useEffect, useState } from 'react';
import moment from 'moment';
import Badge from 'react-bootstrap/Badge';
import Stack from 'react-bootstrap/Stack';
import Table from 'react-bootstrap/Table';

import MainCard from 'components/MainCard';
import TablePagination from 'components/TablePagination';
import LogisticsServices from 'services/logistics/LogisticsServices';
import RescheduleLogModal from '../../customer-portal/dashboard/RescheduleLogModal';
import RescheduleOrderActions from '../../customer-portal/dashboard/RescheduleOrderActions';

const PAGE_SIZE = 10;
const statusConfig = {
  DRAFT: { label: 'Draft', color: 'secondary' },
  WAITING_OM: { label: 'Waiting OM', color: 'warning' },
  WAITING_ASM: { label: 'Waiting ASM', color: 'info' },
  WAITING_ADMIN_SALES: { label: 'Waiting Admin Sales', color: 'primary' },
  WAITING_APPROVAL: { label: 'Waiting Approval', color: 'warning' },
  ORDER_APPROVED: { label: 'Order Approved', color: 'success' },
  DELIVERY: { label: 'Delivery', color: 'info' },
  APPROVED: { label: 'Approved', color: 'success' },
  ARRIVED: { label: 'Arrived', color: 'success' },
  REJECTED: { label: 'Rejected', color: 'orange' },
  FAILED: { label: 'Failed', color: 'danger' }
};

const getOrderValue = (order = {}, keys = [], fallback = '-') => {
  const key = keys.find((item) => order[item] !== undefined);
  return key ? order[key] : fallback;
};
const normalizeStatus = (value) =>
  String(value || '')
    .trim()
    .toUpperCase();
const getStatusMeta = (status) => statusConfig[status] || { label: status || 'Unknown', color: 'secondary' };
const formatOrderDate = (value) => {
  if (!value) return '-';
  const dateValue = moment(value);
  return dateValue.isValid() ? dateValue.format('DD MMM YYYY') : '-';
};

export default function RequestRescheduleOrderWidget() {
  const [detail, setDetail] = useState(null);
  const [orders, setOrders] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let active = true;
    const fetchOrders = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await LogisticsServices.getLogisticOrders({
          logistic_status: 'RESCHEDULE_REQUESTED',
          per_page: PAGE_SIZE,
          page
        });
        if (!(response?.status >= 200 && response.status < 300) || response?.data?.success === false) {
          throw new Error(response?.data?.message || 'Failed to load reschedule orders');
        }
        if (!active) return;
        const root = response?.data ?? {};
        const payload = root?.data && !Array.isArray(root.data) ? root.data : root;
        const pageData = payload?.orders || payload?.data || payload;
        const rows = Array.isArray(pageData) ? pageData : pageData?.data || pageData?.items || [];
        const meta = payload?.pagination || payload?.meta || pageData?.pagination || pageData?.meta || pageData;
        const rowTotal = Number(meta?.total ?? payload?.total ?? rows.length) || 0;

        setOrders((Array.isArray(rows) ? rows : []).map((item) => ({ ...item, ...(item.sales_order || item.order || {}) })));
        setTotal(rowTotal);
        setPageCount(Number(meta?.last_page ?? payload?.last_page) || Math.max(Math.ceil(rowTotal / PAGE_SIZE), 1));
      } catch (fetchError) {
        if (!active) return;
        setOrders([]);
        setTotal(0);
        setPageCount(1);
        setError(fetchError?.response?.data?.message || fetchError?.message || 'Failed to load reschedule orders');
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchOrders();
    return () => {
      active = false;
    };
  }, [page, refresh]);

  const handleSuccess = () => {
    if (orders.length === 1 && page > 1) setPage((current) => current - 1);
    else setRefresh((value) => value + 1);
  };

  return (
    <>
      <MainCard
        className="claim-transaction-card dashboard-reschedule-card border border-warning"
        title={
          <Stack direction="horizontal" className="justify-content-between align-items-start" gap={3}>
            <Stack gap={1}>
              <Stack direction="horizontal" gap={2} className="align-items-center">
                <h5 className="mb-0">Request Reschedule Order</h5>
                <Badge bg="warning" text="dark">
                  Logistic
                </Badge>
              </Stack>
              <span className="text-muted f-12">Sales orders with reschedule requests from Logistics.</span>
            </Stack>
            <span className="avtar avtar-s bg-light-warning text-warning">
              <i className="ti ti-calendar-time" />
            </span>
          </Stack>
        }
      >
        <Table responsive hover className="mb-0 align-middle">
          <thead>
            <tr>
              <th>No. SO</th>
              <th>Customer</th>
              <th>Depo</th>
              <th>Order Date</th>
              <th>ETA</th>
              <th>Proposed ETA</th>
              <th>Status</th>
              <th className="text-end">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center text-muted py-4">
                  Loading reschedule orders...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={8} className="text-center text-danger py-4">
                  {error}
                </td>
              </tr>
            ) : orders.length ? (
              orders.map((order, index) => {
                const id = getOrderValue(order, ['requested_order_id', 'id', 'sales_order_id', 'salesOrderId'], '');
                const status = normalizeStatus(getOrderValue(order, ['status'], ''));
                const statusMeta = getStatusMeta(status);

                return (
                  <tr key={id || index}>
                    <td>
                      <button
                        type="button"
                        className="sm-logistics-order-number"
                        data-permission-action="utility"
                        disabled={!id}
                        onClick={() => setDetail(order)}
                        aria-label="View reschedule negotiation"
                      >
                        {getOrderValue(order, ['sap_doc_num', 'sapDocNum', 'doc_num', 'docNum', 'order_no', 'orderNo'])}
                      </button>
                    </td>
                    <td>{getOrderValue(order, ['customer_name', 'customerName', 'card_name', 'cardName'])}</td>
                    <td>{getOrderValue(order, ['depo', 'depot', 'warehouse_name', 'warehouseName'])}</td>
                    <td>{formatOrderDate(getOrderValue(order, ['doc_date', 'docDate', 'created_at', 'createdAt'], ''))}</td>
                    <td>{formatOrderDate(getOrderValue(order, ['eta_date', 'etaDate', 'doc_due_date', 'docDueDate'], ''))}</td>
                    <td>{formatOrderDate(getOrderValue(order, ['proposed_eta_date', 'proposedEtaDate'], ''))}</td>
                    <td>
                      <Badge bg={statusMeta.color}>{statusMeta.label}</Badge>
                    </td>
                    <td>
                      <RescheduleOrderActions order={order} onSuccess={handleSuccess} />
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={8} className="text-center text-muted py-4">
                  No reschedule orders available.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
        <TablePagination
          currentPage={page}
          onPageChange={setPage}
          pageCount={pageCount}
          pageSize={PAGE_SIZE}
          total={total}
          itemLabel="reschedule orders"
        />
      </MainCard>

      {detail && <RescheduleLogModal order={detail} onClose={() => setDetail(null)} onSuccess={handleSuccess} />}
    </>
  );
}
