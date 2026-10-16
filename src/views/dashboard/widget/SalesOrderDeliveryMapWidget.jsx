import { useCallback, useEffect, useMemo, useState } from 'react';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Spinner from 'react-bootstrap/Spinner';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

import MainCard from 'components/MainCard';
import DistributorServices from 'services/customer-portal/DistributorServices';
import OrderServices from 'services/customer-portal/OrderServices';
import { getRows } from './widgetUtils';
import './sales-order-delivery-map-widget.scss';

const INDONESIA_CENTER = { lat: -2.5489, lng: 118.0149 };
const MAX_GEOCODE_ADDRESSES = 30;
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const PHOTON_URL = 'https://photon.komoot.io/api/';
const WAREHOUSE_MARKER =
  'data:image/svg+xml;charset=UTF-8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="52" height="52" viewBox="0 0 52 52"><circle cx="26" cy="26" r="24" fill="#fff" stroke="#1677e8" stroke-width="3"/><path d="M11 23 26 13l15 10v17H11V23Z" fill="#1677e8"/><path d="M16 25h20v15H16V25Z" fill="#eaf4ff"/><path d="M20 29h12v11H20V29Zm-8-8 14-9 14 9" fill="none" stroke="#0d4fa8" stroke-width="2.5" stroke-linejoin="round"/><path d="M23 32h6" stroke="#1677e8" stroke-width="2"/></svg>'
  );

const WAREHOUSE_ICON = L.icon({
  iconUrl: WAREHOUSE_MARKER,
  iconSize: [46, 46],
  iconAnchor: [23, 23],
  popupAnchor: [0, -22]
});

const STATUS_GROUPS = [
  {
    key: 'WAITING',
    label: 'SO Menunggu',
    description: 'menunggu proses gudang',
    icon: 'ti ti-file-description',
    tone: 'blue',
    statuses: ['', 'DRAFT', 'OPEN', 'PENDING', 'ORDER_APPROVED', 'APPROVED']
  },
  {
    key: 'PROCESSING',
    label: 'Sedang Diproses',
    description: 'dalam proses picking/packing',
    icon: 'ti ti-settings',
    tone: 'amber',
    statuses: ['PROCESSING', 'PICKING', 'PICKLIST', 'PACKING']
  },
  {
    key: 'READY',
    label: 'DO Siap Kirim',
    description: 'menunggu keberangkatan',
    icon: 'ti ti-package',
    tone: 'green',
    statuses: ['PACKED', 'READY', 'READY_TO_SHIP', 'DO_READY']
  },
  {
    key: 'SHIPPING',
    label: 'Dalam Pengiriman',
    description: 'sedang dalam perjalanan',
    icon: 'ti ti-truck-delivery',
    tone: 'orange',
    statuses: ['SHIPPING', 'SHIPPED', 'IN_TRANSIT', 'DELIVERY', 'ON_DELIVERY']
  }
];

const firstValue = (source, keys) =>
  keys.map((key) => source?.[key]).find((value) => value !== undefined && value !== null && String(value).trim() !== '');

const normalizeStatus = (value) =>
  String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');

const statusGroupOf = (status) => STATUS_GROUPS.find((group) => group.statuses.includes(status))?.key || 'WAITING';

const distributorCodeOf = (item) =>
  String(
    firstValue(item, [
      'code_customer',
      'customer_code',
      'customerCode',
      'distributor_code',
      'distributorCode',
      'card_code',
      'CardCode',
      'code'
    ]) || ''
  ).trim();

const joinAddress = (item) => {
  if (!item) return '';
  const parts = [
    firstValue(item, ['Street', 'street', 'mail_address', 'customer_address', 'alamat']),
    firstValue(item, ['Block', 'block', 'Address', 'address', 'Address2', 'address2']),
    firstValue(item, ['City', 'city', 'district', 'kabupaten']),
    firstValue(item, ['County', 'county', 'subdistrict', 'kecamatan']),
    firstValue(item, ['State', 'state', 'province', 'provinsi']),
    firstValue(item, ['ZipCode', 'zip_code', 'postal_code', 'postalCode']),
    firstValue(item, ['Country', 'country'])
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean);

  return [...new Set(parts)].join(', ');
};

