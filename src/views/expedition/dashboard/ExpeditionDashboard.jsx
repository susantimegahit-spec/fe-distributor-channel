import { useCallback, useEffect, useMemo, useState } from 'react';
import Select from 'react-select';
import AsyncSelect from 'react-select/async';

// react-bootstrap
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
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

const routeOptions = [
  { value: 'D', label: 'Land Route' },
  { value: 'L', label: 'Sea Route' },
  { value: 'U', label: 'Air Route' }
];

const serviceTypeOptions = [
  { value: 'RIT', label: 'RIT' },
  { value: 'TONASE', label: 'TONASE' },
  { value: 'FEET', label: 'CONTAINER' }
];

const dummyDeliveryOrders = [
  {
    id: 'ORD-2026-10482',
    customer: 'PT Sumber Pangan Sejahtera',
    originCode: 'SBY-01',
    origin: 'Gudang Surabaya',
    originCity: 'Surabaya',
    destinationCode: 'JKT-PST-01',
    destination: 'Jakarta Pusat',
    destinationCity: 'DKI Jakarta',
    weight: 350,
    route: ['D'],
    serviceType: 'TONASE',
    deliveryDate: '28 Agu 2026'
  },
  {
    id: 'ORD-2026-10477',
    customer: 'CV Berkah Niaga',
    originCode: 'GRS-01',
    origin: 'Gudang Gresik',
    originCity: 'Gresik',
    destinationCode: 'SMG-01',
    destination: 'Semarang',
    destinationCity: 'Jawa Tengah',
    weight: 1200,
    route: ['D'],
    serviceType: 'RIT',
    deliveryDate: '29 Agu 2026'
  },
  {
    id: 'ORD-2026-10469',
    customer: 'PT Mitra Distribusi Utama',
    originCode: 'JKT-02',
    origin: 'Gudang Jakarta',
    originCity: 'Jakarta',
    destinationCode: 'MDN-01',
    destination: 'Medan',
    destinationCity: 'Sumatera Utara',
    weight: 18000,
    route: ['L'],
    serviceType: 'FEET',
    deliveryDate: '30 Agu 2026'
  },
  {
    id: 'ORD-2026-10461',
    customer: 'PT Karya Retail Indonesia',
    originCode: 'MKS-01',
    origin: 'Gudang Makassar',
    originCity: 'Makassar',
    destinationCode: 'BPN-01',
    destination: 'Balikpapan',
    destinationCity: 'Kalimantan Timur',
    weight: 780,
    route: ['L'],
    serviceType: 'TONASE',
    deliveryDate: '31 Agu 2026'
  }
];

const getDummyRecommendations = (order) => {
  const basePrice = Math.max(Number(order.weight) * 2850, 850000);
  const weightRange = `${Math.max(1, Math.floor(order.weight * 0.75)).toLocaleString('id-ID')} - ${Math.ceil(order.weight * 1.25).toLocaleString('id-ID')} kg`;

  return [
    {
      id: `${order.id}-sm-logistics`,
      name: 'SM Logistics',
      serviceType: order.serviceType,
      weightRange,
      totalPrice: Math.round(basePrice),
      price: Math.round(basePrice)
    },
    {
      id: `${order.id}-nusantara`,
      name: 'Nusantara Cargo',
      serviceType: order.serviceType,
      weightRange,
      totalPrice: Math.round(basePrice * 1.08),
      price: Math.round(basePrice * 1.08)
    },
    {
      id: `${order.id}-lintas`,
      name: 'Lintas Samudra Express',
      serviceType: order.serviceType,
      weightRange,
      totalPrice: Math.round(basePrice * 1.16),
      price: Math.round(basePrice * 1.16)
    }
  ];
};

const vendorStatusBadge = {
  'Pending Review': { bg: 'light', text: 'primary', className: 'border border-primary' },
  'Under Review': { bg: 'info', text: 'dark', className: 'border border-info' },
  'Need Document': { bg: 'warning', text: 'dark', className: 'border border-warning' },
  Approved: { bg: 'success', text: 'light', className: 'border border-success' },
  Rejected: { bg: 'danger', text: 'light', className: 'border border-danger' }
};

