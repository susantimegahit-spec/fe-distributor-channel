import { useCallback, useEffect, useMemo, useState } from 'react';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import Spinner from 'react-bootstrap/Spinner';
import Stack from 'react-bootstrap/Stack';
import Table from 'react-bootstrap/Table';

import PurchasingServices from '../../../../services/corporate/PurchasingServices';
import { useAlert } from '../../../../utils/alertContext';
import EnterpriseWorkspace from '../../components/EnterpriseWorkspace';
import './purchase-order.scss';

const getValue = (item, keys, fallback = '') =>
  keys.map((key) => item?.[key]).find((value) => value !== undefined && value !== null && value !== '') ?? fallback;

const getList = (response, keys = []) => {
  const payload = response?.data?.data ?? response?.data ?? response ?? [];
  if (Array.isArray(payload)) return payload;
  const list = keys.map((key) => payload?.[key]).find(Array.isArray) ?? payload?.data ?? payload?.items ?? payload?.rows ?? [];
  return Array.isArray(list) ? list : [];
};

const money = (value) => Number(value || 0).toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 2 });

const date = (value) => {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value || '-';
};

const itemIdentity = (item) => ({
  id: getValue(item, ['quotation_item_id', 'id', 'line_id']),
  code: getValue(item, ['itemCode', 'item_code', 'ItemCode'], '-'),
  name: getValue(item, ['itemName', 'item_name', 'ItemName', 'description'], '-'),
  quantity: Number(getValue(item, ['quantity', 'Quantity'], 0)) || 0,
  unit: getValue(item, ['unit', 'uom', 'UnitMsr'], '-')
});

const vendorIdentity = (offer, index) => {
  const data = { ...offer, ...(offer.vendor ?? offer.supplier ?? {}) };
  const name = getValue(data, ['company', 'vendor_company', 'supplier_name', 'vendor_name', 'company_name'], `Vendor ${index + 1}`);
  const id = getValue(data, ['vendor_id', 'supplier_id', 'id']);
  const email = getValue(data, ['email', 'vendor_email']);
  return {
    data,
    name,
    id,
    email,
    key: String(id || email || name)
      .trim()
      .toLowerCase()
  };
};

const matchesItem = (offerItem, item) => {
  const identity = itemIdentity(offerItem);
  return (item.id && String(identity.id) === String(item.id)) || (item.code !== '-' && identity.code === item.code);
};

const variants = { DRAFT: 'secondary', OPEN: 'primary', PARTIALLY_RECEIVED: 'warning', COMPLETED: 'success' };

