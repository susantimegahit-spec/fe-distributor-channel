import { Navigate } from 'react-router-dom';
import Card from 'react-bootstrap/Card';
import Table from 'react-bootstrap/Table';
import { canUseMenuAction } from '../../../utils/actionPermissions';
import { getCookies } from '../../../utils/cookies';
import {
  canAccessMenuItem,
  getMenuItemByPathname,
  getSystemByPathname,
  isAdministratorRole,
  normalizeAccessibleSystems
} from '../../../systems';

const shippingSchedules = [
  {
    salesOrderNumber: 'SO-20260907-0012',
    loadingDate: '08 Sep 2026',
    postingDate: '07 Sep 2026',
    customer: 'PT Sumber Makmur Abadi',
    address: 'Jl. Raya Bekasi KM 22, Cakung, Jakarta Timur',
    item: 'Beras Premium 25 Kg',
    quantity: 2500,
    expedition: 'PT Lintas Nusantara',
    description: 'Loading pukul 08.00 WIB'
  },
  {
    salesOrderNumber: 'SO-20260907-0013',
    loadingDate: '08 Sep 2026',
    postingDate: '07 Sep 2026',
    customer: 'CV Maju Bersama',
    address: 'Jl. Industri No. 18, Tangerang, Banten',
    item: 'Gula Kristal Putih 50 Kg',
    quantity: 5000,
    expedition: 'CV Karya Logistik',
    description: 'Prioritas pengiriman pagi'
  },
  {
    salesOrderNumber: 'SO-20260907-0014',
    loadingDate: '09 Sep 2026',
    postingDate: '07 Sep 2026',
    customer: 'Toko Sejahtera',
    address: 'Jl. Ahmad Yani No. 45, Bandung, Jawa Barat',
    item: 'Minyak Goreng 2 L',
    quantity: 1800,
    expedition: 'PT Angkut Cepat',
    description: 'Hubungi penerima sebelum tiba'
  },
  {
    salesOrderNumber: 'SO-20260907-0015',
    loadingDate: '10 Sep 2026',
    postingDate: '07 Sep 2026',
    customer: 'PT Sentosa Retail Indonesia',
    address: 'Kawasan Pergudangan Margomulyo, Surabaya, Jawa Timur',
    item: 'Tepung Terigu 25 Kg',
    quantity: 3200,
    expedition: 'PT Trans Jawa Express',
    description: '-'
  }
];

const quantityFormatter = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 });

export default function ShippingSchedule() {
  const system = getSystemByPathname('/customer-portal/dashboard');
  const menu = getMenuItemByPathname(system, '/customer-portal/dashboard');
  const role = getCookies('role');
  const hasSystemAccess = isAdministratorRole(role) || normalizeAccessibleSystems(getCookies('system')).includes(system?.key);

  if (!hasSystemAccess || !canAccessMenuItem(menu, getCookies('menu') || [], role) || !canUseMenuAction(3, 'shipping-schedule')) {
    return <Navigate to="/access-denied" replace />;
  }

  return (
    <main className="min-vh-100 bg-body p-4" aria-labelledby="shipping-schedule-title">
      <Card>
        <Card.Header>
          <h4 id="shipping-schedule-title" className="mb-1">
            Shipping Schedule
          </h4>
          <span className="text-muted">Informasi jadwal pengiriman pesanan pelanggan.</span>
        </Card.Header>
        <Card.Body className="p-0">
          <Table responsive hover bordered className="align-middle mb-0 text-nowrap">
            <thead>
              <tr>
                <th>No.</th>
                <th>No. SO</th>
                <th>Loading Date</th>
                <th>Posting Date</th>
                <th>Customer</th>
                <th>Address</th>
                <th>Item</th>
                <th className="text-end">Qty (Kg)</th>
                <th>Ekspedisi</th>
                <th>Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {shippingSchedules.map((schedule, index) => (
                <tr key={schedule.salesOrderNumber}>
                  <td>{index + 1}</td>
                  <td className="fw-semibold">{schedule.salesOrderNumber}</td>
                  <td>{schedule.loadingDate}</td>
                  <td>{schedule.postingDate}</td>
                  <td>{schedule.customer}</td>
                  <td className="text-wrap" style={{ minWidth: 260 }}>
                    {schedule.address}
                  </td>
                  <td>{schedule.item}</td>
                  <td className="text-end fw-semibold">{quantityFormatter.format(schedule.quantity)}</td>
                  <td>{schedule.expedition}</td>
                  <td className="text-wrap" style={{ minWidth: 220 }}>
                    {schedule.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </main>
  );
}
