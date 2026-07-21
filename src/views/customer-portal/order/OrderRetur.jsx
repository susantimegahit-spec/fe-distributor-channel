import { useEffect, useMemo, useState } from 'react';
import moment from 'moment';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import Row from 'react-bootstrap/Row';
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

const getDetailPayload = (response) => {
  const payload = response?.data?.data ?? response?.data;
  if (Array.isArray(payload)) return payload[0] || {};
  return payload && typeof payload === 'object' ? payload : {};
};

export default function OrderRetur() {
  const { showAlert } = useAlert();
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

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

  const openReturnDetail = async (returnItem) => {
    const salesOrderId = getValue(returnItem, ['sales_order_id', 'salesOrderId', 'sales_order.id', 'salesOrder.id'], '');
    setSelectedReturn(returnItem);
    setSelectedOrder(getValue(returnItem, ['sales_order', 'salesOrder'], {}));

    if (!salesOrderId) return;

    setLoadingDetail(true);
    try {
      const response = await OrderServices.getDetailOrder(salesOrderId);
      if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to fetch sales order detail');
      setSelectedOrder(getDetailPayload(response));
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch sales order detail', 'danger');
    } finally {
      setLoadingDetail(false);
    }
  };

  const closeDetail = () => {
    if (loadingDetail) return;
    setSelectedReturn(null);
    setSelectedOrder(null);
  };

  const returnItems = getValue(selectedReturn, ['items', 'details', 'return_items', 'returnItems'], []);
  const orderItems = getValue(selectedOrder, ['details', 'lines', 'document_lines', 'documentLines', 'DocumentLines'], []);
  const detailItems = Array.isArray(returnItems) && returnItems.length ? returnItems : Array.isArray(orderItems) ? orderItems : [];

  return (
    <>
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
            <th className="text-center">#</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={8} className="text-center text-muted py-4">Loading return data...</td></tr>
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
                  <td className="text-center">
                    <Button
                      className="rounded-circle"
                      variant="outline-primary"
                      size="sm"
                      title="View return detail"
                      aria-label="View return detail"
                      onClick={() => openReturnDetail(item)}
                    >
                      <i className="ti ti-eye" />
                    </Button>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr><td colSpan={8} className="text-center text-muted py-4">No return data found.</td></tr>
          )}
        </tbody>
      </Table>
      </MainCard>

      <Modal show={Boolean(selectedReturn)} onHide={closeDetail} size="xl" centered scrollable>
        <Modal.Header closeButton={!loadingDetail}>
          <Modal.Title>Return Detail</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="g-3 mb-4">
            <Col sm={6} lg={3}>
              <small className="text-muted">No. Sales Order</small>
              <div className="fw-semibold">
                {getValue(selectedOrder, ['sap_doc_num', 'sapDocNum', 'doc_num', 'docNum'], getValue(selectedReturn, ['sales_order_id']))}
              </div>
            </Col>
            <Col sm={6} lg={3}>
              <small className="text-muted">Customer</small>
              <div className="fw-semibold">
                {getValue(selectedOrder, ['customer_name', 'customerName', 'card_name', 'cardName'])}
              </div>
            </Col>
            <Col sm={6} lg={2}>
              <small className="text-muted">Depo</small>
              <div className="fw-semibold">{getValue(selectedOrder, ['depo', 'depot', 'warehouse_name', 'warehouseName'])}</div>
            </Col>
            <Col sm={6} lg={2}>
              <small className="text-muted">Request Date</small>
              <div className="fw-semibold">
                {moment(getValue(selectedReturn, ['created_at', 'createdAt'], '')).isValid()
                  ? moment(getValue(selectedReturn, ['created_at', 'createdAt'], '')).format('DD MMM YYYY')
                  : '-'}
              </div>
            </Col>
            <Col sm={6} lg={2}>
              <small className="text-muted">Status</small>
              <div>
                <Badge bg={getStatusColor(getValue(selectedReturn, ['status'], 'Pending'))}>
                  {String(getValue(selectedReturn, ['status'], 'Pending')).replace(/_/g, ' ')}
                </Badge>
              </div>
            </Col>
            <Col xs={12}>
              <small className="text-muted">Reason</small>
              <div className="border rounded bg-light p-3">{getValue(selectedReturn, ['reason'])}</div>
            </Col>
          </Row>

          {loadingDetail ? (
            <div className="text-center text-muted py-5">Loading order detail...</div>
          ) : detailItems.length ? (
            <Table responsive bordered hover className="mb-0 align-middle">
              <thead>
                <tr>
                  <th>No.</th>
                  <th>Product Code</th>
                  <th>Product Name</th>
                  <th className="text-end">Order Quantity</th>
                  <th className="text-end">Return Quantity</th>
                </tr>
              </thead>
              <tbody>
                {detailItems.map((item, index) => {
                  const itemCode = getValue(item, ['item_code', 'itemCode', 'ItemCode']);
                  const orderLine = Array.isArray(orderItems)
                    ? orderItems.find((line) => String(getValue(line, ['item_code', 'itemCode', 'ItemCode'], '')) === String(itemCode))
                    : null;

                  return (
                    <tr key={`${itemCode}-${index}`}>
                      <td>{index + 1}</td>
                      <td className="fw-semibold">{itemCode}</td>
                      <td>
                        {getValue(item, ['item_name', 'itemName', 'description'], getValue(orderLine, ['item_name', 'itemName', 'description']))}
                      </td>
                      <td className="text-end">{getValue(orderLine || item, ['quantity', 'qty', 'Quantity'], 0)}</td>
                      <td className="text-end fw-semibold">{getValue(item, ['quantity', 'qty'], 0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          ) : (
            <div className="text-center text-muted py-5">No product detail found.</div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeDetail} disabled={loadingDetail}>Close</Button>
          <Button variant="danger" disabled={loadingDetail} onClick={() => showAlert('Reject endpoint is not available yet', 'warning')}>
            <i className="ti ti-x me-1" /> Reject
          </Button>
          <Button variant="success" disabled={loadingDetail} onClick={() => showAlert('Approve endpoint is not available yet', 'warning')}>
            <i className="ti ti-check me-1" /> Approve
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
