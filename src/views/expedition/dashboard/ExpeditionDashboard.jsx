import { useMemo, useState } from 'react';

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
import { currency } from '../../../utils/global';

const cities = ['Surabaya', 'Jakarta', 'Bandung', 'Semarang', 'Yogyakarta', 'Denpasar', 'Medan', 'Makassar'];

const routeDistances = {
  'Surabaya-Jakarta': 780,
  'Surabaya-Bandung': 690,
  'Surabaya-Semarang': 350,
  'Surabaya-Yogyakarta': 330,
  'Surabaya-Denpasar': 430,
  'Surabaya-Medan': 2500,
  'Surabaya-Makassar': 980,
  'Jakarta-Bandung': 155,
  'Jakarta-Semarang': 440,
  'Jakarta-Yogyakarta': 560,
  'Jakarta-Denpasar': 1180,
  'Jakarta-Medan': 1880,
  'Jakarta-Makassar': 1450,
  'Bandung-Semarang': 370,
  'Bandung-Yogyakarta': 480,
  'Bandung-Denpasar': 1080,
  'Bandung-Medan': 1960,
  'Bandung-Makassar': 1390,
  'Semarang-Yogyakarta': 130,
  'Semarang-Denpasar': 760,
  'Semarang-Medan': 2200,
  'Semarang-Makassar': 1160,
  'Yogyakarta-Denpasar': 720,
  'Yogyakarta-Medan': 2260,
  'Yogyakarta-Makassar': 1100,
  'Denpasar-Medan': 2900,
  'Denpasar-Makassar': 900,
  'Medan-Makassar': 3100
};

const expeditionOptions = [
  {
    name: 'Nusantara Cargo',
    service: 'Reguler Darat',
    basePrice: 12000,
    perKg: 3100,
    perKm: 18,
    etaBase: 3,
    rating: 4.6
  },
  {
    name: 'Laju Express',
    service: 'Ekonomi',
    basePrice: 9000,
    perKg: 3600,
    perKm: 20,
    etaBase: 4,
    rating: 4.4
  },
  {
    name: 'Samudra Logistik',
    service: 'Cargo Laut',
    basePrice: 15000,
    perKg: 2600,
    perKm: 16,
    etaBase: 5,
    rating: 4.5
  },
  {
    name: 'Kilatan Kurir',
    service: 'Express',
    basePrice: 25000,
    perKg: 5200,
    perKm: 26,
    etaBase: 2,
    rating: 4.8
  },
  {
    name: 'Amanah Freight',
    service: 'Reguler Prioritas',
    basePrice: 18000,
    perKg: 3900,
    perKm: 22,
    etaBase: 3,
    rating: 4.7
  }
];

const getRouteDistance = (departure, destination) => {
  if (!departure || !destination || departure === destination) return 0;

  return routeDistances[`${departure}-${destination}`] || routeDistances[`${destination}-${departure}`] || 500;
};

const formatEta = (days) => `${days}-${days + 1} hari`;

export default function ExpeditionDashboard() {
  const [form, setForm] = useState({
    departure: 'Surabaya',
    destination: 'Jakarta',
    weight: 25
  });

  const weight = Number(form.weight || 0);
  const routeDistance = getRouteDistance(form.departure, form.destination);
  const isRouteValid = form.departure && form.destination && form.departure !== form.destination && weight > 0;

  const recommendations = useMemo(() => {
    if (!isRouteValid) return [];

    return expeditionOptions
      .map((option) => {
        const totalPrice = Math.round(option.basePrice + option.perKg * weight + option.perKm * routeDistance);
        const etaDays = option.etaBase + Math.ceil(routeDistance / 900);

        return {
          ...option,
          totalPrice,
          eta: formatEta(etaDays),
          pricePerKg: Math.round(totalPrice / weight)
        };
      })
      .sort((a, b) => a.totalPrice - b.totalPrice);
  }, [isRouteValid, routeDistance, weight]);

  const cheapestRecommendation = recommendations[0];

  const handleChange = (field) => (event) => {
    setForm((current) => ({
      ...current,
      [field]: event.target.value
    }));
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
          <Col md={6} xl={3}>
            <Form.Group>
              <Form.Label>Origin</Form.Label>
              <Form.Select value={form.departure} onChange={handleChange('departure')}>
                {cities.map((city) => (
                  <option value={city} key={city}>
                    {city}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={6} xl={3}>
            <Form.Group>
              <Form.Label>Destination</Form.Label>
              <Form.Select value={form.destination} onChange={handleChange('destination')}>
                {cities.map((city) => (
                  <option value={city} key={city}>
                    {city}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={6} xl={3}>
            <Form.Group>
              <Form.Label>Weight</Form.Label>
              <Form.Control min={1} type="number" value={form.weight} onChange={handleChange('weight')} />
            </Form.Group>
          </Col>
          <Col md={6} xl={3}>
            <div className="border rounded p-3 h-100">
              <span className="text-muted f-12">Estimated Distance</span>
              <h4 className="mb-0 mt-2">{routeDistance} km</h4>
            </div>
          </Col>
        </Row>
      </MainCard>

      <Row className="g-3">
        <Col md={4}>
          <Card className="border mb-0 h-100">
            <Card.Body>
              <Stack direction="horizontal" className="justify-content-between" gap={3}>
                <div>
                  <div className="text-muted f-12">Route</div>
                  <h5 className="mb-0">
                    {form.departure} - {form.destination}
                  </h5>
                </div>
                <span className="avtar avtar-s bg-light-primary text-primary">
                  <i className="ti ti-route" />
                </span>
              </Stack>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
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
        <Col md={4}>
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
            <span className="text-muted f-12">Dummy data is automatically sorted from the lowest price.</span>
          </Stack>
        }
        secondary={
          <Button variant="light-secondary" disabled>
            <i className="ti ti-database me-1" />
            Dummy Data
          </Button>
        }
      >
        <Table className="mb-0 align-middle" responsive hover>
          <thead>
            <tr>
              <th>Expedition</th>
              <th>Service</th>
              <th className="text-end">Estimated Price</th>
              <th className="text-end">Price / Kg</th>
              <th>ETA</th>
              <th className="text-center">Rating</th>
              <th className="text-center">Recommendation</th>
            </tr>
          </thead>
          <tbody>
            {recommendations.length > 0 ? (
              recommendations.map((item, index) => (
                <tr key={`${item.name}-${item.service}`}>
                  <td>
                    <div className="fw-semibold">{item.name}</div>
                    <div className="text-muted f-12">
                      {form.departure} to {form.destination}
                    </div>
                  </td>
                  <td>{item.service}</td>
                  <td className="text-end fw-semibold">{currency(item.totalPrice)}</td>
                  <td className="text-end">{currency(item.pricePerKg)}</td>
                  <td>{item.eta}</td>
                  <td className="text-center">{item.rating}</td>
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
                <td colSpan={7} className="text-center text-muted py-4">
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
