import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import moment from 'moment';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Dropdown from 'react-bootstrap/Dropdown';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import Row from 'react-bootstrap/Row';
import Spinner from 'react-bootstrap/Spinner';
import Stack from 'react-bootstrap/Stack';
import Table from 'react-bootstrap/Table';

import ConfirmDialog from 'components/ConfirmDialog';
import MainCard from 'components/MainCard';
import OrderServices from 'services/customer-portal/OrderServices';
import { currency } from '../../../utils/global';
import { useAlert } from '../../../utils/alertContext';

const MAX_ATTACHMENTS = 5;
const MAX_ATTACHMENT_SIZE = 1024 * 1024;
const valueOf = (source = {}, keys = [], fallback = '-') => {
  const key = keys.find((keyName) => source?.[keyName] !== undefined && source?.[keyName] !== null && source?.[keyName] !== '');
  return key ? source[key] : fallback;
};
const payloadOf = (response) => response?.data?.data ?? response?.data ?? {};
const rowsOf = (payload) => {
  if (Array.isArray(payload)) return payload;
  const rows = payload?.data || payload?.items || payload?.results || payload?.orders || payload?.sales_returns || payload?.salesReturns;
  if (Array.isArray(rows)) return rows;
  return rows && typeof rows === 'object' ? [rows] : [];
};
const linesOf = (source = {}) => {
  const lines = valueOf(source, ['details', 'lines', 'items', 'return_items', 'returnItems'], []);
  return Array.isArray(lines) ? lines : [];
};
const numberOf = (source, keys) => Number(valueOf(source, keys, 0)) || 0;
const orderLinesOf = (order = {}) => {
  const lines = valueOf(order, ['details', 'lines', 'document_lines', 'documentLines', 'DocumentLines', 'items', 'products'], []);
  return Array.isArray(lines) ? lines : [];
};
const productWeight = (name = '') => {
  const matches = [...String(name).matchAll(/(\d+(?:[.,]\d+)?)\s*(kg|kilogram|g|gr|gram)\b/gi)];
  const match = matches.at(-1);
  if (!match) return 0;
  const weight = Number(String(match[1]).replace(',', '.')) || 0;
  return ['g', 'gr', 'gram'].includes(match[2].toLowerCase()) ? weight / 1000 : weight;
};
const totalOrderKg = (order = {}) =>
  orderLinesOf(order).reduce(
    (total, line) =>
      total +
      productWeight(valueOf(line, ['item_name', 'itemName', 'ItemName', 'Dscription', 'description', 'item_description'], '')) *
        numberOf(line, ['quantity', 'qty', 'Quantity']),
    0
  );
const kgText = (value) => `${quantityText(value)} Kg`;
const normalizedStatus = (value) =>
  String(value || '')
    .trim()
    .toUpperCase();
const quantityText = (value) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 6 }).format(Number(value) || 0);
const dateText = (value) => {
  const compact = moment(String(value || ''), 'YYYYMMDD', true);
  if (compact.isValid()) return compact.format('DD MMM YYYY');
  const date = moment(value);
  return date.isValid() ? date.format('DD MMM YYYY') : '-';
};
const returnStatusColor = (value) => {
  const status = normalizedStatus(value);
  if (['APPROVED', 'COMPLETED', 'SUCCESS'].includes(status)) return 'success';
  if (['REJECTED', 'FAILED', 'CANCELLED', 'CANCELED'].includes(status)) return 'danger';
  return 'warning';
};

