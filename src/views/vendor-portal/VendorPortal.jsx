import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';

import SmestaLogo from 'assets/images/smesta_text_tagline_transparent.png';
import { clearVendorPortalSession, getVendorPortalSession, recordVendorPortalActivity, setVendorPortalSession } from 'utils/vendorPortal';
import DistributorDashboard from './distributor/DistributorDashboard';
import ExpeditionDashboard from './expedition/ExpeditionDashboard';
import './vendor-portal.scss';

const documentRequirements = [
  { key: 'akta', label: 'Akta Perusahaan', icon: 'ti-file-description' },
  { key: 'nib', label: 'NIB / Izin Usaha', icon: 'ti-building-bank' },
  { key: 'npwp', label: 'NPWP Perusahaan', icon: 'ti-receipt-tax' },
  { key: 'support', label: 'Dokumen Pendukung', icon: 'ti-files' }
];

function PortalBrand() {
  return (
    <aside className="vp-brand-panel">
      <img src={SmestaLogo} alt="SMESTA" className="vp-logo" />
      <div className="vp-brand-copy">
        <span className="vp-eyebrow">Vendor partnership</span>
        <h1>Grow the supply chain, together.</h1>
        <p>Satu pintu untuk onboarding mitra ekspedisi dan distributor SMESTA.</p>
      </div>
      <div className="vp-brand-points">
        <span>
          <i className="ti ti-shield-check" /> Legalitas terverifikasi
        </span>
        <span>
          <i className="ti ti-route" /> Proses mudah dipantau
        </span>
      </div>
    </aside>
  );
}