const dummyVendorRequests = [
  {
    id: 'VREG-2026-0041',
    company: 'PT Trans Logistik Nusantara',
    pic: 'Rama Wijaya',
    email: 'rama@translogistik.co.id',
    submittedAt: '26 Agu 2026, 09:15',
    documents: 4,
    status: 'Pending Review'
  },
  {
    id: 'VREG-2026-0038',
    company: 'CV Lintas Kargo Mandiri',
    pic: 'Dewi Anggraini',
    email: 'dewi@lintaskargo.id',
    submittedAt: '25 Agu 2026, 14:42',
    documents: 4,
    status: 'Pending Review'
  },
  {
    id: 'VREG-2026-0035',
    company: 'PT Armada Cepat Indonesia',
    pic: 'Agus Setiawan',
    email: 'agus@armadacepat.co.id',
    submittedAt: '24 Agu 2026, 11:20',
    documents: 3,
    status: 'Need Document'
  }
];

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

const formatDestinationOption = ({ label, street }) => (
  <div>
    <div>{label || '-'}</div>
    <small className="text-muted d-block">{street || '-'}</small>
  </div>
);

const filterMasterOption = ({ data }, inputValue) =>
  `${data.label} ${data.code} ${data.customerCode} ${data.street}`.toLowerCase().includes(inputValue.trim().toLowerCase());

const formatWeightRange = (minTonnage, maxTonnage) => {
  const minValue = Number(minTonnage);
  const maxValue = Number(maxTonnage);
  const hasMin = minTonnage !== undefined && minTonnage !== null && minTonnage !== '';
  const hasMax = maxTonnage !== undefined && maxTonnage !== null && maxTonnage !== '';

  if (!hasMin && !hasMax) return '-';

  const formatWeight = (value, numericValue) => (Number.isFinite(numericValue) ? numericValue.toLocaleString('id-ID') : value);
  const formattedMin = hasMin ? formatWeight(minTonnage, minValue) : null;
  const formattedMax = hasMax ? formatWeight(maxTonnage, maxValue) : null;

  if (!hasMin) return `${formattedMax} kg`;
  const hasSameWeight = Number.isFinite(minValue) && Number.isFinite(maxValue) ? minValue === maxValue : minTonnage === maxTonnage;

  if (!hasMax || hasSameWeight) {
    return `${formattedMin} kg`;
  }

  return `${formattedMin} - ${formattedMax} kg`;
};

const normalizeShipToOption = (item, index) => {
  const code = String(item.shipToCode ?? item.ship_to_code ?? item.address_code ?? item.AddressName ?? item.code ?? '');
  const customerCode = String(
    item.customerCode ?? item.customer_code ?? item.code_customer ?? item.card_code ?? item.CardCode ?? item.customer?.code ?? ''
  );
  const name = item.customerName ?? item.customer_name ?? item.name ?? item.customer?.name ?? item.card_name ?? item.CardName ?? '';
  const destination = item.shipToName ?? item.ship_to_name ?? item.address_name ?? item.AddressName2 ?? item.destination ?? item.city ?? '';
  const alias = item.alias ?? item.ship_to_alias ?? item.destination_alias ?? '';
  const street = item.street ?? item.Street ?? item.ship_to_address ?? item.Address ?? item.address ?? '';

  return {
    value: code || String(item.id ?? item.shipto_id ?? item.ship_to_id ?? index),
    label: alias || destination || name || code || '-',
    code,
    customerCode,
    destination: item.city ?? item.City ?? destination ?? code,
    destinationLabel: alias || destination || name || code || '-',
    street,
    city: item.city ?? item.City ?? ''
  };
};

