import { useMemo, useState } from 'react';
import { Alert, Badge, Form, Table } from 'react-bootstrap';
import { currency } from '../../../utils/global';

export default function PicklistRecommendations({ lines }) {
  const [selectedExpeditions, setSelectedExpeditions] = useState({});
  const routes = useMemo(() => {
    const grouped = new Map();
    lines.forEach((line) => {
      const key = `${line.orderId}|${line.warehouse}|${line.destinationCode}`;
      const route = grouped.get(key) || {
        key,
        orderNumber: line.orderNumber,
        origin: line.warehouse,
        destination: line.destinationCode,
        customer: line.customer,
        weight: 0,
        valid: true
      };
      const quantity = Number(line.quantity);
      const unitWeight = Number(line.unitWeight);
      route.valid =
        route.valid &&
        Number.isFinite(quantity) &&
        quantity > 0 &&
        quantity <= line.orderedQuantity &&
        Number.isFinite(unitWeight) &&
        unitWeight > 0;
      route.weight += quantity * unitWeight;
      grouped.set(key, route);
    });
    return [...grouped.values()];
  }, [lines]);

  const previewRoutes = routes.length
    ? routes
    : [
        {
          key: 'preview',
          orderNumber: 'SO-CONTOH',
          origin: 'Gudang Surabaya',
          customer: 'Jakarta Pusat',
          weight: 350,
          valid: true,
          preview: true
        }
      ];
  const results = previewRoutes.map((route) => ({
    ...route,
    selectionKey: `${route.key}|${route.weight}|${route.valid}`,
    rates: [
      { id: 'nusantara', name: 'Nusantara Cargo', service: 'Reguler', eta: '3–4 hari', price: Math.max(450000, route.weight * 1800) },
      { id: 'lintas', name: 'Lintas Prima Logistik', service: 'Express', eta: '1–2 hari', price: Math.max(650000, route.weight * 2400) },
      { id: 'samudra', name: 'Samudra Trans', service: 'Economy', eta: '4–5 hari', price: Math.max(350000, route.weight * 1500) }
    ]
  }));
  const toggleExpedition = (key, id, checked) =>
    setSelectedExpeditions((current) => ({
      ...current,
      [key]: checked ? [...(current[key] || []), id] : (current[key] || []).filter((value) => value !== id)
    }));

  return (
    <section className="mt-4 border rounded p-3">
      <div className="d-flex justify-content-between align-items-center gap-3 mb-3">
        <div>
          <h6 className="mb-1">Rekomendasi Ekspedisi</h6>
          <small className="text-muted">Centang ekspedisi yang ingin dipilih. Anda dapat memilih lebih dari satu.</small>
        </div>
        <Badge bg="light" text="secondary" className="border">
          Data Contoh
        </Badge>
      </div>
      <Alert variant="light" className="small">
        Nama ekspedisi, estimasi waktu, dan tarif berikut adalah contoh mockup, bukan penawaran aktual.
      </Alert>
      {!routes.length && (
        <p className="text-muted small">
          Preview menggunakan contoh SO 350 kg. Klik Add SO untuk menyesuaikan rekomendasi dengan berat SO yang dipilih.
        </p>
      )}
      {results.map((route) => {
        const selected = selectedExpeditions[route.selectionKey] || [];
        return (
          <div key={route.key} className="mb-3">
            <div className="fw-semibold mb-2">
              {route.preview ? 'Contoh SO' : `SO ${route.orderNumber}`} · {route.origin || '-'} →{' '}
              {route.customer || route.destination || '-'}
              {route.valid && ` · ${route.weight.toLocaleString('id-ID', { maximumFractionDigits: 3 })} kg`}
            </div>
            {!route.valid ? (
              <Alert variant="warning">Lengkapi kuantitas dan berat per unit yang valid untuk memilih ekspedisi.</Alert>
            ) : (
              <>
                <Table responsive bordered hover className="align-middle mb-0">
                  <thead>
                    <tr>
                      <th className="text-center">Pilih</th>
                      <th>Ekspedisi</th>
                      <th>Layanan</th>
                      <th>Estimasi Waktu</th>
                      <th className="text-end">Estimasi Tarif</th>
                    </tr>
                  </thead>
                  <tbody>
                    {route.rates.map((rate) => (
                      <tr key={rate.id} className={selected.includes(rate.id) ? 'table-primary' : undefined}>
                        <td className="text-center">
                          <Form.Check
                            aria-label={`Pilih ${rate.name} untuk SO ${route.orderNumber}`}
                            checked={selected.includes(rate.id)}
                            onChange={(event) => toggleExpedition(route.selectionKey, rate.id, event.target.checked)}
                          />
                        </td>
                        <td className="fw-semibold">{rate.name}</td>
                        <td>{rate.service}</td>
                        <td>{rate.eta}</td>
                        <td className="text-end fw-semibold">{currency(Math.round(rate.price))}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
                <div className="small text-muted mt-2" aria-live="polite">
                  {selected.length
                    ? `${selected.length} ekspedisi dipilih: ${route.rates
                        .filter((rate) => selected.includes(rate.id))
                        .map((rate) => rate.name)
                        .join(', ')}`
                    : 'Belum ada ekspedisi dipilih.'}
                </div>
              </>
            )}
          </div>
        );
      })}
    </section>
  );
}
