import { useEffect, useState } from 'react';
import { Alert, Badge, Button, Col, Modal, Row, Spinner, Table } from 'react-bootstrap';
import OrderServices from '../../../services/customer-portal/OrderServices';

const formatNumber = (value) => Number(value || 0).toLocaleString('id-ID', { maximumFractionDigits: 3 });
const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }).format(date);
};

export default function SalesOrderDetailModal({ order, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setDetail(null);
    const fetchDetail = async () => {
      try {
        const response = await OrderServices.getDetailOrder(order.id);
        const data = response?.data?.data;
        if (response?.data?.success === false || !data || typeof data !== 'object' || Array.isArray(data)) {
          throw new Error(response?.data?.message || 'Failed to load Sales Order detail.');
        }
        if (active) setDetail(data);
      } catch (err) {
        if (active) setError(err?.response?.data?.message || err.message || 'Failed to load Sales Order detail.');
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchDetail();
    return () => {
      active = false;
    };
  }, [order.id, attempt]);

  const lines = Array.isArray(detail?.details) ? detail.details : [];

  return (
    <Modal show onHide={onClose} size="xl" centered scrollable>
      <Modal.Header closeButton>
        <Modal.Title>Sales Order Detail — {order.number}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {loading ? (
          <div className="text-center text-muted py-5" role="status">
            <Spinner size="sm" className="me-2" />
            Loading Sales Order detail...
          </div>
        ) : error ? (
          <Alert variant="danger">
            {error}
            <Button variant="outline-danger" size="sm" className="ms-3" onClick={() => setAttempt((value) => value + 1)}>
              Retry
            </Button>
          </Alert>
        ) : (
          <>
            <Row className="g-3 mb-4">
              <Col sm={6} lg={3}>
                <small className="text-muted">Customer</small>
                <div className="fw-semibold">{detail?.customer_name || '-'}</div>
                <small>{detail?.card_code || ''}</small>
              </Col>
              <Col sm={6} lg={3}>
                <small className="text-muted">Order Date</small>
                <div>{formatDate(detail?.doc_date)}</div>
              </Col>
              <Col sm={6} lg={3}>
                <small className="text-muted">Due Date</small>
                <div>{formatDate(detail?.doc_due_date)}</div>
              </Col>
              <Col sm={6} lg={3}>
                <small className="text-muted">Status</small>
                <div>
                  <Badge bg="info">{String(detail?.status || 'Unknown').replaceAll('_', ' ')}</Badge>
                </div>
              </Col>
            </Row>
            <Table responsive bordered className="align-middle mb-0">
              <thead>
                <tr>
                  <th>Product Code</th>
                  <th>Product Name</th>
                  <th>Warehouse</th>
                  <th className="text-end">Quantity</th>
                  <th>Unit</th>
                  <th className="text-end">Unit Price</th>
                  <th className="text-end">Line Total</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, index) => (
                  <tr key={line.id ?? index}>
                    <td>{line.item_code || '-'}</td>
                    <td>{line.item_name || '-'}</td>
                    <td>{line.whs_code || '-'}</td>
                    <td className="text-end">{formatNumber(line.quantity)}</td>
                    <td>{line.unit_msr || '-'}</td>
                    <td className="text-end">{formatNumber(line.unit_price ?? line.price)}</td>
                    <td className="text-end">
                      {formatNumber(line.line_total ?? Number(line.quantity || 0) * Number(line.unit_price ?? line.price ?? 0))}
                    </td>
                  </tr>
                ))}
                {!lines.length && (
                  <tr>
                    <td colSpan={7} className="text-center text-muted py-4">
                      No product detail found for this Sales Order.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
