import { useEffect, useMemo, useState } from 'react';
import { Alert, Form, Spinner, Table } from 'react-bootstrap';
import RateServices from '../../../services/logistics/RateServices';
import { currency } from '../../../utils/global';

const getRates = (response) => {
  const payload = response?.data?.data ?? response?.data ?? {};
  if (Array.isArray(payload)) return payload;
  const list = ['rank', 'ranks', 'rates', 'rankings'].map((key) => payload?.[key]).find(Array.isArray) || payload?.data || payload?.items;
  return Array.isArray(list) ? list : [];
};

const formatLeadTime = (value) => {
  if (value === undefined || value === null || String(value).trim() === '' || String(value).trim() === '-') return '-';
  return /\bdays?\b/i.test(String(value)) ? String(value) : `${value} days`;
};

const normalizeRate = (item, index, route) => {
  const expedition = item.expedition_data ?? item.expedition ?? {};
  const expeditionName =
    typeof expedition === 'object'
      ? (expedition.name ?? expedition.expedition_name ?? expedition.code ?? expedition.expedition_code)
      : expedition;
  const price = Number(item.price);

  return {
    id: String(item.id ?? item.rate_id ?? `${route.key}-${index}`),
    name: expeditionName ?? item.expedition_name ?? item.expedition_code ?? '-',
    service: item.service_type ?? item.service ?? item.transport_mode ?? '-',
    etaDays: item.eta_days ?? '-',
    price: Number.isFinite(price) ? price : null
  };
};

export default function PicklistRecommendations({ lines }) {
  const [selectedExpedition, setSelectedExpedition] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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

  useEffect(() => {
    let active = true;
    const validRoutes = routes.filter((route) => route.valid && route.origin && route.destination && route.weight > 0);

    setSelectedExpedition(null);
    setError('');
    if (!validRoutes.length) {
      setResults(routes.map((route) => ({ ...route, rates: [] })));
      return () => {
        active = false;
      };
    }

    setLoading(true);
    Promise.all(
      validRoutes.map(async (route) => {
        const response = await RateServices.getRatesRank(route.origin, route.destination, '');
        if (response?.data?.success === false) throw new Error(response.data.message || 'Failed to load expedition recommendations.');
        return { ...route, rates: getRates(response).map((item, index) => normalizeRate(item, index, route)) };
      })
    )
      .then((data) => {
        if (active) setResults(data);
      })
      .catch((requestError) => {
        if (!active) return;
        setResults([]);
        setError(requestError?.response?.data?.message || requestError?.message || 'Failed to load expedition recommendations.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [routes]);

  return (
    <section className="mt-4 border rounded p-3">
      <div className="mb-3">
        <h6 className="mb-1">Expedition Recommendations</h6>
        <small className="text-muted">Current rates are ranked by origin, destination, and sales order weight.</small>
      </div>
      {!routes.length && <Alert variant="light">Add a sales order to view expedition recommendations.</Alert>}
      {loading && (
        <div className="text-center text-muted py-4">
          <Spinner animation="border" size="sm" className="me-2" />
          Loading expedition recommendations...
        </div>
      )}
      {error && <Alert variant="danger">{error}</Alert>}
      {!loading && !error &&
        results.map((route) => {
          const selectionKey = `${route.key}|${route.weight}`;
          const selected = selectedExpedition?.key === selectionKey ? selectedExpedition.id : null;
          return (
            <div key={route.key} className="mb-3">
              <div className="fw-semibold mb-2">
                SO {route.orderNumber} · {route.origin || '-'} → {route.customer || route.destination || '-'}
                {route.valid && ` · ${route.weight.toLocaleString('id-ID', { maximumFractionDigits: 3 })} kg`}
              </div>
              {!route.valid ? (
                <Alert variant="warning">Enter a valid quantity and unit weight to view recommendations.</Alert>
              ) : !route.rates.length ? (
                <Alert variant="light">No matching rates were found for this route and weight.</Alert>
              ) : (
                <>
                  <Table responsive bordered hover className="align-middle mb-0">
                    <thead>
                      <tr>
                        <th className="text-center">Select</th>
                        <th>Expedition</th>
                        <th>Service</th>
                        <th>Lead Time</th>
                        <th className="text-end">Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {route.rates.map((rate) => (
                        <tr
                          key={rate.id}
                          className={selected === rate.id ? 'table-primary' : undefined}
                          style={{ cursor: 'pointer' }}
                          onClick={() => setSelectedExpedition({ key: selectionKey, id: rate.id })}
                        >
                          <td className="text-center">
                            <Form.Check
                              type="radio"
                              name={`picklist-expedition-${route.key}`}
                              aria-label={`Select ${rate.name} for SO ${route.orderNumber}`}
                              checked={selected === rate.id}
                              onClick={(event) => event.stopPropagation()}
                              onChange={() => setSelectedExpedition({ key: selectionKey, id: rate.id })}
                            />
                          </td>
                          <td className="fw-semibold">{rate.name}</td>
                          <td>{rate.service}</td>
                          <td>{formatLeadTime(rate.etaDays)}</td>
                          <td className="text-end fw-semibold">
                            {rate.price === null ? '-' : `${currency(rate.price)}/${rate.service}`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                  <div className="small text-muted mt-2" aria-live="polite">
                    {selected
                      ? `Selected expedition: ${route.rates.find((rate) => rate.id === selected)?.name}`
                      : 'No expedition selected.'}
                  </div>
                </>
              )}
            </div>
          );
        })}
    </section>
  );
}
