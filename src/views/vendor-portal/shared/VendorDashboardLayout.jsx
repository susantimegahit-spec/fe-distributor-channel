import PropTypes from 'prop-types';
import { useEffect, useRef, useState } from 'react';
import { Button, Form, InputGroup, Modal } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

import SmestaLogo from 'assets/images/smesta_text_tagline_transparent.png';
import VendorServices from 'services/vendor-portal/VendorServices';
import { useAlert } from 'utils/alertContext';
import { clearVendorPortalSession, getVendorPortalSession, recordVendorPortalActivity } from 'utils/vendorPortal';

const emptyPasswordForm = {
  current_password: '',
  new_password: '',
  new_password_confirmation: ''
};
const hiddenPasswords = { current: false, new: false, confirmation: false };

const getSessionValue = (sources, keys, fallback = '') => {
  for (const source of sources) {
    for (const key of keys) {
      const value = source?.[key];
      if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
    }
  }
  return fallback;
};

const formatVendorType = (value) => {
  const type = String(value || '').toLowerCase();
  if (type === 'expedition') return 'Expedition Vendor Portal';
  if (type === 'distributor') return 'Distributor Vendor Portal';
  return '';
};

export default function VendorDashboardLayout({ children, portalName }) {
  const navigate = useNavigate();
  const { showAlert } = useAlert();
  const session = getVendorPortalSession() || {};
  const sessionSources = [session.vendor, session.user, session.profile, session.registration, session];
  const accountName = getSessionValue(
    sessionSources,
    ['company_name', 'companyName', 'vendor_name', 'vendorName', 'name', 'pic_name', 'picName'],
    'Vendor Account'
  );
  const accountDetail = getSessionValue(
    sessionSources,
    ['company_email', 'companyEmail', 'email', 'sap_vendor_code', 'sapVendorCode', 'vendor_code', 'vendorCode'],
    formatVendorType(session.vendorType) || portalName
  );
  const activePortalName = formatVendorType(session.vendorType) || portalName;
  const profileRef = useRef(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState(emptyPasswordForm);
  const [visiblePasswords, setVisiblePasswords] = useState(hiddenPasswords);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    const closeProfile = (event) => {
      if (!profileRef.current?.contains(event.target)) setProfileOpen(false);
    };

    document.addEventListener('mousedown', closeProfile);
    return () => document.removeEventListener('mousedown', closeProfile);
  }, []);

  const logout = () => {
    recordVendorPortalActivity('SIGN_OUT', `${accountName} signed out of ${activePortalName}`);
    clearVendorPortalSession();
    navigate('/vendor-portal');
  };

  const openAccount = () => {
    setProfileOpen(false);
    navigate('/vendor-portal/account');
  };

  const openChangePassword = () => {
    setProfileOpen(false);
    setPasswordForm(emptyPasswordForm);
    setVisiblePasswords(hiddenPasswords);
    setShowChangePassword(true);
    recordVendorPortalActivity('VENDOR_CHANGE_PASSWORD_ACTION', `${accountName} opened Change Password`);
  };

  const closeChangePassword = () => {
    if (changingPassword) return;
    setShowChangePassword(false);
    setPasswordForm(emptyPasswordForm);
    setVisiblePasswords(hiddenPasswords);
  };

  const togglePasswordVisibility = (field) => {
    setVisiblePasswords((current) => ({ ...current, [field]: !current[field] }));
  };

  const changePassword = async (event) => {
    event.preventDefault();
    if (changingPassword) return;
    if (passwordForm.new_password !== passwordForm.new_password_confirmation) {
      showAlert('New password and confirmation do not match.', 'danger');
      return;
    }

    setChangingPassword(true);
    try {
      const response = await VendorServices.postChangePassword(passwordForm);
      if (!(response?.status >= 200 && response.status < 300) || response?.data?.success === false) {
        throw Object.assign(new Error('Unable to change password.'), { response });
      }
      setShowChangePassword(false);
      setPasswordForm(emptyPasswordForm);
      setVisiblePasswords(hiddenPasswords);
      showAlert(response.data?.message || 'Password changed successfully.', 'success');
    } catch (error) {
      const data = error.response?.data;
      const validationErrors = Object.values(data?.errors || {})
        .flat()
        .filter((message) => typeof message === 'string');
      showAlert(validationErrors.join(' ') || data?.message || error.message || 'Unable to change password.', 'danger');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <main className="vp-dashboard">
      <header>
        <img src={SmestaLogo} alt="SMESTA" />
        <span>Vendor Portal</span>
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
              <strong title={accountName}>{accountName}</strong>
              <small title={accountDetail}>{accountDetail}</small>
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
                  <strong title={accountName}>{accountName}</strong>
                  <small title={accountDetail}>{accountDetail}</small>
                </span>
              </div>
              <button type="button" onClick={openAccount}>
                <i className="ti ti-user-circle" />
                <span>
                  <strong>Account</strong>
                  <small>View your account details</small>
                </span>
              </button>
              <button type="button" onClick={openChangePassword}>
                <i className="ti ti-lock" />
                <span>
                  <strong>Change Password</strong>
                  <small>Update your account password</small>
                </span>
              </button>
              <button type="button" className="vp-profile-logout" onClick={logout}>
                <i className="ti ti-logout" />
                <span>
                  <strong>Logout</strong>
                  <small>Sign out of Vendor Portal</small>
                </span>
              </button>
            </div>
          ) : null}
        </div>
      </header>
      <section className="vp-dashboard-content">{children}</section>

      <Modal show={showChangePassword} onHide={closeChangePassword} centered className="vp-change-password-modal">
        <Form onSubmit={changePassword}>
          <Modal.Header closeButton={!changingPassword}>
            <Modal.Title>Change Password</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p className="text-muted mb-3">Enter your current password and choose a new password.</p>
            <div className="d-grid gap-3">
              <Form.Group controlId="vendor-current-password">
                <Form.Label className="f-12 text-muted">Current password</Form.Label>
                <InputGroup>
                  <Form.Control
                    type={visiblePasswords.current ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={passwordForm.current_password}
                    onChange={(event) => setPasswordForm((current) => ({ ...current, current_password: event.target.value }))}
                    disabled={changingPassword}
                    required
                  />
                  <Button
                    type="button"
                    variant="outline-secondary"
                    aria-label={visiblePasswords.current ? 'Hide current password' : 'Show current password'}
                    onClick={() => togglePasswordVisibility('current')}
                    disabled={changingPassword}
                  >
                    <i className={`ti ${visiblePasswords.current ? 'ti-eye-off' : 'ti-eye'}`} />
                  </Button>
                </InputGroup>
              </Form.Group>
              <Form.Group controlId="vendor-new-password">
                <Form.Label className="f-12 text-muted">New password</Form.Label>
                <InputGroup>
                  <Form.Control
                    type={visiblePasswords.new ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={passwordForm.new_password}
                    onChange={(event) => setPasswordForm((current) => ({ ...current, new_password: event.target.value }))}
                    disabled={changingPassword}
                    required
                  />
                  <Button
                    type="button"
                    variant="outline-secondary"
                    aria-label={visiblePasswords.new ? 'Hide new password' : 'Show new password'}
                    onClick={() => togglePasswordVisibility('new')}
                    disabled={changingPassword}
                  >
                    <i className={`ti ${visiblePasswords.new ? 'ti-eye-off' : 'ti-eye'}`} />
                  </Button>
                </InputGroup>
              </Form.Group>
              <Form.Group controlId="vendor-new-password-confirmation">
                <Form.Label className="f-12 text-muted">Confirm new password</Form.Label>
                <InputGroup hasValidation>
                  <Form.Control
                    type={visiblePasswords.confirmation ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={passwordForm.new_password_confirmation}
                    onChange={(event) => setPasswordForm((current) => ({ ...current, new_password_confirmation: event.target.value }))}
                    disabled={changingPassword}
                    isInvalid={Boolean(
                      passwordForm.new_password_confirmation && passwordForm.new_password !== passwordForm.new_password_confirmation
                    )}
                    required
                  />
                  <Button
                    type="button"
                    variant="outline-secondary"
                    aria-label={visiblePasswords.confirmation ? 'Hide password confirmation' : 'Show password confirmation'}
                    onClick={() => togglePasswordVisibility('confirmation')}
                    disabled={changingPassword}
                  >
                    <i className={`ti ${visiblePasswords.confirmation ? 'ti-eye-off' : 'ti-eye'}`} />
                  </Button>
                  <Form.Control.Feedback type="invalid">Passwords do not match.</Form.Control.Feedback>
                </InputGroup>
              </Form.Group>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button type="button" variant="light-secondary" onClick={closeChangePassword} disabled={changingPassword}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={
                changingPassword ||
                !passwordForm.current_password ||
                !passwordForm.new_password ||
                passwordForm.new_password !== passwordForm.new_password_confirmation
              }
            >
              {changingPassword ? <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" /> : null}
              {changingPassword ? 'Saving...' : 'Change Password'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </main>
  );
}

VendorDashboardLayout.propTypes = {
  children: PropTypes.node.isRequired,
  portalName: PropTypes.string.isRequired
};