function AuthShell({ children, step }) {
  return (
    <main className="vp-page">
      <div className="vp-shell">
        <PortalBrand />
        <section className="vp-content-panel">
          <div className="vp-mobile-brand">
            <img src={SmestaLogo} alt="SMESTA" />
          </div>
          {step ? <span className="vp-step">{step}</span> : null}
          {children}
          <footer>© {new Date().getFullYear()} SMESTA · Vendor Portal</footer>
        </section>
      </div>
    </main>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [vendorType, setVendorType] = useState('expedition');

  const signIn = (event) => {
    event.preventDefault();
    setVendorPortalSession(vendorType);
    recordVendorPortalActivity('SIGN_IN_PREVIEW', `Vendor ${vendorType} membuka preview portal`);
    navigate(`/vendor-portal/dashboard/${vendorType}`);
  };

  return (
    <AuthShell>
      <div className="vp-form-heading">
        <span className="vp-kicker">Welcome back</span>
        <h2>Sign in as vendor</h2>
        <p>Masuk menggunakan akun vendor yang telah terdaftar.</p>
      </div>
      {message ? (
        <div className="vp-notice">
          <i className="ti ti-info-circle" /> {message}
        </div>
      ) : null}
      <form className="vp-form" onSubmit={signIn}>
        <label>
          Email vendor
          <span className="vp-input">
            <i className="ti ti-mail" />
            <input type="email" placeholder="nama@perusahaan.com" />
          </span>
        </label>
        <label>
          Password
          <span className="vp-input">
            <i className="ti ti-lock" />
            <input type={showPassword ? 'text' : 'password'} placeholder="Masukkan password" />
            <button type="button" aria-label="Tampilkan password" onClick={() => setShowPassword((value) => !value)}>
              <i className={`ti ${showPassword ? 'ti-eye' : 'ti-eye-off'}`} />
            </button>
          </span>
        </label>
        <div className="vp-form-tools">
          <label className="vp-check">
            <input type="checkbox" /> Ingat saya
          </label>
          <button type="button" className="vp-link" onClick={() => setMessage('Fitur reset password akan aktif setelah API tersedia.')}>
            Lupa password?
          </button>
        </div>
        <fieldset className="vp-type-fieldset vp-login-type">
          <legend>Preview dashboard sebagai</legend>
          <div className="vp-type-grid">
            <button type="button" className={vendorType === 'expedition' ? 'active' : ''} onClick={() => setVendorType('expedition')}>
              <i className="ti ti-truck-delivery" />
              <span>
                <strong>Ekspedisi</strong>
                <small>Dashboard rates</small>
              </span>
              <i className="ti ti-circle-check vp-selected" />
            </button>
            <button type="button" className={vendorType === 'distributor' ? 'active' : ''} onClick={() => setVendorType('distributor')}>
              <i className="ti ti-building-warehouse" />
              <span>
                <strong>Distributor</strong>
                <small>Dashboard distributor</small>
              </span>
              <i className="ti ti-circle-check vp-selected" />
            </button>
          </div>
        </fieldset>
        <button className="vp-primary" type="submit">
          Sign in as vendor <i className="ti ti-arrow-right" />
        </button>
      </form>
      <div className="vp-divider">
        <span>Belum menjadi vendor?</span>
      </div>
      <button className="vp-secondary" type="button" onClick={() => navigate('/vendor-portal/register')}>
        Registrasi sebagai vendor
      </button>
    </AuthShell>
  );
}

function RegisterPage() {
  const navigate = useNavigate();
  const [vendorType, setVendorType] = useState('expedition');
  const [files, setFiles] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const setFile = (key, file) => setFiles((current) => ({ ...current, [key]: file?.name || '' }));
  const submit = (event) => {
    event.preventDefault();
    recordVendorPortalActivity('REGISTRATION_PREVIEW', vendorType === 'expedition' ? 'Ekspedisi' : 'Distributor');
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (submitted) {
    return (
      <AuthShell step="Registrasi selesai">
        <div className="vp-success">
          <span>
            <i className="ti ti-rosette-discount-check" />
          </span>
          <h2>Pengajuan siap dikirim</h2>
          <p>Alur registrasi sudah berhasil disimulasikan. Data belum disimpan karena service API belum tersedia.</p>
          <button className="vp-primary" type="button" onClick={() => navigate('/vendor-portal')}>
            Kembali ke halaman login
          </button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell step="Registrasi vendor">
      <div className="vp-form-heading vp-register-heading">
        <span className="vp-kicker">Join our network</span>
        <h2>Daftarkan perusahaan Anda</h2>
        <p>Lengkapi profil singkat dan dokumen legalitas perusahaan.</p>
      </div>
      <form className="vp-form" onSubmit={submit}>
        <fieldset className="vp-type-fieldset">
          <legend>Tipe vendor</legend>
          <div className="vp-type-grid">
            <button type="button" className={vendorType === 'expedition' ? 'active' : ''} onClick={() => setVendorType('expedition')}>
              <i className="ti ti-truck-delivery" />
              <span>
                <strong>Ekspedisi</strong>
                <small>Mitra pengiriman dan logistik</small>
              </span>
              <i className="ti ti-circle-check vp-selected" />
            </button>
            <button type="button" className={vendorType === 'distributor' ? 'active' : ''} onClick={() => setVendorType('distributor')}>
              <i className="ti ti-building-warehouse" />
              <span>
                <strong>Distributor</strong>
                <small>Mitra distribusi produk</small>
              </span>
              <i className="ti ti-circle-check vp-selected" />
            </button>
          </div>
        </fieldset>
        <div className="vp-two-columns">
          <label>
            Nama perusahaan
            <input type="text" placeholder="PT Nama Perusahaan" />
          </label>
          <label>
            Email perusahaan
            <input type="email" placeholder="vendor@perusahaan.com" />
          </label>
          <label>
            Nama PIC
            <input type="text" placeholder="Nama penanggung jawab" />
          </label>
          <label>
            Nomor telepon
            <input type="tel" placeholder="08xx xxxx xxxx" />
          </label>
        </div>
        <div className="vp-document-section">
          <div>
            <h3>Dokumen legalitas</h3>
            <p>Format PDF, JPG, atau PNG. Maksimal 10 MB per file.</p>
          </div>
          <div className="vp-upload-grid">
            {documentRequirements.map((document) => (
              <label className={files[document.key] ? 'vp-upload has-file' : 'vp-upload'} key={document.key}>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(event) => setFile(document.key, event.target.files?.[0])} />
                <i className={`ti ${files[document.key] ? 'ti-circle-check' : document.icon}`} />
                <span>
                  <strong>{files[document.key] || document.label}</strong>
                  <small>{files[document.key] ? 'File siap diunggah' : 'Klik untuk pilih file'}</small>
                </span>
              </label>
            ))}
          </div>
        </div>
        <label className="vp-check vp-terms">
          <input type="checkbox" /> Saya menyetujui syarat dan kebijakan kemitraan vendor.
        </label>
        <button className="vp-primary" type="submit">
          Kirim registrasi <i className="ti ti-send" />
        </button>
        <button className="vp-link vp-back" type="button" onClick={() => navigate('/vendor-portal')}>
          <i className="ti ti-arrow-left" /> Sudah punya akun? Masuk
        </button>
      </form>
    </AuthShell>
  );
}

export default function VendorPortal() {
  const { page, vendorType } = useParams();
  const session = getVendorPortalSession();

  if (page === 'register') return <RegisterPage />;
  if (vendorType) {
    if (!session) return <Navigate to="/vendor-portal" replace />;
    if (vendorType !== session.vendorType) return <Navigate to={`/vendor-portal/dashboard/${session.vendorType}`} replace />;
    if (vendorType === 'expedition') return <ExpeditionDashboard />;
    if (vendorType === 'distributor') return <DistributorDashboard />;
    return <Navigate to={`/vendor-portal/dashboard/${session.vendorType}`} replace />;
  }
  if (page === 'dashboard' && session) return <Navigate to={`/vendor-portal/dashboard/${session.vendorType}`} replace />;
  if (page) return <Navigate to="/vendor-portal" replace />;
  return session ? <Navigate to={`/vendor-portal/dashboard/${session.vendorType}`} replace /> : <LoginPage />;
}
