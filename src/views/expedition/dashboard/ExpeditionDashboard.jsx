import { useCallback, useEffect, useState } from 'react';
import Select from 'react-select';

// react-bootstrap
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
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
    weight: 25,
    serviceType: ''
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
      setDestinationOptions(
        destinations.map((item, index) => {
          const code = String(
            item.shipToCode ?? item.ship_to_code ?? item.address_code ?? item.AddressName ?? item.code ?? ''
          );
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
        })
      );
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

  const weight = Number(form.weight || 0);
  const cheapestRecommendation = recommendations[0];

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
    setForm((current) => ({
      ...current,
      destinationCode: option?.value || '',
      destination: option?.destination || '',
      destinationLabel: option?.destinationLabel || ''
    }));
  };

  const handleFindRates = async () => {
    if (!form.originCode || !form.destinationCode || weight <= 0 || !form.serviceType) {
      showAlert('Please select origin, destination, service type, and enter a valid weight', 'warning');
      return;
    }

    setLoadingRatesRank(true);

    try {
      const response = await RateServices.getRatesRank(form.originCode, form.destinationCode, weight, form.serviceType);

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
          service: item.service_type ?? item.service ?? '-',
          totalPrice,
          pricePerKg: Number(item.price_per_kg ?? item.rate_per_kg ?? (weight > 0 ? totalPrice / weight : 0))
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
          <Col md={6} xl={4}>
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
          <Col md={6} xl={4}>
            <Form.Group>
              <Form.Label className="f-12 text-muted">Destination</Form.Label>
              <Select
                classNamePrefix="react-select"
                isClearable
                isLoading={loadingDestinations}
                filterOption={filterMasterOption}
                formatOptionLabel={formatMasterOption}
                noOptionsMessage={() => 'Destination not found'}
                onChange={handleDestinationChange}
                options={destinationOptions}
                placeholder="Search destination"
                styles={selectStyles}
                value={selectedDestination}
              />
            </Form.Group>
          </Col>
          <Col md={6} xl={2}>
            <Form.Group>
              <Form.Label className="f-12 text-muted">Weight (Kg)</Form.Label>
              <Form.Control min={1} type="number" value={form.weight} onChange={handleChange('weight')} placeholder="0" />
            </Form.Group>
          </Col>
          <Col md={6} xl={2}>
            <Form.Group>
              <Form.Label className="f-12 text-muted">Service Type</Form.Label>
              <Form.Select value={form.serviceType} onChange={handleChange('serviceType')}>
                <option value="">Select service</option>
                <option value="RIT">RIT</option>
                <option value="TONASE">TONASE</option>
                <option value="FEET">FEET</option>
              </Form.Select>
            </Form.Group>
          </Col>
          <Col xs={12}>
            <Button
              className="w-100 py-3"
              size="lg"
              disabled={loadingRatesRank || !form.originCode || !form.destinationCode || weight <= 0 || !form.serviceType}
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

      <Row className="g-3">
        <Col md={6}>
          <Card className="border mb-0 h-100">
            <Card.Body>
              <Stack direction="horizontal" className="justify-content-between" gap={3}>
                <div>
                  <div className="text-muted f-12">Shipment Weight</div>
                  <h5 className="mb-0">{weight > 0 ? `${weight} kg` : '-'}</h5>
                </div>
                <span className="avtar avtar-s bg-light-info text-info">
                  <i className="ti ti-weight" />
                </span>
              </Stack>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="border mb-0 h-100">
            <Card.Body>
              <Stack direction="horizontal" className="justify-content-between" gap={3}>
                <div>
                  <div className="text-muted f-12">Lowest Price</div>
                  <h5 className="mb-0">{cheapestRecommendation ? currency(cheapestRecommendation.totalPrice) : '-'}</h5>
                </div>
                <span className="avtar avtar-s bg-light-success text-success">
                  <i className="ti ti-cash" />
                </span>
              </Stack>
            </Card.Body>
          </Card>
        </Col>
      </Row>

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
              <th>Service</th>
              <th className="text-end">Estimated Price</th>
              <th className="text-end">Price</th>
              <th className="text-center">Recommendation</th>
            </tr>
          </thead>
          <tbody>
            {recommendations.length > 0 ? (
              recommendations.map((item, index) => (
                <tr key={item.id || `${item.name}-${item.service}`}>
                  <td>
                    <div className="fw-semibold">{item.name}</div>
                    <div className="text-muted f-12">
                      {form.originLabel || form.departure} to {form.destinationLabel || form.destination}
                    </div>
                  </td>
                  <td>{item.service}</td>
                  <td className="text-end fw-semibold">{currency(item.totalPrice)}</td>
                  <td className="text-end">{currency(item.pricePerKg)}</td>
                  <td className="text-center">
                    {index === 0 ? (
                      <Badge bg="success">Cheapest</Badge>
                    ) : (
                      <Badge bg="light" text="dark">
                        Alternative
                      </Badge>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="text-center text-muted py-4">
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