export default function ExpeditionDashboard() {
  const { showAlert } = useAlert();
  const [activeTab, setActiveTab] = useState('orders');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showRecommendationModal, setShowRecommendationModal] = useState(false);
  const [vendorRequests, setVendorRequests] = useState(dummyVendorRequests);
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
    originStreet: '',
    originCity: '',
    destinationCode: '',
    destination: '',
    destinationLabel: '',
    destinationStreet: '',
    destinationCity: '',
    weight: 0,
    serviceType: '',
    route: []
  });

  const selectedOrigin =
    originOptions.find((item) => item.value === form.originCode) ||
    (form.originCode ? { value: form.originCode, label: form.originLabel, code: form.originCode, city: form.originCity } : null);
  const selectedDestination =
    destinationOptions.find((item) => item.value === form.destinationCode) ||
    (form.destinationCode
      ? { value: form.destinationCode, label: form.destinationLabel, code: form.destinationCode, city: form.destinationCity }
      : null);
  const selectedRoute = routeOptions.filter((item) => form.route.includes(item.value));
  const selectedServiceType = serviceTypeOptions.find((item) => item.value === form.serviceType) || null;

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
            departure: item.city || item.regency || name || code || '',
            street: item.street ?? item.address ?? '',
            city: item.city ?? item.regency ?? item.city_name ?? ''
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

  const originLocation = form.originStreet
    ? `${form.originStreet}${form.originCity ? ` (${form.originCity})` : ''}`
    : form.originCity
      ? `(${form.originCity})`
      : '';
  const originHeader = [form.originLabel, originLocation].filter(Boolean).join(' - ');
  const destinationLocation = form.destinationStreet
    ? `${form.destinationStreet}${form.destinationCity ? ` (${form.destinationCity})` : ''}`
    : form.destinationCity
      ? `(${form.destinationCity})`
      : '';
  const destinationHeader = [form.destinationLabel, destinationLocation].filter(Boolean).join(' - ');

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
      originLabel: option?.label || '',
      originStreet: option?.street || '',
      originCity: option?.city || ''
    }));
  };

  const handleDestinationChange = (option) => {
    if (option) {
      setDestinationOptions((current) => (current.some((item) => item.value === option.value) ? current : [...current, option]));
    }

    setForm((current) => ({
      ...current,
      destinationCode: option?.value || '',
      destination: option?.destination || '',
      destinationLabel: option?.destinationLabel || '',
      destinationStreet: option?.street || '',
      destinationCity: option?.city || ''
    }));
  };

  const handleFindRates = async (criteria = form) => {
    setLoadingRatesRank(true);

    try {
      const response = await RateServices.getRatesRank(
        criteria.originCode,
        criteria.destinationCode,
        Number(criteria.weight || 0),
        criteria.serviceType,
        criteria.route
      );

      if (response?.data?.success === false) {
        throw new Error(response.data.message || 'Failed to fetch rate recommendations');
      }

      const rates = getPayloadList(response, ['rank', 'ranks', 'rates', 'rankings']);
      const normalizedRates = rates.map((item, index) => {
        const expedition = item.expedition_data ?? item.expedition ?? {};
        const expeditionName =
          typeof expedition === 'object'
            ? (expedition.name ?? expedition.expedition_name ?? expedition.code ?? expedition.expedition_code)
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
              : (item.service_type ?? item.service ?? '-'),
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

  const handleOrderRecommendation = (order) => {
    const orderCriteria = {
      originCode: order.originCode,
      departure: order.originCity,
      originLabel: order.origin,
      originStreet: '',
      originCity: order.originCity,
      destinationCode: order.destinationCode,
      destination: order.destinationCity,
      destinationLabel: order.destination,
      destinationStreet: '',
      destinationCity: order.destinationCity,
      weight: order.weight,
      serviceType: order.serviceType,
      route: order.route
    };

    setSelectedOrder(order);
    setShowRecommendationModal(true);
    setForm(orderCriteria);
    setRecommendations(getDummyRecommendations(order));
  };

  const handleSelectRecommendation = (recommendation) => {
    showAlert(`${recommendation.name} dipilih untuk ${selectedOrder?.id}`, 'success');
    setShowRecommendationModal(false);
  };

  const handleVendorRequest = (request, status) => {
    setVendorRequests((current) => current.map((item) => (item.id === request.id ? { ...item, status } : item)));
    showAlert(`${request.company}: ${status}`, status === 'Approved' ? 'success' : status === 'Rejected' ? 'danger' : 'info');
  };

  return (
    <Stack gap={3}>
      <MainCard
        title={
          <Stack gap={1}>
            <Stack direction="horizontal" gap={2}>
              <h5 className="mb-0">Vendor Registration Requests</h5>
              <Badge bg="warning" text="dark">
                {vendorRequests.filter((request) => ['Pending Review', 'Under Review', 'Need Document'].includes(request.status)).length}{' '}
                REQUEST
              </Badge>
            </Stack>
            <span className="text-muted f-12">Pengajuan vendor ekspedisi baru dari Vendor Portal.</span>
          </Stack>
        }
      >
        <Table responsive hover className="mb-0 align-middle">
          <thead>
            <tr>
              <th>Request</th>
              <th>Company</th>
              <th>PIC</th>
              <th>Submitted At</th>
              <th>Legal Documents</th>
              <th>Status</th>
              <th className="text-end">Action</th>
            </tr>
          </thead>
          <tbody>
            {vendorRequests.map((request) => (
              <tr key={request.id}>
                <td>
                  <span className="fw-semibold">{request.id}</span>
                  <small className="text-muted d-block">Expedition vendor</small>
                </td>
                <td>
                  <div className="fw-semibold">{request.company}</div>
                  <small className="text-muted">{request.email}</small>
                </td>
                <td>{request.pic}</td>
                <td>{request.submittedAt}</td>
                <td>
                  <Badge
                    bg={request.documents === 4 ? 'light' : 'warning'}
                    text={request.documents === 4 ? 'success' : 'dark'}
                    className="border"
                  >
                    {request.documents}/4 uploaded
                  </Badge>
                </td>
                <td>
                  <Badge {...(vendorStatusBadge[request.status] || vendorStatusBadge['Pending Review'])}>{request.status}</Badge>
                </td>
                <td className="text-end">
                  <Stack direction="horizontal" gap={1} className="justify-content-end">
                    <Button size="sm" variant="light-secondary" onClick={() => handleVendorRequest(request, 'Under Review')}>
                      <i className="ti ti-eye" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline-danger"
                      disabled={request.status === 'Rejected'}
                      onClick={() => handleVendorRequest(request, 'Rejected')}
                    >
                      <i className="ti ti-x" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline-success"
                      disabled={request.documents < 4 || request.status === 'Approved'}
                      onClick={() => handleVendorRequest(request, 'Approved')}
                    >
                      <i className="ti ti-check" />
                    </Button>
                  </Stack>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </MainCard>

      <MainCard>
        <Stack direction="horizontal" gap={2} className="flex-wrap">
          <Button variant={activeTab === 'orders' ? 'primary' : 'light-secondary'} onClick={() => setActiveTab('orders')}>
            <i className="ti ti-package me-2" /> Orders
            <Badge bg={activeTab === 'orders' ? 'light' : 'primary'} text={activeTab === 'orders' ? 'primary' : undefined} className="ms-2">
              {dummyDeliveryOrders.length}
            </Badge>
          </Button>
          <Button variant={activeTab === 'find' ? 'primary' : 'light-secondary'} onClick={() => setActiveTab('find')}>
            <i className="ti ti-search me-2" /> Find
          </Button>
        </Stack>
      </MainCard>

      {activeTab === 'orders' ? (
        <>
          <MainCard
            title={
              <Stack gap={1}>
                <h5 className="mb-0">Delivery Orders</h5>
                <span className="text-muted f-12">Pilih rekomendasi ekspedisi berdasarkan origin, tujuan, dan berat pengiriman.</span>
              </Stack>
            }
          >
            <Table responsive hover className="mb-0 align-middle">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Origin</th>
                  <th>Destination</th>
                  <th className="text-end">Weight</th>
                  <th>Delivery Date</th>
                  <th>Status</th>
                  <th className="text-end">Action</th>
                </tr>
              </thead>
              <tbody>
                {dummyDeliveryOrders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <span className="fw-semibold">{order.id}</span>
                    </td>
                    <td>{order.customer}</td>
                    <td>
                      <div>{order.origin}</div>
                      <small className="text-muted">{order.originCode}</small>
                    </td>
                    <td>
                      <div>{order.destination}</div>
                      <small className="text-muted">{order.destinationCity}</small>
                    </td>
                    <td className="text-end fw-semibold">{order.weight.toLocaleString('id-ID')} kg</td>
                    <td>{order.deliveryDate}</td>
                    <td>
                      <Badge bg="light" text="primary" className="border border-primary">
                        DELIVERY
                      </Badge>
                    </td>
                    <td className="text-end">
                      <Button size="sm" onClick={() => handleOrderRecommendation(order)}>
                        <i className="ti ti-sparkles me-1" /> Choose Recommendation
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </MainCard>
        </>
      ) : (
        <>
          <MainCard
            title={
              <Stack gap={1}>
                <h5 className="mb-0">Expedition Dashboard</h5>
                <span className="text-muted f-12">Find expedition recommendations based on route and shipment weight.</span>
              </Stack>
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
                    formatOptionLabel={formatDestinationOption}
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
                  <Select
                    classNamePrefix="react-select"
                    isMulti
                    isClearable
                    options={routeOptions}
                    placeholder="Search route"
                    styles={selectStyles}
                    value={selectedRoute}
                    onChange={(options) =>
                      setForm((current) => ({
                        ...current,
                        route: options.map((option) => option.value)
                      }))
                    }
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="f-12 text-muted">Service Type</Form.Label>
                  <Select
                    classNamePrefix="react-select"
                    isClearable
                    options={serviceTypeOptions}
                    placeholder="Search service type"
                    styles={selectStyles}
                    value={selectedServiceType}
                    onChange={(option) => setForm((current) => ({ ...current, serviceType: option?.value || '' }))}
                  />
                </Form.Group>
              </Col>
              <Col xs={12}>
                <Button className="w-100 py-3" size="lg" disabled={loadingRatesRank} onClick={() => handleFindRates()}>
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
              <Button variant="light-secondary" disabled={loadingRatesRank} onClick={() => handleFindRates()}>
                <i className="ti ti-refresh me-1" />
                Refresh
              </Button>
            }
          >
            {originHeader || destinationHeader ? (
              <Row className="g-2 mb-3">
                <Col md={6}>
                  <div className="rounded border bg-light-primary px-3 py-2 h-100">
                    <span className="text-muted f-12 d-block">Origin</span>
                    <span className="fw-semibold">{originHeader || '-'}</span>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="rounded border bg-light-primary px-3 py-2 h-100">
                    <span className="text-muted f-12 d-block">Destination</span>
                    <span className="fw-semibold">{destinationHeader || '-'}</span>
                  </div>
                </Col>
              </Row>
            ) : null}
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
                      </td>
                      {weightColumns.map((column) => {
                        const price = item.prices[column.key];
                        const isLowestPrice = price !== undefined && price === lowestPricesByWeight[column.key];

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
        </>
      )}

      <Modal show={showRecommendationModal} onHide={() => setShowRecommendationModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Expedition Recommendation</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedOrder ? (
            <Row className="g-2 mb-4">
              <Col md={3}>
                <div className="rounded border bg-light px-3 py-2 h-100">
                  <small className="text-muted d-block">Order</small>
                  <span className="fw-semibold f-12">{selectedOrder.id}</span>
                </div>
              </Col>
              <Col md={3}>
                <div className="rounded border bg-light px-3 py-2 h-100">
                  <small className="text-muted d-block">Origin</small>
                  <span className="fw-semibold f-12">{selectedOrder.origin}</span>
                </div>
              </Col>
              <Col md={3}>
                <div className="rounded border bg-light px-3 py-2 h-100">
                  <small className="text-muted d-block">Destination</small>
                  <span className="fw-semibold f-12">{selectedOrder.destination}</span>
                </div>
              </Col>
              <Col md={3}>
                <div className="rounded border bg-light px-3 py-2 h-100">
                  <small className="text-muted d-block">Weight</small>
                  <span className="fw-semibold f-12">{selectedOrder.weight.toLocaleString('id-ID')} kg</span>
                </div>
              </Col>
            </Row>
          ) : null}
          {loadingRatesRank ? (
            <div className="text-center py-5">
              <span className="spinner-border text-primary mb-3" aria-hidden="true" />
              <h6 className="mb-1">Finding the best expedition</h6>
              <p className="text-muted f-12 mb-0">Mencocokkan origin, tujuan, dan berat order.</p>
            </div>
          ) : recommendations.length ? (
            <Table responsive hover className="mb-0 align-middle">
              <thead>
                <tr>
                  <th>Expedition</th>
                  <th>Service</th>
                  <th>Weight Range</th>
                  <th className="text-end">Price</th>
                  <th className="text-end">Action</th>
                </tr>
              </thead>
              <tbody>
                {recommendations.map((recommendation, index) => (
                  <tr key={`${recommendation.id}-${index}`}>
                    <td>
                      <div className="fw-semibold">{recommendation.name}</div>
                      {index === 0 ? (
                        <Badge bg="success" className="mt-1">
                          Best recommendation
                        </Badge>
                      ) : null}
                    </td>
                    <td>{recommendation.serviceType}</td>
                    <td>{recommendation.weightRange}</td>
                    <td className="text-end fw-semibold">{currency(recommendation.totalPrice || recommendation.price)}</td>
                    <td className="text-end">
                      <Button
                        size="sm"
                        variant={index === 0 ? 'primary' : 'outline-primary'}
                        onClick={() => handleSelectRecommendation(recommendation)}
                      >
                        <i className="ti ti-check me-1" /> Select
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <div className="text-center py-5">
              <span className="avtar avtar-xl bg-light-secondary text-secondary mb-3">
                <i className="ti ti-truck-off f-28" />
              </span>
              <h6 className="mb-1">No recommendation found</h6>
              <p className="text-muted f-12 mb-0">Belum ada rates yang sesuai dengan kriteria order ini.</p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light-secondary" onClick={() => setShowRecommendationModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Stack>
  );
}
