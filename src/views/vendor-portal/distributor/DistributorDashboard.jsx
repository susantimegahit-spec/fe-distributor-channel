import VendorDashboardLayout from '../shared/VendorDashboardLayout';
import { recordVendorPortalActivity } from 'utils/vendorPortal';

const actions = [
  ['ti-building-store', 'Profil perusahaan', 'Lengkapi informasi dan kontak perusahaan'],
  ['ti-file-certificate', 'Dokumen legalitas', 'Kelola dokumen persyaratan distributor'],
  ['ti-progress-check', 'Status pengajuan', 'Pantau proses verifikasi distributor']
];

export default function DistributorDashboard() {
  return (
    <VendorDashboardLayout portalName="Distributor Vendor Portal">
      <div className="vp-welcome">
        <span className="vp-kicker">Distributor workspace</span>
        <h1>Dashboard Distributor</h1>
        <p>Kelola profil, legalitas, dan proses onboarding distributor dari halaman ini.</p>
      </div>
      <div className="vp-status-card">
        <div>
          <span className="vp-status-icon">
            <i className="ti ti-clock-hour-4" />
          </span>
          <span>
            <small>Status akun</small>
            <strong>Menunggu integrasi</strong>
          </span>
        </div>
        <span className="vp-badge">PREVIEW</span>
      </div>
      <div className="vp-action-grid">
        {actions.map(([icon, title, description]) => (
          <button type="button" key={title} onClick={() => recordVendorPortalActivity('DISTRIBUTOR_ACTION', title)}>
            <i className={`ti ${icon}`} />
            <span>
              <strong>{title}</strong>
              <small>{description}</small>
            </span>
            <i className="ti ti-chevron-right" />
          </button>
        ))}
      </div>
    </VendorDashboardLayout>
  );
}