const coordinateOf = (item) => {
  const lat = Number(firstValue(item, ['latitude', 'Latitude', 'lat', 'Lat', 'gps_latitude']));
  const lng = Number(firstValue(item, ['longitude', 'Longitude', 'lng', 'Lng', 'lon', 'gps_longitude']));
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
};

const normalizeOrder = (item, distributorMap) => {
  const order = { ...item, ...(item?.sales_order || item?.order || {}) };
  const soNumber = firstValue(order, ['sap_doc_num', 'so_number', 'so_no', 'order_number', 'order_no', 'doc_num', 'DocNum']);
  const customerCode = distributorCodeOf(order) || distributorCodeOf(order?.distributor);
  const distributor = distributorMap.get(customerCode) || {};
  const address = joinAddress(distributor);
  const status = normalizeStatus(firstValue(order, ['logistic_status', 'delivery_status', 'shipping_status', 'status']));

  return {
    id: firstValue(order, ['id', 'sales_order_id', 'doc_entry', 'DocEntry']) || soNumber,
    soNumber: String(soNumber || '').trim(),
    customerCode,
    customer:
      firstValue(distributor, ['name', 'customer_name', 'name_distributor']) ||
      firstValue(order, ['customer_name', 'card_name', 'CardName']) ||
      order?.distributor?.name ||
      'Customer',
    depo:
      firstValue(distributor, ['depo', 'depot', 'customer_depo']) ||
      firstValue(order, ['depo', 'depo_name', 'depot_name']) ||
      'Tujuan pengiriman',
    address: String(address || '').trim(),
    coordinates: coordinateOf(distributor),
    status,
    statusGroup: statusGroupOf(status)
  };
};

const geocodeAddress = async (address, signal) => {
  const params = new URLSearchParams({
    q: `${address}, Indonesia`,
    format: 'jsonv2',
    limit: '1',
    countrycodes: 'id',
    'accept-language': 'id'
  });
  try {
    const response = await fetch(`${NOMINATIM_URL}?${params}`, {
      signal,
      headers: { Accept: 'application/json' }
    });
    if (response.ok) {
      const [result] = await response.json();
      if (result) {
        return { lat: Number(result.lat), lng: Number(result.lon), formattedAddress: result.display_name };
      }
    }
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
  }

  // Photon memakai data OpenStreetMap juga dan menjadi fallback ketika query
  // alamat Indonesia tidak ditemukan oleh Nominatim.
  const photonParams = new URLSearchParams({ q: `${address}, Indonesia`, limit: '1', lang: 'id' });
  const photonResponse = await fetch(`${PHOTON_URL}?${photonParams}`, { signal, headers: { Accept: 'application/json' } });
  if (!photonResponse.ok) return null;
  const [feature] = (await photonResponse.json())?.features || [];
  if (!feature?.geometry?.coordinates) return null;
  const [lng, lat] = feature.geometry.coordinates;
  const properties = feature.properties || {};
  return {
    lat: Number(lat),
    lng: Number(lng),
    formattedAddress: [properties.name, properties.street, properties.city, properties.state, properties.country].filter(Boolean).join(', ')
  };
};

const wait = (duration) => new Promise((resolve) => window.setTimeout(resolve, duration));

function FitMapToMarkers({ markers }) {
  const map = useMap();

  useEffect(() => {
    if (!markers.length) {
      map.setView([INDONESIA_CENTER.lat, INDONESIA_CENTER.lng], 5);
      return;
    }
    if (markers.length === 1) {
      map.setView([markers[0].position.lat, markers[0].position.lng], 10);
      return;
    }
    map.fitBounds(
      markers.map((marker) => [marker.position.lat, marker.position.lng]),
      { padding: [42, 42], maxZoom: 10 }
    );
  }, [map, markers]);

  return null;
}

