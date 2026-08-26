import { useEffect, useState } from 'react';
import Card from 'react-bootstrap/Card';
import Table from 'react-bootstrap/Table';

import MainCard from 'components/MainCard';
import { VENDOR_PORTAL_ACTIVITY_KEY } from 'utils/vendorPortal';

const getActivities = () => {
  try {
    return JSON.parse(localStorage.getItem(VENDOR_PORTAL_ACTIVITY_KEY) || '[]');
  } catch {
    return [];
  }
};

export default function VendorPortalMonitoring() {
  const [activities, setActivities] = useState(getActivities);

  useEffect(() => {
    const refresh = () => setActivities(getActivities());
    window.addEventListener('storage', refresh);
    window.addEventListener('vendor-portal:activity', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('vendor-portal:activity', refresh);
    };
  }, []);

  return (
    <MainCard title="Vendor Portal Monitoring" subheader="Pantau aktivitas onboarding vendor sebelum integrasi API tersedia.">
      {activities.length ? (
        <Table responsive hover className="mb-0 align-middle">
          <thead>
            <tr>
              <th>Waktu</th>
              <th>Aktivitas</th>
              <th>Keterangan</th>
              <th>Sumber</th>
            </tr>
          </thead>
          <tbody>
            {activities.map((item) => (
              <tr key={item.id}>
                <td>{new Date(item.createdAt).toLocaleString('id-ID')}</td>
                <td>{item.action}</td>
                <td>{item.detail}</td>
                <td>
                  <span className="badge bg-light-primary text-primary">Vendor Portal</span>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <Card className="border border-dashed mb-0">
          <Card.Body className="text-center py-5">
            <span className="avtar avtar-xl bg-light-primary text-primary mb-3">
              <i className="ti ti-building-store f-32" />
            </span>
            <h5>Belum ada aktivitas vendor</h5>
            <p className="text-muted mb-0">Aktivitas preview dari Vendor Portal akan tampil di sini.</p>
          </Card.Body>
        </Card>
      )}
    </MainCard>
  );
}
