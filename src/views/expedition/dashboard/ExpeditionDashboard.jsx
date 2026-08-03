import { useCallback, useEffect, useMemo, useState } from 'react';
import Select from 'react-select';
import AsyncSelect from 'react-select/async';

// react-bootstrap
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import Stack from 'react-bootstrap/Stack';
import Table from 'react-bootstrap/Table';

// project-imports
import MainCard from 'components/MainCard';
import DestinationServices from '../../../services/expedition/DestinationServices';
import OriginServices from '../../../services/expedition/OriginServices';
import RateServices from '../../../services/expedition/RateServices';
import { useAlert } from '../../../utils/alertContext';
import { currency } from '../../../utils/global';

const selectStyles = {
  menu: (base) => ({ ...base, zIndex: 10 })
};

const getPayloadList = (response, keys = []) => {
  const payload = response?.data?.data ?? response?.data ?? [];
  if (Array.isArray(payload)) return payload;

  for (const key of ['data', 'items', ...keys]) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }

  return [];
};

const formatMasterOption = ({ label, code, customerCode }) => (
  <div>
    <div>{label || '-'}</div>
    {code ? <small className="text-muted">{code}</small> : null}
    {customerCode ? <small className="text-muted d-block">{customerCode}</small> : null}
  </div>
);

const filterMasterOption = ({ data }, inputValue) =>
  `${data.label} ${data.code} ${data.customerCode}`.toLowerCase().includes(inputValue.trim().toLowerCase());

const formatWeightRange = (minTonnage, maxTonnage) => {
  const minValue = Number(minTonnage);
  const maxValue = Number(maxTonnage);
  const hasMin = minTonnage !== undefined && minTonnage !== null && minTonnage !== '';
  const hasMax = maxTonnage !== undefined && maxTonnage !== null && maxTonnage !== '';

  if (!hasMin && !hasMax) return '-';

  const formatWeight = (value, numericValue) =>
    Number.isFinite(numericValue) ? numericValue.toLocaleString('id-ID') : value;
  const formattedMin = hasMin ? formatWeight(minTonnage, minValue) : null;
  const formattedMax = hasMax ? formatWeight(maxTonnage, maxValue) : null;

  if (!hasMin) return `${formattedMax} kg`;
  const hasSameWeight =
    Number.isFinite(minValue) && Number.isFinite(maxValue)
      ? minValue === maxValue
      : minTonnage === maxTonnage;

  if (!hasMax || hasSameWeight) {
    return `${formattedMin} kg`;
  }

  return `${formattedMin} - ${formattedMax} kg`;
};

const normalizeShipToOption = (item, index) => {
  const code = String(item.shipToCode ?? item.ship_to_code ?? item.address_code ?? item.AddressName ?? item.code ?? '');
  const customerCode = String(
    item.customerCode ??
      item.customer_code ??
      item.code_customer ??
      item.card_code ??
      item.CardCode ??
      item.customer?.code ??
      ''
  );
  const name =
    item.customerName ??
    item.customer_name ??
    item.name ??
    item.customer?.name ??
    item.card_name ??
    item.CardName ??
    '';
  const destination =
    item.shipToName ?? item.ship_to_name ?? item.address_name ?? item.AddressName2 ?? item.destination ?? item.city ?? '';

  return {
    value: code || String(item.id ?? item.shipto_id ?? item.ship_to_id ?? index),
    label: [name, destination].filter(Boolean).join(' - ') || code || '-',
    code,
    customerCode,
    destination: item.city ?? item.City ?? destination ?? code,
    destinationLabel: destination || name || code || '-'
  };
};

