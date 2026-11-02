import { useEffect, useState } from 'react';
import { Button, Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';
import { useParams } from 'react-router-dom';
import PurchasingServices from '../../services/corporate/PurchasingServices';
import { useAlert } from '../../utils/alertContext';
import './public-quotation-offer.scss';

const currencyFormatter = new Intl.NumberFormat('id-ID');
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;
const ATTACHMENT_ACCEPT = '.pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx';
const getSubmittedOfferKey = (token) => `dc-quotation-offer-submitted:${token}`;

const hasSubmittedOffer = (token) => {
  try {
    return Boolean(localStorage.getItem(getSubmittedOfferKey(token)));
  } catch {
    return false;
  }
};

const rememberSubmittedOffer = (token) => {
  try {
    localStorage.setItem(getSubmittedOfferKey(token), new Date().toISOString());
  } catch {
    // The success screen still prevents a duplicate submission in this tab
    // when browser storage is unavailable.
  }
};

const getValue = (item, keys, fallback = '') => {
  const value = keys.map((key) => item?.[key]).find((entry) => entry !== undefined && entry !== null && entry !== '');
  return value ?? fallback;
};

const normalizeQuotation = (response) => {
  const payload = response?.data?.data ?? response?.data ?? response ?? {};
  const quotation = payload.quotation ?? payload.data ?? payload;
  const rawItems = quotation.items ?? quotation.details ?? quotation.lines ?? payload.items ?? [];
  return {
    ...quotation,
    id: getValue(quotation, ['id', 'quotation_id', 'DocEntry']),
    number: getValue(quotation, ['rfq_number', 'quotation_no', 'quotation_number', 'number', 'code'], 'Request Quotation'),
    title: getValue(quotation, ['title', 'quotation_title']),
    notes: getValue(quotation, ['notes', 'description']),
    validUntil: getValue(quotation, ['valid_until', 'validUntil']),
    items: (Array.isArray(rawItems) ? rawItems : []).map((item, index) => ({
      ...item,
      id: getValue(item, ['id', 'quotation_item_id', 'line_id'], `item-${index}`),
      itemCode: getValue(item, ['itemCode', 'item_code', 'ItemCode'], '-'),
      itemName: getValue(item, ['itemName', 'item_name', 'ItemName', 'description'], '-'),
      quantity: Number(getValue(item, ['quantity', 'Quantity'], 0)) || 0,
      unit: getValue(item, ['unit', 'uom', 'UnitMsr'], '-'),
      warehouse: getValue(item, ['warehouse', 'warehouse_code', 'WhsCode'], '-'),
      requiredDate: getValue(item, ['requiredDate', 'required_date']),
      requestNotes: getValue(item, ['notes', 'request_notes', 'remarks'])
    }))
  };
};

export default function PublicQuotationOffer() {
  const { token } = useParams();
  const { showAlert } = useAlert();
  const [quotation, setQuotation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [vendor, setVendor] = useState({ name: '', email: '', phone: '', company: '', notes: '' });
  const [offers, setOffers] = useState({});
  const [submitted, setSubmitted] = useState(() => hasSubmittedOffer(token));
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setSubmitted(hasSubmittedOffer(token));
    const handleStorage = (event) => {
      if (event.key === getSubmittedOfferKey(token) && event.newValue) setSubmitted(true);
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [token]);

  useEffect(() => {
    let active = true;
    const loadQuotation = async () => {
      setLoading(true);
      setLoadError('');
      try {
        const response = await PurchasingServices.getDetailQuotations(token);
        if (response?.data?.success === false) throw new Error(response.data.message || 'Request quotation tidak ditemukan');
        const detail = normalizeQuotation(response);
        if (!detail.id && !detail.items.length) throw new Error('Request quotation tidak ditemukan');
        if (active) setQuotation(detail);
      } catch (error) {
        if (active) setLoadError(error?.response?.data?.message || error?.message || 'Request quotation tidak ditemukan');
      } finally {
        if (active) setLoading(false);
      }
    };
    loadQuotation();
    return () => {
      active = false;
    };
  }, [token]);

  if (loading) {
    return (
      <main className="quotation-offer-page">
        <Card className="quotation-offer-message">
          <Card.Body>
            <Spinner animation="border" variant="primary" />
            <h2 className="mt-3">Memuat request quotation...</h2>
          </Card.Body>
        </Card>
      </main>
    );
  }

  if (!quotation) {
    return (
      <main className="quotation-offer-page">
        <Card className="quotation-offer-message">
          <Card.Body>
            <i className="ti ti-file-off" />
            <h2>Request quotation tidak ditemukan</h2>
            <p>{loadError || 'Pastikan link yang diberikan sudah benar dan masih aktif.'}</p>
          </Card.Body>
        </Card>
      </main>
    );
  }

  if (submitted) {
    return (
      <main className="quotation-offer-page">
        <Card className="quotation-offer-message">
          <Card.Body>
            <i className="ti ti-circle-check text-success" />
            <h2>Penawaran berhasil dikirim</h2>
            <p>Terima kasih. Penawaran untuk {quotation.number} telah kami terima.</p>
          </Card.Body>
        </Card>
      </main>
    );
  }

  const updateOffer = (itemId, field, value) =>
    setOffers((current) => ({
      ...current,
      [itemId]: { ...current[itemId], [field]: value }
    }));

  const updateAttachment = (itemId, file, input) => {
    if (file && file.size > MAX_ATTACHMENT_SIZE) {
      showAlert('Ukuran attachment maksimal 10 MB.', 'danger');
      input.value = '';
      return;
    }

    updateOffer(itemId, 'attachment', file || null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (hasSubmittedOffer(token)) {
      setSubmitted(true);
      return;
    }
    const payload = {
      vendor: {
        company: vendor.company.trim(),
        name: vendor.name.trim(),
        email: vendor.email.trim(),
        phone: vendor.phone.trim(),
        notes: vendor.notes.trim()
      },
      items: quotation.items.map((item) => ({
        id: Number(item.id),
        itemCode: item.itemCode,
        itemName: item.itemName,
        quantity: Number(item.quantity),
        unit: item.unit,
        commitQty: Number(offers[item.id]?.commitQty),
        unitPrice: Number(offers[item.id]?.unitPrice),
        leadTime: offers[item.id]?.leadTime?.trim() || '',
        notes: offers[item.id]?.notes?.trim() || ''
      }))
    };

    const formData = new FormData();
    Object.entries(payload.vendor).forEach(([key, value]) => formData.append(`vendor[${key}]`, value));
    payload.items.forEach((item, index) => {
      Object.entries(item).forEach(([key, value]) => formData.append(`items[${index}][${key}]`, value));
      const attachment = offers[quotation.items[index].id]?.attachment;
      if (attachment) formData.append(`items[${index}][attachment]`, attachment);
    });

    setSubmitting(true);
    try {
      const response = await PurchasingServices.postOffers(token, formData);
      if (response?.data?.success === false) throw new Error(response.data.message || 'Gagal mengirim penawaran');
      rememberSubmittedOffer(token);
      setSubmitted(true);
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Gagal mengirim penawaran', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="quotation-offer-page">
      <div className="quotation-offer-container">
        <header className="quotation-offer-header">
          <span>REQUEST FOR QUOTATION</span>
          <h1>{quotation.number}</h1>
          {quotation.title && <h5>{quotation.title}</h5>}
          <p>{quotation.notes || 'Silakan lengkapi identitas dan penawaran harga untuk setiap item berikut.'}</p>
        </header>
        <Form onSubmit={handleSubmit}>
          <Card className="mb-3">
            <Card.Header>
              <h5 className="mb-0">Informasi Vendor</h5>
            </Card.Header>
            <Card.Body>
              <Row className="g-3">
                <Col md={6}>
                  <Form.Label>Nama perusahaan *</Form.Label>
                  <Form.Control
                    required
                    value={vendor.company}
                    onChange={(event) => setVendor({ ...vendor, company: event.target.value })}
                  />
                </Col>
                <Col md={6}>
                  <Form.Label>Nama PIC *</Form.Label>
                  <Form.Control required value={vendor.name} onChange={(event) => setVendor({ ...vendor, name: event.target.value })} />
                </Col>
                <Col md={6}>
                  <Form.Label>Email *</Form.Label>
                  <Form.Control
                    type="email"
                    required
                    value={vendor.email}
                    onChange={(event) => setVendor({ ...vendor, email: event.target.value })}
                  />
                </Col>
                <Col md={6}>
                  <Form.Label>Nomor telepon *</Form.Label>
                  <Form.Control required value={vendor.phone} onChange={(event) => setVendor({ ...vendor, phone: event.target.value })} />
                </Col>
              </Row>
            </Card.Body>
          </Card>

          <Card className="mb-3">
            <Card.Header>
              <h5 className="mb-0">Detail Penawaran</h5>
            </Card.Header>
            <div className="table-responsive">
              <Table className="mb-0 align-middle quotation-offer-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Item</th>
                    <th>Requested Qty</th>
                    <th>Commit Qty *</th>
                    <th>Harga Satuan *</th>
                    <th>Lead Time *</th>
                    <th>Catatan</th>
                  </tr>
                </thead>
                {quotation.items.map((item, index) => (
                  <tbody className="quotation-offer-item" key={item.id}>
                    <tr>
                      <td>{index + 1}</td>
                      <td>
                        <strong>{item.itemCode}</strong>
                        <small>{item.itemName}</small>
                        {item.requestNotes && <span className="quotation-offer-item-note">Note: {item.requestNotes}</span>}
                      </td>
                      <td>
                        {currencyFormatter.format(item.quantity)} {item.unit}
                      </td>
                      <td>
                        <Form.Control
                          type="number"
                          min="0"
                          max={item.quantity}
                          step="any"
                          required
                          aria-label={`Commit quantity ${item.itemName}`}
                          placeholder="0"
                          value={offers[item.id]?.commitQty || ''}
                          onChange={(event) => updateOffer(item.id, 'commitQty', event.target.value)}
                        />
                      </td>
                      <td>
                        <Form.Control
                          type="number"
                          min="0"
                          step="1"
                          required
                          aria-label={`Harga ${item.itemName}`}
                          value={offers[item.id]?.unitPrice || ''}
                          onChange={(event) => updateOffer(item.id, 'unitPrice', event.target.value)}
                        />
                      </td>
                      <td>
                        <Form.Control
                          required
                          placeholder="Contoh: 7 hari"
                          aria-label={`Lead time ${item.itemName}`}
                          value={offers[item.id]?.leadTime || ''}
                          onChange={(event) => updateOffer(item.id, 'leadTime', event.target.value)}
                        />
                      </td>
                      <td>
                        <Form.Control
                          aria-label={`Catatan ${item.itemName}`}
                          value={offers[item.id]?.notes || ''}
                          onChange={(event) => updateOffer(item.id, 'notes', event.target.value)}
                        />
                      </td>
                    </tr>
                    <tr className="quotation-offer-attachment-row">
                      <td />
                      <td colSpan={6}>
                        <div className="quotation-offer-attachment">
                          <Form.Label htmlFor={`attachment-${item.id}`}>Attachment item</Form.Label>
                          <Form.Control
                            id={`attachment-${item.id}`}
                            type="file"
                            accept={ATTACHMENT_ACCEPT}
                            aria-label={`Attachment ${item.itemName}`}
                            onChange={(event) => updateAttachment(item.id, event.target.files?.[0], event.target)}
                          />
                          <small>PDF, JPG, PNG, Word, atau Excel. Maksimal 10 MB.</small>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                ))}
              </Table>
            </div>
          </Card>

          <Card className="mb-3">
            <Card.Body>
              <Form.Label>Catatan umum</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={vendor.notes}
                onChange={(event) => setVendor({ ...vendor, notes: event.target.value })}
              />
            </Card.Body>
          </Card>
          <div className="d-flex justify-content-end">
            <Button type="submit" size="lg" disabled={submitting}>
              {submitting ? <Spinner animation="border" size="sm" className="me-2" /> : <i className="ti ti-send me-2" />}
              {submitting ? 'Mengirim Penawaran...' : 'Kirim Penawaran'}
            </Button>
          </div>
        </Form>
        <footer>Informasi penawaran Anda hanya digunakan untuk proses pengadaan.</footer>
      </div>
    </main>
  );
}