const getShippingAddress = async (customerCode) => {
  if (!customerCode) return null;
  try {
    const response = await DistributorServices.getAddress(customerCode);
    const addresses = getRows(response, ['addresses']);
    const shippingAddress = addresses.find((item) => String(item?.AdresType || item?.address_type || '').toUpperCase() === 'S');
    const address = shippingAddress || addresses[0];
    return address ? { address: joinAddress(address), coordinates: coordinateOf(address) } : null;
  } catch {
    return null;
  }
};

export default function SalesOrderDeliveryMapWidget() {
  const [orders, setOrders] = useState([]);
  const [locations, setLocations] = useState({});
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [geocoding, setGeocoding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [orderResponse, distributorResponse] = await Promise.all([
        OrderServices.getSalesOrder(),
        DistributorServices.getAllDistributor('')
      ]);
      if (orderResponse?.data?.success === false) throw new Error(orderResponse.data.message || 'Gagal memuat Sales Order.');
      if (distributorResponse?.data?.success === false) {
        throw new Error(distributorResponse.data.message || 'Gagal memuat Master Distributor.');
      }

      const distributorRows = getRows(distributorResponse, ['distributors']);
      const distributorMap = new Map(distributorRows.map((distributor) => [distributorCodeOf(distributor), distributor]));
      let normalizedOrders = getRows(orderResponse, ['orders', 'sales_orders', 'salesOrders'])
        .map((order) => normalizeOrder(order, distributorMap))
        .filter((order) => order.soNumber);
      const customerCodes = [...new Set(normalizedOrders.map((order) => order.customerCode).filter(Boolean))].slice(
        0,
        MAX_GEOCODE_ADDRESSES
      );
      const resolvedAddresses = new Map(await Promise.all(customerCodes.map(async (code) => [code, await getShippingAddress(code)])));
      normalizedOrders = normalizedOrders.map((order) => {
        const shippingAddress = resolvedAddresses.get(order.customerCode);
        return {
          ...order,
          // Alamat tipe Shipping biasanya lebih lengkap daripada alamat utama Master Distributor.
          address: shippingAddress?.address || order.address || '',
          coordinates: shippingAddress?.coordinates || order.coordinates
        };
      });
      setOrders(normalizedOrders);
    } catch (requestError) {
      setOrders([]);
      setError(requestError?.response?.data?.message || requestError?.message || 'Gagal memuat Sales Order.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const uniqueAddresses = useMemo(
    () => [...new Set(orders.map((order) => order.address).filter(Boolean))].slice(0, MAX_GEOCODE_ADDRESSES),
    [orders]
  );

  useEffect(() => {
    if (!uniqueAddresses.length) {
      setLocations({});
      setGeocoding(false);
      return undefined;
    }
    let active = true;
    const controller = new AbortController();

    const loadLocations = async () => {
      setGeocoding(true);
      const nextLocations = {};
      orders.forEach((order) => {
        if (order.address && order.coordinates) nextLocations[order.address] = order.coordinates;
      });
      if (active && Object.keys(nextLocations).length) setLocations({ ...nextLocations });
      for (const [index, address] of uniqueAddresses.entries()) {
        if (nextLocations[address]) continue;
        const cacheKey = `dc:so-osm-map:${address.toLowerCase()}`;
        try {
          const cached = JSON.parse(sessionStorage.getItem(cacheKey) || 'null');
          if (cached?.lat && cached?.lng) {
            nextLocations[address] = cached;
            if (active) setLocations({ ...nextLocations });
            continue;
          }
        } catch {
          // Ignore an invalid cache entry and geocode the address again.
        }
        try {
          const result = await geocodeAddress(address, controller.signal);
          if (result) {
            nextLocations[address] = result;
            sessionStorage.setItem(cacheKey, JSON.stringify(result));
            if (active) setLocations({ ...nextLocations });
          }
        } catch (geocodeError) {
          if (geocodeError?.name === 'AbortError') return;
        }
        if (index < uniqueAddresses.length - 1) await wait(1100);
      }
      if (active) setGeocoding(false);
    };

    setLocations({});
    loadLocations();

    return () => {
      active = false;
      controller.abort();
    };
  }, [orders, uniqueAddresses]);

  const counts = useMemo(
    () => Object.fromEntries(STATUS_GROUPS.map((group) => [group.key, orders.filter((order) => order.statusGroup === group.key).length])),
    [orders]
  );
  const visibleOrders = useMemo(
    () => orders.filter((order) => statusFilter === 'ALL' || order.statusGroup === statusFilter),
    [orders, statusFilter]
  );
  const markers = useMemo(() => {
    const customerPoints = new Map();
    visibleOrders.forEach((order) => {
      if (!locations[order.address]) return;
      const key = `${order.customerCode || order.customer}-${order.address}`;
      const current = customerPoints.get(key);
      if (current) {
        current.soNumbers.push(order.soNumber);
        return;
      }
      customerPoints.set(key, { ...order, soNumbers: [order.soNumber], position: locations[order.address] });
    });
    return [...customerPoints.values()];
  }, [locations, visibleOrders]);
  return (
    <MainCard className="h-100 sm-so-delivery-widget">
      <div className="sm-so-status-grid">
        {STATUS_GROUPS.map((group) => (
          <button
            type="button"
            className={`sm-so-status-card is-${group.tone}${statusFilter === group.key ? ' is-active' : ''}`}
            key={group.key}
            onClick={() => setStatusFilter((current) => (current === group.key ? 'ALL' : group.key))}
          >
            <span className="sm-so-status-icon">
              <i className={group.icon} />
            </span>
            <span className="sm-so-status-copy">
              <strong>{group.label}</strong>
              <b>{counts[group.key] || 0}</b>
              <small>{group.description}</small>
            </span>
          </button>
        ))}
      </div>

      <section className="sm-so-map-panel">
        <header className="sm-so-map-header">
          <div>
            <span className="sm-so-map-title-icon">
              <i className="ti ti-map-2" />
            </span>
            <strong>Peta Pengiriman Sales Order</strong>
            <small>Lokasi berdasarkan alamat Master Distributor</small>
          </div>
          <div className="sm-so-map-actions">
            <Form.Select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filter status pengiriman"
            >
              <option value="ALL">Semua Status</option>
              {STATUS_GROUPS.map((group) => (
                <option value={group.key} key={group.key}>
                  {group.label}
                </option>
              ))}
            </Form.Select>
            <Button variant="light-primary" onClick={fetchOrders} disabled={loading} aria-label="Muat ulang Sales Order">
              <i className={`ti ${loading ? 'ti-loader-2' : 'ti-refresh'}`} />
            </Button>
          </div>
        </header>

        <div className="sm-so-map-canvas">
          {loading ? (
            <div className="sm-so-map-state">
              <Spinner size="sm" />
              <span>Memuat Sales Order...</span>
            </div>
          ) : error ? (
            <div className="sm-so-map-state text-danger">{error}</div>
          ) : (
            <MapContainer
              className="sm-so-open-map"
              center={[INDONESIA_CENTER.lat, INDONESIA_CENTER.lng]}
              zoom={5}
              minZoom={3}
              scrollWheelZoom
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <FitMapToMarkers markers={markers} />
              {markers.map((order) => (
                <Marker
                  key={`${order.customerCode || order.id}-${order.address}`}
                  position={[order.position.lat, order.position.lng]}
                  icon={WAREHOUSE_ICON}
                >
                  <Popup>
                    <div className="sm-so-map-info">
                      <strong>{order.customer}</strong>
                      <span>{order.customerCode || '-'}</span>
                      <small>SO: {order.soNumbers.join(', ')}</small>
                      <small>{order.depo}</small>
                      <small>{order.position.formattedAddress || order.address}</small>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          )}
          {!loading && !error && orders.length > 0 && markers.length === 0 ? (
            <div className="sm-so-map-empty">
              {geocoding ? (
                <>
                  <Spinner size="sm" /> Mencari koordinat alamat...
                </>
              ) : (
                'Belum ada alamat depo yang dapat dipetakan untuk status ini.'
              )}
            </div>
          ) : null}
        </div>
      </section>
    </MainCard>
  );
}