export default function PurchaseOrder() {
  const { showAlert } = useAlert();
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [step, setStep] = useState(1);
  const [availableItems, setAvailableItems] = useState([]);
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [poQuantities, setPoQuantities] = useState({});
  const [vendorKey, setVendorKey] = useState('');
  const [loadingSources, setLoadingSources] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const response = await PurchasingServices.getPurchaseOrders({ per_page: 100 });
      if (response?.data?.success === false) throw new Error(response.data.message);
      setOrders(getList(response, ['purchase_orders', 'orders']));
    } catch (error) {
      setOrders([]);
      showAlert(error?.response?.data?.message || error?.message || 'Failed to load purchase orders', 'danger');
    } finally {
      setLoadingOrders(false);
    }
  }, [showAlert]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const loadSources = async () => {
    setLoadingSources(true);
    try {
      const response = await PurchasingServices.getQuotations({ per_page: 100, page: 1 });
      if (response?.data?.success === false) throw new Error(response.data.message);
      const quotations = getList(response, ['quotations']);
      const results = await Promise.all(
        quotations.map(async (quotation) => {
          const quotationId = getValue(quotation, ['id', 'quotation_id', 'DocEntry']);
          const [detailResponse, offersResponse] = await Promise.all([
            PurchasingServices.getDetailQuotations(quotationId),
            PurchasingServices.getListOffer(quotationId)
          ]);
          const payload = detailResponse?.data?.data ?? detailResponse?.data ?? {};
          const detail = payload.quotation ?? payload.data ?? payload;
          const rawItems = detail.items ?? detail.details ?? detail.lines ?? payload.items ?? [];
          const offers = getList(offersResponse, ['offers']);
          const quotationNumber = getValue(
            detail,
            ['rfq_number', 'quotation_no', 'number'],
            getValue(quotation, ['quotation_no', 'number'], '-')
          );
          return (Array.isArray(rawItems) ? rawItems : []).map((rawItem, index) => {
            const item = itemIdentity(rawItem);
            const vendorOffers = offers.flatMap((offer, offerIndex) => {
              const offerItems = offer.items ?? offer.details ?? offer.lines ?? [];
              const offerItem = (Array.isArray(offerItems) ? offerItems : []).find((entry) => matchesItem(entry, item));
              return offerItem ? [{ offer, offerItem, vendor: vendorIdentity(offer, offerIndex) }] : [];
            });
            return { ...item, key: `${quotationId}:${item.id || item.code || index}`, quotationId, quotationNumber, vendorOffers };
          });
        })
      );
      setAvailableItems(results.flat().filter((item) => item.vendorOffers.length));
    } catch (error) {
      setAvailableItems([]);
      showAlert(error?.response?.data?.message || error?.message || 'Failed to load quotation items and offers', 'danger');
    } finally {
      setLoadingSources(false);
    }
  };

  const openCreate = () => {
    setStep(1);
    setSelectedKeys([]);
    setPoQuantities({});
    setVendorKey('');
    setShowCreate(true);
    loadSources();
  };

  const selectedItems = useMemo(() => availableItems.filter((item) => selectedKeys.includes(item.key)), [availableItems, selectedKeys]);
  const commonVendors = useMemo(() => {
    if (!selectedItems.length) return [];
    const firstVendors = selectedItems[0].vendorOffers.map((entry) => entry.vendor);
    return firstVendors.filter((vendor) =>
      selectedItems.every((item) => item.vendorOffers.some((entry) => entry.vendor.key === vendor.key))
    );
  }, [selectedItems]);
  const selectedVendor = commonVendors.find((vendor) => vendor.key === vendorKey);
  const offerLines = selectedVendor
    ? selectedItems.map((item) => ({ item, entry: item.vendorOffers.find((offer) => offer.vendor.key === selectedVendor.key) }))
    : [];

  const continueToVendor = () => {
    if (!selectedItems.length) return showAlert('Select at least one item first.', 'warning');
    if (!commonVendors.length) return showAlert('The selected items do not have an offer from the same vendor.', 'warning');
    setPoQuantities((current) =>
      selectedItems.reduce((quantities, item) => ({ ...quantities, [item.key]: current[item.key] ?? item.quantity }), {})
    );
    setVendorKey('');
    setStep(2);
  };

  const hasInvalidQuantity = selectedVendor
    ? selectedItems.some((item) => {
        const entry = item.vendorOffers.find((offer) => offer.vendor.key === selectedVendor.key);
        const readyQuantity = Number(getValue(entry?.offerItem, ['commitQty', 'commit_qty', 'quantity'], item.quantity));
        const poQuantity = Number(poQuantities[item.key]);
        return !poQuantity || poQuantity < 0 || poQuantity > readyQuantity;
      })
    : false;

  const createOrder = async () => {
    if (!selectedVendor) return;
    if (hasInvalidQuantity) return showAlert('Qty PO must be greater than 0 and cannot exceed the selected vendor ready quantity.', 'warning');
    const payload = {
      vendor_id: selectedVendor.id || null,
      vendor_name: selectedVendor.name,
      vendor_email: selectedVendor.email || null,
      quotation_ids: [...new Set(selectedItems.map((item) => item.quotationId))],
      items: offerLines.map(({ item, entry }) => ({
        quotation_id: item.quotationId,
        quotation_item_id: item.id || null,
        offer_id: getValue(entry.offer, ['id', 'offer_id'], null),
        item_code: item.code,
        item_name: item.name,
        quantity: Number(poQuantities[item.key]),
        unit: item.unit,
        unit_price: Number(getValue(entry.offerItem, ['unitPrice', 'unit_price', 'price'], 0)),
        lead_time: getValue(entry.offerItem, ['leadTime', 'lead_time'])
      }))
    };
    setSaving(true);
    try {
      const response = await PurchasingServices.postPurchaseOrder(payload);
      if (response?.data?.success === false) throw new Error(response.data.message);
      showAlert(response?.data?.message || 'Purchase order created successfully.', 'success');
      setShowCreate(false);
      await loadOrders();
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to create purchase order', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const metrics = [
    {
      label: 'Draft Orders',
      value: orders.filter((order) => order.status === 'DRAFT').length,
      variant: 'secondary',
      icon: 'ti ti-file-pencil'
    },
    {
      label: 'Open Orders',
      value: orders.filter((order) => order.status === 'OPEN').length,
      variant: 'primary',
      icon: 'ti ti-shopping-cart'
    },
    {
      label: 'Partially Received',
      value: orders.filter((order) => order.status === 'PARTIALLY_RECEIVED').length,
      variant: 'warning',
      icon: 'ti ti-package-import'
    },
    {
      label: 'Completed',
      value: orders.filter((order) => order.status === 'COMPLETED').length,
      variant: 'success',
      icon: 'ti ti-circle-check'
    }
  ];

  return (
    <>
      <EnterpriseWorkspace
        title="Purchase Order"
        description="Convert supplier offers into purchase orders and monitor fulfillment."
        icon="ti ti-file-invoice"
        actionLabel="Create Purchase Order"
        onAction={openCreate}
        metrics={metrics}
        compactMetrics
        columns={['Order No.', 'Order Date', 'Supplier', 'Quotation Ref.', 'Amount', 'Status']}
        emptyMessage="Purchase orders will appear here after they are created."
        loading={loadingOrders}
        tableBody={orders.map((order, index) => {
          const status = String(order.status || 'DRAFT').toUpperCase();
          return (
            <tr key={getValue(order, ['id', 'purchase_order_id'], index)}>
              <td className="fw-semibold">{getValue(order, ['po_number', 'order_number', 'number'], '-')}</td>
              <td>{date(getValue(order, ['order_date', 'date', 'created_at']))}</td>
              <td>{getValue(order, ['vendor_name', 'supplier_name'], '-')}</td>
              <td>{getValue(order, ['quotation_number', 'quotation_ref', 'rfq_number'], '-')}</td>
              <td>{money(getValue(order, ['total_amount', 'amount', 'total'], 0))}</td>
              <td>
                <Badge bg={variants[status] || 'secondary'}>{status.replaceAll('_', ' ')}</Badge>
              </td>
            </tr>
          );
        })}
      />

      <Modal
        show={showCreate}
        onHide={() => !saving && setShowCreate(false)}
        centered
        scrollable
        dialogClassName="purchase-order-create-dialog"
      >
        <Modal.Header closeButton={!saving}>
          <div>
            <Modal.Title>Create Purchase Order</Modal.Title>
            <small className="text-muted">
              Step {step} of 2 · {step === 1 ? 'Select items' : 'Select one vendor'}
            </small>
          </div>
        </Modal.Header>
        <Modal.Body>
          <div className="purchase-order-steps mb-4">
            <span className="is-active">
              <b>1</b> Select Items
            </span>
            <span className={step === 2 ? 'is-active' : ''}>
              <b>2</b> Select Vendor
            </span>
          </div>
          {step === 1 ? (
            loadingSources ? (
              <div className="text-center py-5">
                <Spinner animation="border" variant="primary" />
                <p className="text-muted mt-3">Loading quotation items and offers...</p>
              </div>
            ) : (
              <div className="table-responsive border rounded">
                <Table hover className="mb-0 align-middle">
                  <thead>
                    <tr>
                      <th>Select</th>
                      <th>Quotation</th>
                      <th>Item</th>
                      <th>Requested Qty</th>
                      <th>Vendors</th>
                    </tr>
                  </thead>
                  <tbody>
                    {availableItems.length ? (
                      availableItems.map((item) => (
                        <tr key={item.key}>
                          <td>
                            <Form.Check
                              checked={selectedKeys.includes(item.key)}
                              onChange={() =>
                                setSelectedKeys((current) =>
                                  current.includes(item.key) ? current.filter((key) => key !== item.key) : [...current, item.key]
                                )
                              }
                            />
                          </td>
                          <td>{item.quotationNumber}</td>
                          <td>
                            <strong>{item.code}</strong>
                            <small className="d-block text-muted">{item.name}</small>
                          </td>
                          <td>
                            {item.quantity} {item.unit}
                          </td>
                          <td>{item.vendorOffers.length}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="text-center text-muted py-5">
                          No quotation items with supplier offers are available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            )
          ) : (
            <>
              <p className="text-muted">Compare every offer, then select one vendor from the column header.</p>
              <div className="table-responsive purchase-order-compare-wrap">
                <Table className="mb-0 align-middle purchase-order-compare-table">
                  <thead>
                    <tr>
                      <th className="purchase-order-item-column">Item</th>
                      {commonVendors.map((vendor) => (
                        <th key={vendor.key} className={vendorKey === vendor.key ? 'is-selected' : ''}>
                          <button type="button" className="purchase-order-vendor-heading" onClick={() => setVendorKey(vendor.key)}>
                            <span>
                              <strong>{vendor.name}</strong>
                              <small>{vendor.email || 'No email available'}</small>
                            </span>
                            <i className={`ti ${vendorKey === vendor.key ? 'ti-circle-check-filled' : 'ti-circle'}`} />
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedItems.map((item) => (
                      <tr key={item.key}>
                        <td className="purchase-order-item-column">
                          <strong>{item.code}</strong>
                          <small className="d-block text-muted">{item.name}</small>
                          <small className="d-block text-muted">Request: {item.quantity} {item.unit}</small>
                          <Form.Group className="purchase-order-qty-input mt-3">
                            <Form.Label>Qty PO</Form.Label>
                            <div className="input-group input-group-sm">
                              <Form.Control
                                type="number"
                                min="0"
                                step="any"
                                value={poQuantities[item.key] ?? ''}
                                onChange={(event) =>
                                  setPoQuantities((current) => ({ ...current, [item.key]: event.target.value }))
                                }
                              />
                              <span className="input-group-text">{item.unit}</span>
                            </div>
                          </Form.Group>
                        </td>
                        {commonVendors.map((vendor) => {
                          const entry = item.vendorOffers.find((offer) => offer.vendor.key === vendor.key);
                          const quantity = Number(getValue(entry?.offerItem, ['commitQty', 'commit_qty', 'quantity'], item.quantity));
                          const poQuantity = Number(poQuantities[item.key]) || 0;
                          const price = Number(getValue(entry?.offerItem, ['unitPrice', 'unit_price', 'price'], 0));
                          return (
                            <td key={vendor.key} className={vendorKey === vendor.key ? 'is-selected' : ''}>
                              <dl className="purchase-order-offer-details">
                                <div><dt>Qty Ready</dt><dd>{quantity} {item.unit}</dd></div>
                                <div><dt>Unit Price</dt><dd>{money(price)}</dd></div>
                                <div><dt>Total</dt><dd>{money(poQuantity * price)}</dd></div>
                                <div><dt>Lead Time</dt><dd>{getValue(entry?.offerItem, ['leadTime', 'lead_time'], '-')}</dd></div>
                              </dl>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <th>Grand Total</th>
                      {commonVendors.map((vendor) => {
                        const total = selectedItems.reduce((sum, item) => {
                          const entry = item.vendorOffers.find((offer) => offer.vendor.key === vendor.key);
                          const quantity = Number(poQuantities[item.key]) || 0;
                          const price = Number(getValue(entry?.offerItem, ['unitPrice', 'unit_price', 'price'], 0));
                          return sum + quantity * price;
                        }, 0);
                        return <th key={vendor.key} className={vendorKey === vendor.key ? 'is-selected' : ''}>{money(total)}</th>;
                      })}
                    </tr>
                  </tfoot>
                </Table>
              </div>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Stack direction="horizontal" gap={2} className="w-100 justify-content-between">
            <Button variant="outline-secondary" disabled={saving} onClick={() => (step === 1 ? setShowCreate(false) : setStep(1))}>
              {step === 1 ? 'Cancel' : 'Back'}
            </Button>
            {step === 1 ? (
              <Button variant="primary" disabled={loadingSources || !selectedItems.length} onClick={continueToVendor}>
                Continue to Vendor <i className="ti ti-arrow-right ms-1" />
              </Button>
            ) : (
              <Button variant="primary" disabled={!selectedVendor || hasInvalidQuantity || saving} onClick={createOrder}>
                {saving ? 'Creating...' : 'Create Purchase Order'}
              </Button>
            )}
          </Stack>
        </Modal.Footer>
      </Modal>
    </>
  );
}
