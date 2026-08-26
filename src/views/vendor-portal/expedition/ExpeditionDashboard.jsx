import { useRef, useState } from 'react';

import VendorDashboardLayout from '../shared/VendorDashboardLayout';
import { recordVendorPortalActivity } from 'utils/vendorPortal';

const dummyRates = [
  {
    id: 1,
    warehouse_name: 'Gudang Surabaya',
    warehouse_code: 'SBY-01',
    destination: 'Jakarta Pusat',
    destination_city: 'DKI Jakarta',
    expedition: 'SM Logistics',
    min_tonnage: 1,
    max_tonnage: 100,
    service_type: 'KG',
    rate: 3250
  },
  {
    id: 2,
    warehouse_name: 'Gudang Surabaya',
    warehouse_code: 'SBY-01',
    destination: 'Bandung',
    destination_city: 'Jawa Barat',
    expedition: 'SM Logistics',
    min_tonnage: 101,
    max_tonnage: 500,
    service_type: 'KG',
    rate: 2750
  },
  {
    id: 3,
    warehouse_name: 'Gudang Gresik',
    warehouse_code: 'GRS-01',
    destination: 'Semarang',
    destination_city: 'Jawa Tengah',
    expedition: 'Nusantara Cargo',
    min_tonnage: 1,
    max_tonnage: 1,
    service_type: 'RIT',
    rate: 1850000
  },
  {
    id: 4,
    warehouse_name: 'Gudang Jakarta',
    warehouse_code: 'JKT-02',
    destination: 'Medan',
    destination_city: 'Sumatera Utara',
    expedition: 'Lintas Samudra',
    min_tonnage: 20,
    max_tonnage: 20,
    service_type: 'CONTAINER',
    rate: 7800000
  },
  {
    id: 5,
    warehouse_name: 'Gudang Makassar',
    warehouse_code: 'MKS-01',
    destination: 'Balikpapan',
    destination_city: 'Kalimantan Timur',
    expedition: 'Nusantara Cargo',
    min_tonnage: 1,
    max_tonnage: 50,
    service_type: 'KG',
    rate: 0
  }
];

const ongoingShipments = [
  {
    id: 'SHP-2026-00841',
    origin: 'Surabaya',
    destination: 'Jakarta Pusat',
    vehicle: 'B 9124 TXU',
    driver: 'Budi Santoso',
    status: 'Dalam perjalanan',
    progress: 68,
    eta: '28 Agu 2026, 14:30'
  },
  {
    id: 'SHP-2026-00839',
    origin: 'Gresik',
    destination: 'Semarang',
    vehicle: 'L 8742 AAB',
    driver: 'Andi Pratama',
    status: 'Transit',
    progress: 46,
    eta: '28 Agu 2026, 19:00'
  },
  {
    id: 'SHP-2026-00835',
    origin: 'Jakarta',
    destination: 'Medan',
    vehicle: 'B 7381 FZA',
    driver: 'Rizky Maulana',
    status: 'Menuju hub tujuan',
    progress: 82,
    eta: '29 Agu 2026, 09:15'
  },
  {
    id: 'SHP-2026-00828',
    origin: 'Makassar',
    destination: 'Balikpapan',
    vehicle: 'DD 9027 XK',
    driver: 'Fajar Hidayat',
    status: 'Dalam perjalanan',
    progress: 31,
    eta: '29 Agu 2026, 16:45'
  }
];

const formatNumber = (value) => Number(value).toLocaleString('id-ID');
const formatWeightRange = ({ min_tonnage: minimum, max_tonnage: maximum }) =>
  Number(minimum) === Number(maximum) ? formatNumber(minimum) : `${formatNumber(minimum)} - ${formatNumber(maximum)}`;

