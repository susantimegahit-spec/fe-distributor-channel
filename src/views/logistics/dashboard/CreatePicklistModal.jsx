import { useState } from 'react';
import Select from 'react-select';
import { Alert, Badge, Button, Col, Form, Modal, Row, Stack, Table } from 'react-bootstrap';
import PicklistRecommendations from './PicklistRecommendations';
import SalesOrderDetailModal from './SalesOrderDetailModal';
import OrderServices from '../../../services/customer-portal/OrderServices';

const approved = (order) =>
  String(order.status || '')
    .trim()
    .toUpperCase() === 'ORDER_APPROVED';
const orderNumber = (order) => order.sap_doc_num || order.order_no || order.id;
const formatNumber = (value) => Number(value || 0).toLocaleString('id-ID', { maximumFractionDigits: 3 });
const licensePlateOptions = [
  { value: 'L 1234 AB', label: 'L 1234 AB — Truck (Mockup)' },
  { value: 'L 5678 CD', label: 'L 5678 CD — Box (Mockup)' },
  { value: 'B 9012 EF', label: 'B 9012 EF — Trailer (Mockup)' }
];
const driverOptions = [
  { value: 'driver-1', label: 'Driver 1 (Mockup)' },
  { value: 'driver-2', label: 'Driver 2 (Mockup)' }
];
const checkerOptions = [
  { value: 'checker-1', label: 'Checker 1 (Mockup)' },
  { value: 'checker-2', label: 'Checker 2 (Mockup)' }
];
const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const getUnitWeight = (line) => {
  const match = [...String(line.item_name || '').matchAll(/(\d+(?:[.,]\d+)?)\s*(kg|kilogram|g|gr|gram)\b/gi)].at(-1);
  if (!match) return '';
  return Number(match[1].replace(',', '.')) / (/^(g|gr|gram)$/i.test(match[2]) ? 1000 : 1);
};