export default function ReturnRequestsWidget() {
  const { showAlert } = useAlert();
  const [orders, setOrders] = useState([]);
  const [returns, setReturns] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [details, setDetails] = useState({});
  const [detailErrors, setDetailErrors] = useState({});
  const [loadingDetailId, setLoadingDetailId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [request, setRequest] = useState(null);
  const [history, setHistory] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [viewOrder, setViewOrder] = useState(null);
  const [loadingViewOrderId, setLoadingViewOrderId] = useState(null);
  const [orderToComplete, setOrderToComplete] = useState(null);
  const [receivingOrderId, setReceivingOrderId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [ordersResponse, returnsResponse] = await Promise.all([
        OrderServices.getListOrder({ status: 'DELIVERY' }),
        OrderServices.getRetur()
      ]);
      if (ordersResponse?.data?.success === false || returnsResponse?.data?.success === false) {
        throw new Error(ordersResponse?.data?.message || returnsResponse?.data?.message || 'Failed to load return data');
      }
      setOrders(rowsOf(payloadOf(ordersResponse)).filter((order) => normalizedStatus(order.status) === 'DELIVERY'));
      setReturns(rowsOf(payloadOf(returnsResponse)));
    } catch (loadError) {
      setOrders([]);
      setReturns([]);
      setError(loadError?.response?.data?.message || loadError?.message || 'Failed to load return data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const summaries = useMemo(() => {
    const result = new Map();
    returns.forEach((returnRequest) => {
      const parentDo = valueOf(returnRequest, ['do_number', 'do_num', 'doNumber', 'doNum', 'doc_num', 'docNum'], '');
      const items = linesOf(returnRequest).length ? linesOf(returnRequest) : [returnRequest];
      items.forEach((item) => {
        const doNumber = valueOf(item, ['do_number', 'do_num', 'doNumber', 'doNum', 'doc_num', 'docNum'], parentDo);
        const itemCode = valueOf(item, ['item_code', 'itemCode', 'ItemCode'], '');
        if (!doNumber || !itemCode) return;
        const key = `${String(doNumber).trim()}::${String(itemCode).trim().toUpperCase()}`;
        const current = result.get(key) || { doNumber, itemCode, returned: 0, entries: [] };
        const itemQuantity = numberOf(item, ['quantity', 'qty', 'return_quantity', 'returnQuantity']);
        current.returned += itemQuantity;
        current.entries.push({ request: returnRequest, item, quantity: itemQuantity });
        result.set(key, current);
      });
    });
    return result;
  }, [returns]);

  const toggleDetails = async (order) => {
    const orderId = String(order.id);
    if (expandedId === orderId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(orderId);
    if (Object.prototype.hasOwnProperty.call(details, orderId)) return;
    const soNumber = valueOf(order, ['sap_doc_num', 'sapDocNum', 'doc_num', 'docNum', 'order_no', 'orderNo'], '');
    if (!soNumber) {
      setDetailErrors((current) => ({ ...current, [orderId]: 'Sales Order number is not available.' }));
      return;
    }
    setLoadingDetailId(orderId);
    try {
      const response = await OrderServices.getDoBySo(soNumber);
      if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to load Delivery Order details');
      setDetails((current) => ({ ...current, [orderId]: rowsOf(payloadOf(response)) }));
    } catch (detailError) {
      setDetailErrors((current) => ({
        ...current,
        [orderId]: detailError?.response?.data?.message || detailError?.message || 'Failed to load Delivery Order details'
      }));
    } finally {
      setLoadingDetailId(null);
    }
  };

  const openRequest = (order, detail, summary) => {
    const delivered = numberOf(detail, ['Delivered_Qty', 'delivered_qty', 'deliveredQty', 'quantity', 'qty']);
    const returned = summary?.returned || 0;
    const remaining = Math.max(delivered - returned, 0);
    if (!remaining) {
      showAlert('The delivered quantity has been fully returned', 'warning');
      return;
    }
    setRequest({ order, detail, delivered, returned, remaining });
    setQuantity('');
    setReason('');
    setAttachments([]);
  };

  const closeRequest = () => {
    if (submitting) return;
    setRequest(null);
    setQuantity('');
    setReason('');
    setAttachments([]);
  };

  const selectFiles = (event) => {
    const selected = Array.from(event.target.files || []);
    event.target.value = '';
    const invalid = selected.filter((file) => file.size > MAX_ATTACHMENT_SIZE);
    if (invalid.length) showAlert(`${invalid.map((file) => file.name).join(', ')} exceeds 1 MB`, 'danger');
    setAttachments((current) => [...current, ...selected.filter((file) => file.size <= MAX_ATTACHMENT_SIZE)].slice(0, MAX_ATTACHMENTS));
  };

  const submit = async () => {
    const returnQuantity = Math.min(Math.max(Number(quantity) || 0, 0), request.remaining);
    if (!reason.trim()) {
      showAlert('Reason is required', 'danger');
      return;
    }
    if (!returnQuantity) {
      showAlert('Return quantity must be greater than 0', 'danger');
      return;
    }
    const { order, detail } = request;
    const doNumber = valueOf(detail, ['DocNum', 'doc_num', 'docNum', 'do_num', 'doNumber'], '');
    const doDate = valueOf(detail, ['DocDate', 'doc_date', 'docDate', 'do_date', 'doDate'], '');
    const doQuantity = numberOf(detail, ['Delivered_Qty', 'delivered_qty', 'deliveredQty']);
    const baseline = valueOf(detail, ['BaseLine', 'base_line', 'baseLine'], '');
    setSubmitting(true);
    try {
      const response = await OrderServices.postRequestRetur({
        sales_order_id: order.id,
        do_num: doNumber,
        do_date: doDate,
        baseline,
        do_quantity: doQuantity,
        do_status: valueOf(detail, ['Status', 'status'], ''),
        items: [
          {
            sales_order_detail_id: order.id,
            do_num: doNumber,
            do_date: doDate,
            baseline,
            do_quantity: doQuantity,
            item_code: valueOf(detail, ['ItemCode', 'item_code', 'itemCode'], ''),
            item_description: valueOf(detail, ['ItemDescription', 'item_description', 'itemDescription'], ''),
            delivered_quantity: doQuantity,
            quantity: returnQuantity,
            reason: reason.trim()
          }
        ],
        attachments
      });
      if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to submit return request');
      showAlert(response?.data?.message || 'Return request submitted successfully', 'success');
      setRequest(null);
      setQuantity('');
      setReason('');
      setAttachments([]);
      await load();
    } catch (submitError) {
      showAlert(submitError?.response?.data?.message || submitError?.message || 'Failed to submit return request', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const openOrderDetail = async (order) => {
    if (!order?.id) {
      showAlert('Order ID not found', 'danger');
      return;
    }
    setViewOrder(order);
    setLoadingViewOrderId(order.id);
    try {
      const response = await OrderServices.getDetailOrder(order.id);
      if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to fetch sales order detail');
      const payload = payloadOf(response);
      const detail = Array.isArray(payload) ? payload[0] : payload;
      setViewOrder({ ...order, ...(detail || {}) });
    } catch (detailError) {
      showAlert(detailError?.response?.data?.message || detailError?.message || 'Failed to fetch sales order detail', 'danger');
    } finally {
      setLoadingViewOrderId(null);
    }
  };

  const completeOrder = async () => {
    const order = orderToComplete;
    if (!order?.id) {
      showAlert('Order ID not found', 'danger');
      return;
    }
    setReceivingOrderId(order.id);
    try {
      const response = await OrderServices.postArrive(order.id);
      if (!response?.data?.success) throw new Error(response?.data?.message || 'Failed to complete sales order');
      setOrders((current) => current.filter((item) => String(item.id) !== String(order.id)));
      showAlert(response.data.message || 'Sales order completed successfully', 'success');
    } catch (completeError) {
      showAlert(completeError?.response?.data?.message || completeError?.message || 'Failed to complete sales order', 'danger');
    } finally {
      setReceivingOrderId(null);
      setOrderToComplete(null);
    }
  };

  return (
    <>
      <MainCard
        className="claim-transaction-card complete-order-card border"
        title={
          <Stack direction="horizontal" className="justify-content-between align-items-start" gap={3}>
            <Stack gap={1}>
              <h5 className="mb-0">Order Delivery</h5>
              <span className="text-muted f-12">View delivery orders and submit return requests for eligible items.</span>
            </Stack>
            <Button variant="outline-primary" size="sm" onClick={load} disabled={loading} data-widget-action="sync">
              <i className={`ti ti-refresh me-1 ${loading ? 'spin' : ''}`} /> Refresh
            </Button>
          </Stack>
        }
      >
        {loading ? (
          <div className="sm-widget-state">
            <Spinner size="sm" />
            <span>Loading delivery sales orders...</span>
          </div>
        ) : error ? (
          <div className="sm-widget-state text-danger">{error}</div>
        ) : (
          <Table responsive hover className="mb-0 align-middle">
            <thead>
              <tr>
                <th />
                <th>No. SO</th>
                <th>Depo</th>
                <th>Date</th>
                <th>Total Order (Kg)</th>
                <th>Status</th>
                <th className="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.length ? (
                orders.map((order) => {
                  const orderId = String(order.id);
                  const expanded = expandedId === orderId;
                  const orderDetails = details[orderId] || [];
                  return (
                    <Fragment key={orderId}>
                      <tr>
                        <td className="text-center">
                          <Button
                            variant="warning"
                            size="sm"
                            disabled={loadingDetailId === orderId}
                            onClick={() => toggleDetails(order)}
                            data-widget-action="view"
                            aria-label={expanded ? 'Hide Delivery Order details' : 'Show Delivery Order details'}
                          >
                            <i
                              className={`ti ${loadingDetailId === orderId ? 'ti-loader-2' : expanded ? 'ti-chevron-up' : 'ti-chevron-down'}`}
                            />
                          </Button>
                        </td>
                        <td className="fw-semibold">
                          {valueOf(order, ['sap_doc_num', 'sapDocNum', 'doc_num', 'docNum', 'order_no', 'orderNo'])}
                        </td>
                        <td>
                          {valueOf(order, ['depo', 'depot', 'warehouse_name', 'warehouseName'])} -{' '}
                          {valueOf(order, ['customer_name', 'customerName', 'card_name', 'cardName'])}
                        </td>
                        <td>{dateText(valueOf(order, ['doc_date', 'docDate', 'created_at', 'createdAt'], ''))}</td>
                        <td className="fw-semibold">{kgText(totalOrderKg(order))}</td>
                        <td>
                          <Badge bg="info">Delivery</Badge>
                        </td>
                        <td className="text-center">
                          <Dropdown align="end">
                            <Dropdown.Toggle size="sm" variant="outline-primary">
                              <i className="ti ti-dots-vertical me-1" /> Actions
                            </Dropdown.Toggle>
                            <Dropdown.Menu>
                              <Dropdown.Item onClick={() => openOrderDetail(order)} data-widget-action="view">
                                <i className="ti ti-eye text-primary me-2" /> Detail
                              </Dropdown.Item>
                              <Dropdown.Item
                                className="text-success"
                                onClick={() => setOrderToComplete(order)}
                                data-widget-action="approve"
                              >
                                <i className="ti ti-circle-check me-2" /> Complete Order
                              </Dropdown.Item>
                            </Dropdown.Menu>
                          </Dropdown>
                        </td>
                      </tr>
                      {expanded ? (
                        <tr className="bg-light">
                          <td colSpan={7} className="p-3">
                            {loadingDetailId === orderId ? (
                              <div className="text-center text-muted py-4">Loading Delivery Order details...</div>
                            ) : detailErrors[orderId] ? (
                              <div className="text-center text-danger py-4">{detailErrors[orderId]}</div>
                            ) : (
                              <Table responsive size="sm" className="mb-0 align-middle bg-white">
                                <thead>
                                  <tr>
                                    <th>DO Number</th>
                                    <th>Item</th>
                                    <th className="text-end">Delivered</th>
                                    <th className="text-end">Returned</th>
                                    <th className="text-end">Remaining</th>
                                    <th>Status Retur</th>
                                    <th>Action</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {orderDetails.length ? (
                                    orderDetails.map((detail, index) => {
                                      const doNumber = valueOf(detail, ['DocNum', 'doc_num', 'docNum', 'do_num', 'doNumber'], '');
                                      const itemCode = valueOf(detail, ['ItemCode', 'item_code', 'itemCode'], '');
                                      const summary = summaries.get(`${String(doNumber).trim()}::${String(itemCode).trim().toUpperCase()}`);
                                      const delivered = numberOf(detail, [
                                        'Delivered_Qty',
                                        'delivered_qty',
                                        'deliveredQty',
                                        'quantity',
                                        'qty'
                                      ]);
                                      const returned = summary?.returned || 0;
                                      const remaining = Math.max(delivered - returned, 0);
                                      const latestStatus = valueOf(
                                        summary?.entries?.at(-1)?.request,
                                        ['status', 'return_status', 'returnStatus'],
                                        '-'
                                      );
                                      return (
                                        <tr key={`${doNumber}-${itemCode}-${index}`}>
                                          <td className="fw-semibold">{doNumber || '-'}</td>
                                          <td>
                                            <span className="fw-semibold">{itemCode || '-'}</span>
                                            <small className="d-block text-muted">
                                              {valueOf(detail, ['ItemDescription', 'item_description', 'itemDescription'], '-')}
                                            </small>
                                          </td>
                                          <td className="text-end">{quantityText(delivered)}</td>
                                          <td className="text-end">{quantityText(returned)}</td>
                                          <td className="text-end fw-semibold text-success">{quantityText(remaining)}</td>
                                          <td>
                                            {summary ? (
                                              <Button
                                                variant="link"
                                                className="p-0 text-decoration-none"
                                                onClick={() =>
                                                  setHistory({
                                                    ...summary,
                                                    delivered,
                                                    remaining,
                                                    description: valueOf(detail, ['ItemDescription'], '-')
                                                  })
                                                }
                                                data-widget-action="view"
                                              >
                                                <Badge bg={returnStatusColor(latestStatus)}>
                                                  {String(latestStatus).replaceAll('_', ' ')}
                                                </Badge>
                                                <small className="d-block">{summary.entries.length} return detail</small>
                                              </Button>
                                            ) : (
                                              '-'
                                            )}
                                          </td>
                                          <td>
                                            <Button
                                              variant="warning"
                                              size="sm"
                                              disabled={!remaining}
                                              onClick={() => openRequest(order, detail, summary)}
                                              data-widget-action="add"
                                            >
                                              <i className="ti ti-package-export me-1" />
                                              {!remaining ? 'Fully Returned' : summary ? 'Return Remaining' : 'Request Return'}
                                            </Button>
                                          </td>
                                        </tr>
                                      );
                                    })
                                  ) : (
                                    <tr>
                                      <td colSpan={7} className="text-center text-muted py-4">
                                        Delivery Order details are not available.
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </Table>
                            )}
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="text-center text-muted py-4">
                    No delivery sales orders.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        )}
      </MainCard>

      <Modal
        show={Boolean(viewOrder)}
        onHide={() => loadingViewOrderId === null && setViewOrder(null)}
        size="xl"
        centered
        scrollable
        data-widget-key="return-requests"
      >
        <Modal.Header closeButton={loadingViewOrderId === null}>
          <Modal.Title>Sales Order Detail</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {viewOrder ? (
            <>
              <Row className="g-3 mb-4">
                <Col sm={6} lg={3}>
                  <small className="text-muted">No. Sales Order</small>
                  <div className="fw-semibold">
                    {valueOf(viewOrder, ['sap_doc_num', 'sapDocNum', 'doc_num', 'docNum', 'order_no', 'orderNo'])}
                  </div>
                </Col>
                <Col sm={6} lg={3}>
                  <small className="text-muted">Customer</small>
                  <div className="fw-semibold">{valueOf(viewOrder, ['customer_name', 'customerName', 'card_name', 'cardName'])}</div>
                </Col>
                <Col sm={6} lg={2}>
                  <small className="text-muted">Depo</small>
                  <div className="fw-semibold">{valueOf(viewOrder, ['depo', 'depot', 'warehouse_name', 'warehouseName'])}</div>
                </Col>
                <Col sm={6} lg={2}>
                  <small className="text-muted">Order Date</small>
                  <div className="fw-semibold">{dateText(valueOf(viewOrder, ['doc_date', 'docDate', 'created_at', 'createdAt'], ''))}</div>
                </Col>
                <Col sm={6} lg={2}>
                  <small className="text-muted">Status</small>
                  <div>
                    <Badge bg="info">{valueOf(viewOrder, ['status'], 'Delivery')}</Badge>
                  </div>
                </Col>
              </Row>
              {loadingViewOrderId !== null ? (
                <div className="text-center text-muted py-5">Loading sales order detail...</div>
              ) : orderLinesOf(viewOrder).length ? (
                <Table responsive bordered hover className="mb-0 align-middle">
                  <thead>
                    <tr>
                      <th>No.</th>
                      <th>Product Code</th>
                      <th>Product Name</th>
                      <th className="text-end">Quantity</th>
                      <th className="text-end">Unit Price</th>
                      <th className="text-end">Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderLinesOf(viewOrder).map((line, index) => {
                      const lineQuantity = numberOf(line, ['quantity', 'qty', 'Quantity']);
                      const unitPrice = numberOf(line, ['unit_price', 'unitPrice', 'price', 'Price']);
                      const lineTotal = numberOf(line, ['line_total', 'lineTotal', 'LineTotal']) || lineQuantity * unitPrice;
                      return (
                        <tr key={`${valueOf(line, ['id', 'item_code', 'itemCode', 'ItemCode'], index)}-${index}`}>
                          <td>{index + 1}</td>
                          <td className="fw-semibold">{valueOf(line, ['item_code', 'itemCode', 'ItemCode'])}</td>
                          <td>{valueOf(line, ['item_name', 'itemName', 'ItemName', 'description', 'Dscription', 'item_description'])}</td>
                          <td className="text-end">{quantityText(lineQuantity)}</td>
                          <td className="text-end">{currency(unitPrice)}</td>
                          <td className="text-end fw-semibold">{currency(lineTotal)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              ) : (
                <div className="text-center text-muted py-5">No product detail found for this sales order.</div>
              )}
            </>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setViewOrder(null)} disabled={loadingViewOrderId !== null} data-widget-action="none">
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={Boolean(request)} onHide={closeRequest} size="xl" centered scrollable data-widget-key="return-requests">
        <Modal.Header closeButton={!submitting}>
          <Modal.Title>Request Return</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {request ? (
            <>
              <Row className="g-3 mb-4">
                <Col sm={6} lg>
                  <small className="text-muted">No. Sales Order</small>
                  <div className="fw-semibold">{valueOf(request.order, ['sap_doc_num', 'sapDocNum', 'doc_num', 'docNum'])}</div>
                </Col>
                <Col sm={6} lg>
                  <small className="text-muted">No. Delivery Order</small>
                  <div className="fw-semibold">{valueOf(request.detail, ['DocNum', 'doc_num', 'docNum'])}</div>
                </Col>
                <Col sm={6} lg>
                  <small className="text-muted">Customer</small>
                  <div className="fw-semibold">{valueOf(request.order, ['customer_name', 'customerName', 'card_name', 'cardName'])}</div>
                </Col>
                <Col sm={6} lg>
                  <small className="text-muted">DO Date</small>
                  <div className="fw-semibold">{dateText(valueOf(request.detail, ['DocDate', 'doc_date', 'docDate'], ''))}</div>
                </Col>
              </Row>
              <Table responsive bordered className="mb-4">
                <thead>
                  <tr>
                    <th>Product Code</th>
                    <th>Product Name</th>
                    <th>Delivered</th>
                    <th>Returned</th>
                    <th>Remaining</th>
                    <th>Qty Retur</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{valueOf(request.detail, ['ItemCode', 'item_code', 'itemCode'])}</td>
                    <td>{valueOf(request.detail, ['ItemDescription', 'item_description', 'itemDescription'])}</td>
                    <td>{quantityText(request.delivered)}</td>
                    <td>{quantityText(request.returned)}</td>
                    <td>{quantityText(request.remaining)}</td>
                    <td>
                      <Form.Control
                        type="number"
                        min={0}
                        max={request.remaining}
                        value={quantity}
                        onChange={(event) => setQuantity(event.target.value)}
                      />
                    </td>
                  </tr>
                </tbody>
              </Table>
              <Form.Group className="mb-3">
                <Form.Label>Reason</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Enter return reason"
                  required
                />
              </Form.Group>
              <Form.Group>
                <Form.Label>Attachment</Form.Label>
                <Form.Control type="file" multiple onChange={selectFiles} disabled={attachments.length >= MAX_ATTACHMENTS} />
                <Form.Text>Maximum 5 files, 1 MB per file.</Form.Text>
                {attachments.length ? <div className="mt-2 text-muted">{attachments.map((file) => file.name).join(', ')}</div> : null}
              </Form.Group>
            </>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeRequest} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="warning" onClick={submit} disabled={submitting} data-widget-action="add">
            {submitting ? 'Submitting...' : 'Submit Request Return'}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={Boolean(history)} onHide={() => setHistory(null)} size="lg" centered scrollable data-widget-key="return-requests">
        <Modal.Header closeButton>
          <Modal.Title>Return Detail</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {history ? (
            <>
              <Row className="g-3 mb-4">
                <Col sm={6}>
                  <small className="text-muted">DO Number</small>
                  <div>{history.doNumber}</div>
                </Col>
                <Col sm={6}>
                  <small className="text-muted">Item</small>
                  <div>{history.itemCode}</div>
                  <small>{history.description}</small>
                </Col>
                <Col sm={4}>
                  <small>Delivered</small>
                  <div>{quantityText(history.delivered)}</div>
                </Col>
                <Col sm={4}>
                  <small>Returned</small>
                  <div>{quantityText(history.returned)}</div>
                </Col>
                <Col sm={4}>
                  <small>Remaining</small>
                  <div>{quantityText(history.remaining)}</div>
                </Col>
              </Row>
              <Table responsive bordered>
                <thead>
                  <tr>
                    <th>No.</th>
                    <th>Date</th>
                    <th>Qty</th>
                    <th>Reason</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.entries.map(({ request: itemRequest, item, quantity: itemQuantity }, index) => {
                    const status = valueOf(itemRequest, ['status', 'return_status', 'returnStatus'], 'PENDING');
                    return (
                      <tr key={itemRequest.id || index}>
                        <td>{index + 1}</td>
                        <td>{dateText(valueOf(itemRequest, ['created_at', 'createdAt', 'request_date'], ''))}</td>
                        <td>{quantityText(itemQuantity)}</td>
                        <td>{valueOf(item, ['reason'], valueOf(itemRequest, ['reason'], '-'))}</td>
                        <td>
                          <Badge bg={returnStatusColor(status)}>{String(status).replaceAll('_', ' ')}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setHistory(null)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      <ConfirmDialog
        show={Boolean(orderToComplete)}
        title="Complete Sales Order"
        subTitle={`Are you sure you want to complete sales order ${valueOf(
          orderToComplete,
          ['sap_doc_num', 'sapDocNum', 'doc_num', 'docNum', 'order_no', 'orderNo'],
          'this order'
        )}?`}
        onSubmit={completeOrder}
        onCancel={() => setOrderToComplete(null)}
        loading={receivingOrderId !== null}
        widgetKey="return-requests"
      />
    </>
  );
}