export default function ExpeditionDashboard() {
  const uploadInputRef = useRef(null);
  const [notice, setNotice] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');

  const handleAction = (rate) => {
    const detail = `${rate.warehouse_code} menuju ${rate.destination}`;
    setNotice(`Action untuk rate ${detail} siap dihubungkan ke API.`);
    recordVendorPortalActivity('EXPEDITION_RATE_ACTION', detail);
  };

  const handleRatesUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setNotice(`${file.name} siap diunggah setelah service API tersedia.`);
    recordVendorPortalActivity('EXPEDITION_RATES_UPLOAD', file.name);
    event.target.value = '';
  };

  return (
    <VendorDashboardLayout portalName="Expedition Vendor Portal">
      <nav className="vp-portal-tabs" aria-label="Navigasi Expedition Vendor Portal">
        <button type="button" className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => setActiveTab('dashboard')}>
          <i className="ti ti-layout-dashboard" /> Dashboard
        </button>
        <button type="button" className={activeTab === 'rates' ? 'active' : ''} onClick={() => setActiveTab('rates')}>
          <i className="ti ti-route" /> Rates <span>{dummyRates.length}</span>
        </button>
      </nav>
      <div className="vp-welcome vp-dashboard-heading">
        <div>
          <span className="vp-kicker">Expedition workspace</span>
          <h1>{activeTab === 'dashboard' ? 'Dashboard Ekspedisi' : 'Rates Pengiriman'}</h1>
          <p>
            {activeTab === 'dashboard'
              ? 'Ringkasan aktivitas dan data utama vendor ekspedisi.'
              : 'Preview data rates dengan struktur yang sama seperti menu Expedition Rates.'}
          </p>
        </div>
      </div>
      {activeTab === 'dashboard' ? (
        <>
          <div className="vp-rate-summary vp-dashboard-summary">
            <span>
              <i className="ti ti-route" />
              <small>Total rates</small>
              <strong>{dummyRates.length}</strong>
            </span>
            <span>
              <i className="ti ti-map-pin" />
              <small>Destination</small>
              <strong>{new Set(dummyRates.map((rate) => rate.destination)).size}</strong>
            </span>
            <span>
              <i className="ti ti-truck-delivery" />
              <small>Expedition</small>
              <strong>{new Set(dummyRates.map((rate) => rate.expedition)).size}</strong>
            </span>
          </div>
          <div className="vp-status-card">
            <div>
              <span className="vp-status-icon">
                <i className="ti ti-chart-bar" />
              </span>
              <span>
                <small>Rates tersedia</small>
                <strong>
                  {dummyRates.filter((rate) => Number(rate.rate) > 0).length} dari {dummyRates.length} rute aktif
                </strong>
              </span>
            </div>
            <button type="button" className="vp-inline-link" onClick={() => setActiveTab('rates')}>
              Lihat rates <i className="ti ti-arrow-right" />
            </button>
          </div>
          <div className="vp-shipment-card">
            <div className="vp-rates-title">
              <div>
                <h2>Pengiriman ongoing</h2>
                <p>Proses kirim yang sedang berjalan saat ini.</p>
              </div>
              <span className="vp-badge">{ongoingShipments.length} ACTIVE</span>
            </div>
            <div className="vp-shipment-list">
              {ongoingShipments.map((shipment) => (
                <article className="vp-shipment-item" key={shipment.id}>
                  <span className="vp-shipment-icon">
                    <i className="ti ti-truck-delivery" />
                  </span>
                  <div className="vp-shipment-main">
                    <div className="vp-shipment-title">
                      <strong>{shipment.id}</strong>
                      <span>{shipment.status}</span>
                    </div>
                    <div className="vp-shipment-route">
                      <span>{shipment.origin}</span>
                      <i className="ti ti-arrow-right" />
                      <span>{shipment.destination}</span>
                    </div>
                    <div className="vp-progress">
                      <span style={{ width: `${shipment.progress}%` }} />
                    </div>
                  </div>
                  <div className="vp-shipment-meta">
                    <small>Armada & pengemudi</small>
                    <strong>{shipment.vehicle}</strong>
                    <span>{shipment.driver}</span>
                  </div>
                  <div className="vp-shipment-meta vp-shipment-eta">
                    <small>Estimasi tiba</small>
                    <strong>{shipment.eta}</strong>
                    <span>{shipment.progress}% perjalanan</span>
                  </div>
                  <button
                    type="button"
                    className="vp-shipment-detail"
                    onClick={() => recordVendorPortalActivity('EXPEDITION_SHIPMENT_DETAIL', shipment.id)}
                    aria-label={`Lihat detail ${shipment.id}`}
                  >
                    <i className="ti ti-chevron-right" />
                  </button>
                </article>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="vp-rates-card">
          <div className="vp-rates-title">
            <div>
              <h2>Rates pengiriman</h2>
              <p>Data sementara untuk pengembangan Vendor Portal.</p>
            </div>
            <div className="vp-rates-tools">
              <span className="vp-badge">DUMMY DATA</span>
              <input ref={uploadInputRef} type="file" accept=".xlsx,.xls" onChange={handleRatesUpload} hidden />
              <button type="button" className="vp-upload-rates" onClick={() => uploadInputRef.current?.click()}>
                <i className="ti ti-file-upload" /> Upload Excel
              </button>
            </div>
          </div>
          {notice ? (
            <div className="vp-rate-notice">
              <i className="ti ti-info-circle" /> {notice}
            </div>
          ) : null}
          <div className="vp-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Origin</th>
                  <th>Destination</th>
                  <th>Expedition</th>
                  <th>Weight Range (Kg)</th>
                  <th>Service Type</th>
                  <th className="vp-text-end">Rate</th>
                  <th className="vp-text-end">Action</th>
                </tr>
              </thead>
              <tbody>
                {dummyRates.map((rate) => (
                  <tr key={rate.id} className={Number(rate.rate) === 0 ? 'vp-rate-unavailable-row' : ''}>
                    <td>
                      <strong className="vp-cell-title">{rate.warehouse_name}</strong>
                      <small className="vp-cell-detail">{rate.warehouse_code}</small>
                    </td>
                    <td>
                      <strong className="vp-cell-title">{rate.destination}</strong>
                      <small className="vp-cell-detail">{rate.destination_city}</small>
                    </td>
                    <td>{rate.expedition}</td>
                    <td>{formatWeightRange(rate)}</td>
                    <td>
                      <span className="vp-service-badge">{rate.service_type}</span>
                    </td>
                    <td className="vp-rate-value vp-text-end">
                      {Number(rate.rate) === 0 ? (
                        <span className="vp-unavailable">Not Available</span>
                      ) : (
                        `Rp ${formatNumber(rate.rate)}/${rate.service_type}`
                      )}
                    </td>
                    <td className="vp-text-end">
                      <button type="button" className="vp-rate-action" onClick={() => handleAction(rate)}>
                        <i className="ti ti-dots-vertical" /> Actions <i className="ti ti-chevron-down" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </VendorDashboardLayout>
  );
}