export default function CreatePicklistModal({ onClose, order }) {
  const [form, setForm] = useState({ postingDate: today(), dueDate: today(), comments: '' });
  const [lines, setLines] = useState([]);
  const [shippingType, setShippingType] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [driver, setDriver] = useState(null);
  const [checker, setChecker] = useState(null);
  const [selecting, setSelecting] = useState(false);
  const [orders, setOrders] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [resetting, setResetting] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [detailOrder, setDetailOrder] = useState(null);
  const [capacity, setCapacity] = useState(order?.weight || '');
  const totalWeight = lines.reduce((total, line) => total + (Number(line.quantity) || 0) * (Number(line.unitWeight) || 0), 0);
  const orderCount = new Set(lines.map((line) => line.orderId)).size;
  const allowsMultipleOrders = shippingType === 'internal';
  const singleOrderLimitReached = !allowsMultipleOrders && orderCount >= 1;
  const filteredOrders = orders.filter((item) =>
    `${orderNumber(item)} ${item.customer_name || ''} ${item.card_code || ''}`.toLowerCase().includes(query.toLowerCase())
  );
  const changeLine = (id, field, value) =>
    setLines((current) => current.map((line) => (line.id === id ? { ...line, [field]: value } : line)));
  const requestClose = () => (lines.length || form.comments ? setConfirmClose(true) : onClose());

  const fetchOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await OrderServices.getListOrders({ status: 'ORDER_APPROVED' });
      if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to load Sales Orders.');
      const payload = response?.data?.data ?? response?.data;
      const list = Array.isArray(payload) ? payload : payload?.orders || payload?.sales_orders || payload?.items || payload?.data;
      if (!Array.isArray(list)) throw new Error('Sales Order response is invalid.');
      setOrders(list.filter(approved));
    } catch (err) {
      setOrders([]);
      setError(err?.response?.data?.message || err.message || 'Failed to load Sales Orders.');
    } finally {
      setLoading(false);
    }
  };
  const openSelection = () => {
    if (!shippingType || singleOrderLimitReached) return;
    setSelectedIds([]);
    setQuery('');
    setSelecting(true);
    fetchOrders();
  };
  const addOrders = async () => {
    if (adding || !selectedIds.length) return;
    if (!shippingType || (!allowsMultipleOrders && new Set([...lines.map((line) => line.orderId), ...selectedIds]).size > 1)) {
      setError('External and Pickup shipping allow only one Sales Order.');
      return;
    }
    setAdding(true);
    setError('');
    try {
      const details = await Promise.all(
        selectedIds.map(async (id) => {
          const response = await OrderServices.getDetailOrder(id);
          if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to load Sales Order details.');
          const detail = response?.data?.data;
          if (!detail || !approved(detail)) throw new Error(`SO ${id} is no longer Order Approved. Refresh the list.`);
          if (!Array.isArray(detail.details) || !detail.details.length) throw new Error(`SO ${orderNumber(detail)} has no items.`);
          return detail.details.map((item, index) => ({
            id: `${id}-${item.id ?? index}`,
            orderId: String(id),
            orderNumber: orderNumber(detail),
            customer: detail.customer_name,
            depo: detail.depo,
            address: detail.address || detail.bill_to_address || detail.Address,
            destinationCode: detail.card_code,
            itemCode: item.item_code,
            itemName: item.item_name,
            warehouse: item.whs_code,
            unit: item.unit_msr,
            orderedQuantity: Number(item.quantity) || 0,
            quantity: Number(item.quantity) || 0,
            unitWeight: getUnitWeight(item)
          }));
        })
      );
      setLines((current) => {
        const existing = new Set(current.map((line) => line.id));
        return [...current, ...details.flat().filter((line) => !existing.has(line.id))];
      });
      setSelecting(false);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to add Sales Orders.');
    } finally {
      setAdding(false);
    }
  };

  return (
    <>
      <Modal show={!selecting && !resetting && !confirmClose && !detailOrder} onHide={requestClose} fullscreen scrollable>
        <Modal.Header closeButton>
          <Modal.Title>
            Create Picklist{' '}
            <Badge bg="light" text="secondary" className="ms-2 fs-6">
              Mockup
            </Badge>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="g-3 mb-4">
            <Col md={4}>
              <Form.Label htmlFor="picklist-shipping-type">Shipping Type *</Form.Label>
              <Form.Select
                id="picklist-shipping-type"
                value={shippingType}
                onChange={(event) => {
                  if (event.target.value !== 'internal' && orderCount > 1) {
                    setError('Remove extra Sales Orders before changing shipping type. External and Pickup allow only one Sales Order.');
                    return;
                  }
                  setError('');
                  setShippingType(event.target.value);
                  setLicensePlate('');
                  setDriver(null);
                  setChecker(null);
                }}
              >
                <option value="">Select shipping type</option>
                <option value="internal">Internal</option>
                <option value="external">External</option>
                <option value="pickup">Pickup</option>
              </Form.Select>
            </Col>
            {shippingType === 'internal' && (
              <Col xs={12}>
                <Row className="g-3">
                  <Col md={4}>
                    <Form.Label htmlFor="picklist-license-plate">License Plate Number *</Form.Label>
                    <Select
                      inputId="picklist-license-plate"
                      classNamePrefix="react-select"
                      options={licensePlateOptions}
                      value={licensePlateOptions.find((option) => option.value === licensePlate) || null}
                      onChange={(option) => setLicensePlate(option?.value || '')}
                      placeholder="Select license plate number"
                      isClearable
                    />
                    <Form.Text>Sample vehicle data for preview.</Form.Text>
                  </Col>
                  <Col md={4}>
                    <Form.Label htmlFor="picklist-driver">Driver</Form.Label>
                    <Select
                      inputId="picklist-driver"
                      classNamePrefix="react-select"
                      options={driverOptions}
                      value={driver}
                      onChange={setDriver}
                      placeholder="Select driver"
                      isClearable
                    />
                  </Col>
                  <Col md={4}>
                    <Form.Label htmlFor="picklist-checker">Checker</Form.Label>
                    <Select
                      inputId="picklist-checker"
                      classNamePrefix="react-select"
                      options={checkerOptions}
                      value={checker}
                      onChange={setChecker}
                      placeholder="Select checker"
                      isClearable
                    />
                  </Col>
                </Row>
              </Col>
            )}
            {shippingType === 'pickup' && (
              <Col md={8} className="d-flex align-items-end">
                <Alert variant="light" className="mb-0 w-100">
                  The customer will collect the goods. Select the Sales Orders and quantities to pick up.
                </Alert>
              </Col>
            )}
          </Row>
          <Row className="g-3 mb-4">
            <Col md={3}>
              <Form.Label>Posting Date *</Form.Label>
              <Form.Control
                type="date"
                value={form.postingDate}
                max={form.dueDate || undefined}
                onChange={(event) => setForm({ ...form, postingDate: event.target.value })}
              />
            </Col>
            <Col md={3}>
              <Form.Label>Due Date *</Form.Label>
              <Form.Control
                type="date"
                min={form.postingDate}
                value={form.dueDate}
                onChange={(event) => setForm({ ...form, dueDate: event.target.value })}
              />
            </Col>
            <Col md={3}>
              <Form.Label>Delivery Order</Form.Label>
              <Form.Control readOnly value={order?.id || 'Not selected'} />
            </Col>
            <Col md={3}>
              <Form.Label>Total Weight Limit (kg)</Form.Label>
              <Form.Control
                type="number"
                min="0.001"
                step="any"
                value={capacity}
                readOnly={Boolean(order)}
                placeholder="Enter weight limit"
                onChange={(event) => setCapacity(event.target.value)}
              />
            </Col>
            <Col xs={12}>
              <Form.Label>Comments</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                placeholder="Add picking or delivery instructions"
                value={form.comments}
                onChange={(event) => setForm({ ...form, comments: event.target.value })}
              />
            </Col>
          </Row>
          {error && <Alert variant="danger">{error}</Alert>}
          {!shippingType && <Alert variant="light">Select a shipping type to add Sales Orders.</Alert>}
          {shippingType && !allowsMultipleOrders && (
            <Alert variant="info">
              External and Pickup allow only one Sales Order. Remove the current SO items or reset to select another SO.
            </Alert>
          )}
          {shippingType && (
            <>
              <Stack direction="horizontal" className="justify-content-between mb-3">
                <div>
                  <h6 className="mb-1">Items</h6>
                  <small className="text-muted">Select approved Sales Orders, then adjust the quantity to pick.</small>
                </div>
                <Stack direction="horizontal" gap={2}>
                  <Button
                    data-permission-action="utility"
                    size="sm"
                    variant="outline-danger"
                    disabled={!lines.length}
                    onClick={() => setResetting(true)}
                  >
                    <i className="ti ti-refresh me-1" /> Reset
                  </Button>
                  <Button
                    data-permission-action="utility"
                    size="sm"
                    variant="outline-primary"
                    disabled={singleOrderLimitReached}
                    onClick={openSelection}
                  >
                    <i className="ti ti-plus me-1" /> Add SO
                  </Button>
                </Stack>
              </Stack>
              <Table responsive bordered className="align-middle">
                <thead>
                  <tr>
                    <th>Item / Sales Order</th>
                    <th>Customer</th>
                    <th>Address</th>
                    <th>Warehouse</th>
                    <th>Ordered Qty</th>
                    <th>Pick Qty</th>
                    <th className="text-end">Total Weight (kg)</th>
                    <th className="text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => (
                    <tr key={line.id}>
                      <td style={{ minWidth: 220 }}>
                        <span className="fw-semibold">{line.itemCode}</span>
                        <Badge
                          as="button"
                          type="button"
                          bg="light"
                          text="primary"
                          className="border ms-2 d-inline-flex align-items-center gap-1"
                          data-permission-action="utility"
                          aria-label={`View sales order ${line.orderNumber} details`}
                          title="Sales Order Detail"
                          onClick={() => setDetailOrder({ id: line.orderId, number: line.orderNumber })}
                        >
                          SO {line.orderNumber}
                          <i className="ti ti-info-circle" aria-hidden="true" />
                        </Badge>
                        <div className="text-muted f-12">{line.itemName || '-'}</div>
                      </td>
                      <td style={{ minWidth: 180 }}>
                        <div className="fw-semibold">{line.customer || '-'}</div>
                        <small className="text-muted d-block">{line.depo || '-'}</small>
                      </td>
                      <td className="text-break" style={{ minWidth: 220, whiteSpace: 'pre-line' }}>
                        {line.address || '-'}
                      </td>
                      <td>{line.warehouse || '-'}</td>
                      <td>
                        {formatNumber(line.orderedQuantity)} {line.unit}
                      </td>
                      <td style={{ minWidth: 130 }}>
                        <Form.Control
                          aria-label={`Pick quantity ${line.itemCode}`}
                          size="sm"
                          type="text"
                          inputMode="decimal"
                          value={line.quantity}
                          isInvalid={
                            !Number.isFinite(Number(line.quantity)) ||
                            Number(line.quantity) <= 0 ||
                            Number(line.quantity) > line.orderedQuantity
                          }
                          onChange={(event) => {
                            const value = event.target.value.replace(',', '.');
                            if (/^\d*\.?\d*$/.test(value)) changeLine(line.id, 'quantity', value);
                          }}
                        />
                        <Form.Control.Feedback type="invalid">
                          Enter a positive quantity up to {line.orderedQuantity}.
                        </Form.Control.Feedback>
                      </td>
                      <td className="text-end fw-semibold">{formatNumber(Number(line.quantity) * Number(line.unitWeight))}</td>
                      <td className="text-center">
                        <Button
                          data-permission-action="utility"
                          size="sm"
                          variant="outline-danger"
                          aria-label={`Remove ${line.itemCode}`}
                          onClick={() => setLines((current) => current.filter((item) => item.id !== line.id))}
                        >
                          <i className="ti ti-trash" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {!lines.length && (
                    <tr>
                      <td colSpan={8} className="text-center text-muted py-5">
                        <i className="ti ti-package d-block fs-1 mb-2" />
                        No items added. Click Add SO to select approved Sales Orders.
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
              <div className="bg-light border rounded p-3 d-flex justify-content-between flex-wrap gap-3" aria-live="polite">
                <span>
                  {orderCount} Sales Orders · {lines.length} items
                </span>
                <span>
                  Total Weight: <strong>{formatNumber(totalWeight)} kg</strong>
                  {Number(capacity) > 0 && <> / {formatNumber(capacity)} kg</>}
                </span>
              </div>
              {Number(capacity) > 0 && totalWeight > Number(capacity) && (
                <Alert variant="danger" className="mt-3">
                  Total item weight exceeds the weight limit. Reduce the pick quantities.
                </Alert>
              )}
              {shippingType === 'external' && <PicklistRecommendations lines={lines} />}
            </>
          )}
          <p className="text-muted small mt-3">This mockup does not save or assign orders.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light-secondary" onClick={requestClose}>
            Cancel
          </Button>
          <Button data-permission-action="utility" disabled title="Saving is not available in this mockup">
            <i className="ti ti-device-floppy me-1" /> Save Picklist
          </Button>
        </Modal.Footer>
      </Modal>
      {detailOrder && <SalesOrderDetailModal order={detailOrder} onClose={() => setDetailOrder(null)} />}
      <Modal show={selecting} onHide={() => !adding && setSelecting(false)} size="xl" centered scrollable>
        <Modal.Header closeButton={!adding}>
          <Modal.Title>Select Sales Orders</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Stack direction="horizontal" className="justify-content-between mb-3" gap={3}>
            <Form.Control
              aria-label="Search Sales Orders"
              placeholder="Search SO number or customer..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <Badge bg="success" className="flex-shrink-0">
              Order Approved
            </Badge>
            <Button variant="outline-secondary" size="sm" disabled={loading || adding} onClick={fetchOrders}>
              Refresh
            </Button>
          </Stack>
          {error && <Alert variant="danger">{error}</Alert>}
          <Table responsive hover className="align-middle">
            <thead>
              <tr>
                <th>Select</th>
                <th>SO Number</th>
                <th>Customer</th>
                <th>Posting Date</th>
                <th>Due Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-5">
                    <span className="spinner-border spinner-border-sm me-2" />
                    Loading approved Sales Orders...
                  </td>
                </tr>
              ) : (
                filteredOrders.map((item) => {
                  const id = String(item.id);
                  const selectOrder = () => {
                    if (adding) return;
                    setSelectedIds((current) =>
                      allowsMultipleOrders ? (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]) : [id]
                    );
                  };
                  return (
                    <tr
                      key={id}
                      className={selectedIds.includes(id) ? 'table-active' : undefined}
                      style={{ cursor: adding ? 'default' : 'pointer' }}
                      onClick={selectOrder}
                    >
                      <td>
                        <Form.Check
                          type={allowsMultipleOrders ? 'checkbox' : 'radio'}
                          name="picklist-sales-order"
                          aria-label={`Select SO ${orderNumber(item)}`}
                          checked={selectedIds.includes(id)}
                          disabled={adding}
                          onClick={(event) => event.stopPropagation()}
                          onChange={selectOrder}
                        />
                      </td>
                      <td className="fw-semibold">{orderNumber(item)}</td>
                      <td>
                        <div>{item.customer_name || item.card_code || '-'}</div>
                        <small className="text-muted d-block">{item.depo || '-'}</small>
                      </td>
                      <td>{item.doc_date?.slice(0, 10) || '-'}</td>
                      <td>{item.doc_due_date?.slice(0, 10) || '-'}</td>
                      <td>
                        <Badge bg="light" text="success">
                          Order Approved
                        </Badge>
                      </td>
                    </tr>
                  );
                })
              )}
              {!loading && !filteredOrders.length && (
                <tr>
                  <td colSpan={6} className="text-center text-muted py-5">
                    {error ? 'Could not load Sales Orders. Please retry.' : 'No approved Sales Orders found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </Modal.Body>
        <Modal.Footer>
          <span className="me-auto text-muted">{selectedIds.length} SO selected · Existing items will not be duplicated.</span>
          <Button variant="light-secondary" disabled={adding} onClick={() => setSelecting(false)}>
            Cancel
          </Button>
          <Button data-permission-action="utility" disabled={loading || adding || !selectedIds.length} onClick={addOrders}>
            {adding ? 'Adding...' : 'Add Selected SO'}
          </Button>
        </Modal.Footer>
      </Modal>
      <Modal
        show={resetting || confirmClose}
        onHide={() => {
          setResetting(false);
          setConfirmClose(false);
        }}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>{resetting ? 'Reset Items?' : 'Discard Picklist?'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {resetting
            ? 'All selected SO items will be removed from this form.'
            : 'Your mockup inputs will be cleared when you close this form.'}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="light-secondary"
            onClick={() => {
              setResetting(false);
              setConfirmClose(false);
            }}
          >
            Keep Editing
          </Button>
          <Button
            data-permission-action="utility"
            variant="danger"
            onClick={() => {
              if (resetting) {
                setLines([]);
                setResetting(false);
              } else onClose();
            }}
          >
            {resetting ? 'Reset Items' : 'Discard'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