export default function ExpeditionDashboard() {
  const { showAlert } = useAlert();
  const [originOptions, setOriginOptions] = useState([]);
  const [destinationOptions, setDestinationOptions] = useState([]);
  const [loadingOrigins, setLoadingOrigins] = useState(false);
  const [loadingDestinations, setLoadingDestinations] = useState(false);
  const [loadingRatesRank, setLoadingRatesRank] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [form, setForm] = useState({
    originCode: '',
    departure: '',
    originLabel: '',
    destinationCode: '',
    destination: '',
    destinationLabel: '',
    weight: 0,
    serviceType: '',
    route: ''
  });

  const selectedOrigin = originOptions.find((item) => item.value === form.originCode) || null;
  const selectedDestination = destinationOptions.find((item) => item.value === form.destinationCode) || null;

  const fetchMasterRoutes = useCallback(async () => {
    setLoadingOrigins(true);
    setLoadingDestinations(true);

    try {
      const [originResponse, destinationResponse] = await Promise.all([
        OriginServices.getOrigins({ per_page: 100 }),
        DestinationServices.getDestinations({ per_page: 100 })
      ]);

      if (originResponse?.data?.success === false) throw new Error(originResponse.data.message || 'Failed to fetch origin data');
      if (destinationResponse?.data?.success === false) {
        throw new Error(destinationResponse.data.message || 'Failed to fetch destination data');
      }

      const origins = getPayloadList(originResponse, ['origins']);
      const destinations = getPayloadList(destinationResponse, ['shiptos', 'ship_tos', 'destinations']);

      setOriginOptions(
        origins.map((item, index) => {
          const code = String(item.whsCode ?? item.whs_code ?? item.warehouse_code ?? item.code ?? '');
          const name = item.whsNameOrigin ?? item.whs_name_origin ?? item.warehouse_name ?? item.name ?? '';

          return {
            value: code || String(item.id ?? item.origin_id ?? index),
            label: name || code || '-',
            code,
            departure: item.city || item.regency || name || code || ''
          };
        })
      );
      setDestinationOptions(destinations.map(normalizeShipToOption));
    } catch (error) {
      setOriginOptions([]);
      setDestinationOptions([]);
      showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch route master data', 'danger');
    } finally {
      setLoadingOrigins(false);
      setLoadingDestinations(false);
    }
  }, [showAlert]);

  useEffect(() => {
    fetchMasterRoutes();
  }, [fetchMasterRoutes]);

  const searchShipToOptions = useCallback(async (inputValue) => {
    try {
      const response = await DestinationServices.getDestinations({
        search: inputValue.trim() || undefined,
        per_page: 100
      });

      if (response?.data?.success === false) return [];

      return getPayloadList(response, ['shiptos', 'ship_tos', 'destinations']).map(normalizeShipToOption);
    } catch {
      return [];
    }
  }, []);

  const weight = Number(form.weight || 0);
  const cheapestRecommendation = recommendations[0];
  const weightColumns = useMemo(() => {
    const columns = new Map();

    recommendations.forEach((item) => {
      const key = `${item.min_tonnage ?? ''}|${item.max_tonnage ?? ''}`;
      if (!columns.has(key)) {
        columns.set(key, {
          key,
          label: item.weightRange,
          min: Number(item.min_tonnage ?? 0),
          max: Number(item.max_tonnage ?? item.min_tonnage ?? 0)
        });
      }
    });

    return [...columns.values()].sort((a, b) => a.min - b.min || a.max - b.max);
  }, [recommendations]);

  const expeditionComparisonRows = useMemo(() => {
    const rows = new Map();

    recommendations.forEach((item) => {
      const expeditionKey = String(item.expedition_id ?? item.expedition_code ?? item.name);
      const weightKey = `${item.min_tonnage ?? ''}|${item.max_tonnage ?? ''}`;
      const current = rows.get(expeditionKey) || {
        key: expeditionKey,
        name: item.name,
        prices: {}
      };
      const currentPrice = current.prices[weightKey];

      if (currentPrice === undefined || item.price < currentPrice) {
        current.prices[weightKey] = item.price;
      }
      rows.set(expeditionKey, current);
    });

    return [...rows.values()];
  }, [recommendations]);

  const lowestPricesByWeight = useMemo(
    () =>
      Object.fromEntries(
        weightColumns.map((column) => {
          const prices = expeditionComparisonRows
            .map((item) => item.prices[column.key])
            .filter((price) => price !== undefined && Number.isFinite(price));

          return [column.key, prices.length ? Math.min(...prices) : undefined];
        })
      ),
    [expeditionComparisonRows, weightColumns]
  );

  const handleChange = (field) => (event) => {
    setForm((current) => ({
      ...current,
      [field]: event.target.value
    }));
  };

  const handleOriginChange = (option) => {
    setForm((current) => ({
      ...current,
      originCode: option?.value || '',
      departure: option?.departure || '',
      originLabel: option?.label || ''
    }));
  };

  const handleDestinationChange = (option) => {
    if (option) {
      setDestinationOptions((current) =>
        current.some((item) => item.value === option.value) ? current : [...current, option]
      );
    }

    setForm((current) => ({
      ...current,
      destinationCode: option?.value || '',
      destination: option?.destination || '',
      destinationLabel: option?.destinationLabel || ''
    }));
  };

  const handleFindRates = async () => {
    setLoadingRatesRank(true);

    try {
      const response = await RateServices.getRatesRank(
        form.originCode,
        form.destinationCode,
        weight,
        form.serviceType,
        form.route
      );

      if (response?.data?.success === false) {
        throw new Error(response.data.message || 'Failed to fetch rate recommendations');
      }

      const rates = getPayloadList(response, ['rank', 'ranks', 'rates', 'rankings']);
      const normalizedRates = rates.map((item, index) => {
        const expedition = item.expedition_data ?? item.expedition ?? {};
        const expeditionName =
          typeof expedition === 'object'
            ? expedition.name ?? expedition.expedition_name ?? expedition.code ?? expedition.expedition_code
            : expedition;
        const totalPrice = Number(item.total_price ?? item.total_rate ?? item.rate ?? item.price ?? 0);

        return {
          ...item,
          id: item.id ?? item.rate_id ?? index,
          name: expeditionName ?? item.expedition_name ?? item.expedition_code ?? '-',
          service: item.service ?? '-',
          serviceType:
            String(item.service_type ?? item.service ?? '').toUpperCase() === 'FEET'
              ? 'CONTAINER'
              : item.service_type ?? item.service ?? '-',
          weightRange: formatWeightRange(item.min_tonnage, item.max_tonnage),
          totalPrice,
          price: Number(item.price ?? 0)
        };
      });

      setRecommendations(normalizedRates);
      if (!normalizedRates.length) showAlert('No rate recommendations found', 'info');
    } catch (error) {
      setRecommendations([]);
      showAlert(error?.response?.data?.message || error?.message || 'Failed to fetch rate recommendations', 'danger');
    } finally {
      setLoadingRatesRank(false);
    }
  };

  return (
    <Stack gap={3}>
      <MainCard
        title={
          <Stack gap={1}>
            <h5 className="mb-0">Expedition Dashboard</h5>
            <span className="text-muted f-12">Find expedition recommendations based on route and shipment weight.</span>
          </Stack>
        }
        secondary={
          cheapestRecommendation ? (
            <Badge bg="success" className="py-2 px-3">
              Cheapest: {cheapestRecommendation.name}
            </Badge>
          ) : null
        }
      >
        <Row className="g-3">
          <Col md={6}>
            <Form.Group>
              <Form.Label className="f-12 text-muted">Origin</Form.Label>
              <Select
                classNamePrefix="react-select"
                isClearable
                isLoading={loadingOrigins}
                filterOption={filterMasterOption}
                formatOptionLabel={formatMasterOption}
                noOptionsMessage={() => 'Origin not found'}
                onChange={handleOriginChange}
                options={originOptions}
                placeholder="Search origin"
                styles={selectStyles}
                value={selectedOrigin}
              />
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group>
              <Form.Label className="f-12 text-muted">Destination</Form.Label>
              <AsyncSelect
                cacheOptions
                classNamePrefix="react-select"
                defaultOptions={destinationOptions}
                isClearable
                isLoading={loadingDestinations}
                filterOption={filterMasterOption}
                formatOptionLabel={formatMasterOption}
                loadOptions={searchShipToOptions}
                noOptionsMessage={() => 'Destination not found'}
                onChange={handleDestinationChange}
                options={destinationOptions}
                placeholder="Search destination"
                styles={selectStyles}
                value={selectedDestination}
              />
            </Form.Group>
          </Col>
          <Col md={4}>
            <Form.Group>
              <Form.Label className="f-12 text-muted">Weight (Kg)</Form.Label>
              <Form.Control min={1} type="number" value={form.weight} onChange={handleChange('weight')} placeholder="0" />
            </Form.Group>
          </Col>
          <Col md={4}>
            <Form.Group>
              <Form.Label className="f-12 text-muted">Route</Form.Label>
              <Form.Select value={form.route} onChange={handleChange('route')}>
                <option value="">Select route</option>
                <option value="LAND">Land Route</option>
                <option value="SEA">Sea Route</option>
                <option value="AIR">Air Route</option>
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={4}>
            <Form.Group>
              <Form.Label className="f-12 text-muted">Service Type</Form.Label>
              <Form.Select value={form.serviceType} onChange={handleChange('serviceType')}>
                <option value="">Select service</option>
                <option value="RIT">RIT</option>
                <option value="TONASE">TONASE</option>
                <option value="FEET">CONTAINER</option>
              </Form.Select>
            </Form.Group>
          </Col>
          <Col xs={12}>
            <Button
              className="w-100 py-3"
              size="lg"
              disabled={loadingRatesRank}
              onClick={handleFindRates}
            >
              {loadingRatesRank ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
                  Finding...
                </>
              ) : (
                <>
                  <i className="ti ti-search me-2" />
                  Find Expedition Recommendation
                </>
              )}
            </Button>
          </Col>
        </Row>
      </MainCard>

      <MainCard
        title={
          <Stack gap={1}>
            <h5 className="mb-0">Expedition Recommendations</h5>
            <span className="text-muted f-12">Rates are ranked based on the selected route and shipment weight.</span>
          </Stack>
        }
        secondary={
          <Button variant="light-secondary" disabled={loadingRatesRank} onClick={handleFindRates}>
            <i className="ti ti-refresh me-1" />
            Refresh
          </Button>
        }
      >
        <Table className="mb-0 align-middle" responsive hover>
          <thead>
            <tr>
              <th>Expedition</th>
              {weightColumns.map((column) => (
                <th className="text-end" key={column.key}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {expeditionComparisonRows.length > 0 ? (
              expeditionComparisonRows.map((item) => (
                <tr key={item.key}>
                  <td>
                    <div className="fw-semibold">{item.name}</div>
                    <div className="text-muted f-12">
                      {form.originLabel || form.departure} to {form.destinationLabel || form.destination}
                    </div>
                  </td>
                  {weightColumns.map((column) => {
                    const price = item.prices[column.key];
                    const isLowestPrice =
                      price !== undefined && price === lowestPricesByWeight[column.key];

                    return (
                      <td className="text-end fw-semibold" key={column.key}>
                        {price === undefined ? (
                          <Badge bg="danger">SKIP</Badge>
                        ) : isLowestPrice ? (
                          <Badge bg="success">{currency(price)}</Badge>
                        ) : (
                          currency(price)
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={Math.max(weightColumns.length + 1, 2)} className="text-center text-muted py-4">
                  Complete the origin, destination, and weight to view recommendations.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </MainCard>
    </Stack>
  );
}
