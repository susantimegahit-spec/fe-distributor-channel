import PropTypes from 'prop-types';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import SmestaLogo from 'assets/images/smesta_text_tagline_transparent.png';
import { clearVendorPortalSession, recordVendorPortalActivity } from 'utils/vendorPortal';

export default function VendorDashboardLayout({ children, portalName }) {
  const navigate = useNavigate();
  const profileRef = useRef(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingNotice, setSettingNotice] = useState(false);

  useEffect(() => {
    const closeProfile = (event) => {
      if (!profileRef.current?.contains(event.target)) setProfileOpen(false);
    };

    document.addEventListener('mousedown', closeProfile);
    return () => document.removeEventListener('mousedown', closeProfile);
  }, []);

  const logout = () => {
    recordVendorPortalActivity('SIGN_OUT_PREVIEW', `${portalName} keluar dari preview portal`);
    clearVendorPortalSession();
    navigate('/vendor-portal');
  };

  const openSettings = () => {
    setProfileOpen(false);
    setSettingNotice(true);
    recordVendorPortalActivity('VENDOR_SETTINGS_ACTION', `${portalName} membuka settings`);
  };

  return (
    <main className="vp-dashboard">
      <header>
        <img src={SmestaLogo} alt="SMESTA" />
        <span>{portalName}</span>
        <div className="vp-profile" ref={profileRef}>
          <button
            className="vp-profile-trigger"
            type="button"
            onClick={() => setProfileOpen((current) => !current)}
            aria-expanded={profileOpen}
          >
            <span className="vp-profile-avatar">
              <i className="ti ti-user" />
            </span>
            <span className="vp-profile-copy">
              <strong>Vendor Account</strong>
              <small>Preview vendor</small>
            </span>
            <i className="ti ti-chevron-down" />
          </button>
          {profileOpen ? (
            <div className="vp-profile-menu">
              <div className="vp-profile-menu-head">
                <span className="vp-profile-avatar">
                  <i className="ti ti-user" />
                </span>
                <span>
                  <strong>Vendor Account</strong>
                  <small>{portalName}</small>
                </span>
              </div>
              <button type="button" onClick={openSettings}>
                <i className="ti ti-settings" />
                <span>
                  <strong>Settings</strong>
                  <small>Atur profil dan preferensi</small>
                </span>
              </button>
              <button type="button" className="vp-profile-logout" onClick={logout}>
                <i className="ti ti-logout" />
                <span>
                  <strong>Logout</strong>
                  <small>Keluar dari Vendor Portal</small>
                </span>
              </button>
            </div>
          ) : null}
        </div>
      </header>
      <section className="vp-dashboard-content">
        {settingNotice ? (
          <div className="vp-setting-notice">
            <i className="ti ti-info-circle" /> Halaman Settings siap dihubungkan pada pengembangan berikutnya.
            <button type="button" onClick={() => setSettingNotice(false)}>
              <i className="ti ti-x" />
            </button>
          </div>
        ) : null}
        {children}
      </section>
    </main>
  );
}

VendorDashboardLayout.propTypes = {
  children: PropTypes.node.isRequired,
  portalName: PropTypes.string.isRequired
};
