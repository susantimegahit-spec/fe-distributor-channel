import { useMemo, useState } from 'react';
import { Button, Card, Col, Form, Row, Table } from 'react-bootstrap';
import { useParams } from 'react-router-dom';
import { getPublicQuotation, submitQuotationOffer } from '../../utils/publicQuotations';
import './public-quotation-offer.scss';

const currencyFormatter = new Intl.NumberFormat('id-ID');

export default function PublicQuotationOffer() {
  const { token } = useParams();
  const quotation = useMemo(() => getPublicQuotation(token), [token]);
  const [vendor, setVendor] = useState({ name: '', email: '', phone: '', company: '', notes: '' });
  const [offers, setOffers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  if (!quotation) {
    return (
      <main className="quotation-offer-page">
        <Card className="quotation-offer-message">
          <Card.Body>
            <i className="ti ti-file-off" />
            <h2>Request quotation tidak ditemukan</h2>
            <p>Pastikan link yang diberikan sudah benar dan masih aktif.</p>
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

  const handleSubmit = (event) => {
    event.preventDefault();
    submitQuotationOffer(quotation.id, { vendor, items: quotation.items.map((item) => ({ ...item, ...offers[item.id] })) });
    setSubmitted(true);
  };

  return (
    <main className="quotation-offer-page">
      <div className="quotation-offer-container">
        <header className="quotation-offer-header">
          <span>REQUEST FOR QUOTATION</span>
          <h1>{quotation.number}</h1>
          <p>Silakan lengkapi identitas dan penawaran harga untuk setiap item berikut.</p>
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
                    <th>Qty</th>
                    <th>Harga Satuan *</th>
                    <th>Lead Time *</th>
                    <th>Catatan</th>
                  </tr>
                </thead>
                <tbody>
                  {quotation.items.map((item, index) => (
                    <tr key={item.id}>
                      <td>{index + 1}</td>
                      <td>
                        <strong>{item.itemCode}</strong>
                        <small>{item.itemName}</small>
                      </td>
                      <td>
                        {currencyFormatter.format(item.quantity)} {item.unit}
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
                  ))}
                </tbody>
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
            <Button type="submit" size="lg">
              <i className="ti ti-send me-2" />
              Kirim Penawaran
            </Button>
          </div>
        </Form>
        <footer>Informasi penawaran Anda hanya digunakan untuk proses pengadaan.</footer>
      </div>
    </main>
  );
}
