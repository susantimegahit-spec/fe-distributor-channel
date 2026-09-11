import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import Modal from 'react-bootstrap/Modal';

import { getVendorDocuments } from 'config/vendorDocuments';
import VendorServices from 'services/vendor-portal/VendorServices';
import { useAlert } from 'utils/alertContext';
import SmestaLogo from 'assets/images/smesta_text_tagline_transparent.png';
import { clearVendorPortalSession, getVendorPortalSession, recordVendorPortalActivity, setVendorPortalSession } from 'utils/vendorPortal';
import DistributorDashboard from './distributor/DistributorDashboard';
import ExpeditionDashboard from './expedition/ExpeditionDashboard';
import VendorAccount from './account/VendorAccount';
import './vendor-portal.scss';

function PortalBrand() {
  return (
    <aside className="vp-brand-panel">
      <img src={SmestaLogo} alt="SMESTA" className="vp-logo" />
      <div className="vp-brand-copy">
        <span className="vp-eyebrow">Vendor partnership</span>
        <h1>Grow the supply chain, together.</h1>
        <p>A single portal for onboarding SMESTA logistics and distribution partners.</p>
      </div>
      <div className="vp-brand-points">
        <span>
          <i className="ti ti-shield-check" /> Verified legal documents
        </span>
        <span>
          <i className="ti ti-route" /> Easy progress tracking
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
  const { showAlert } = useAlert();
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const signIn = async (event) => {
    event.preventDefault();
    if (isSigningIn) return;

    setMessage('');
    setIsSigningIn(true);
    try {
      const response = await VendorServices.postLoginVendor({ email: email.trim(), password });
      if (!(response?.status >= 200 && response.status < 300) || response?.data?.success === false) {
        throw Object.assign(new Error('Vendor login failed.'), { response });
      }

      const session = setVendorPortalSession(response.data, remember);
      if (!session.token || !['expedition', 'distributor'].includes(session.vendorType)) {
        clearVendorPortalSession();
        throw new Error('The vendor login response is incomplete.');
      }

      recordVendorPortalActivity('SIGN_IN', `${session.vendorType} vendor signed in to the portal`);
      navigate(`/vendor-portal/dashboard/${session.vendorType}`);
    } catch (error) {
      const data = error.response?.data;
      const validationErrors = Object.values(data?.errors || {})
        .flat()
        .filter((errorMessage) => typeof errorMessage === 'string');
      showAlert(validationErrors.join(' ') || data?.message || error.message || 'Vendor login failed. Please try again.', 'danger');
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <AuthShell>
      <div className="vp-form-heading">
        <span className="vp-kicker">Welcome back</span>
        <h2>Sign in as vendor</h2>
        <p>Sign in using your registered vendor account.</p>
      </div>
      {message ? (
        <div className="vp-notice">
          <i className="ti ti-info-circle" /> {message}
        </div>
      ) : null}
      <form className="vp-form" onSubmit={signIn}>
        <label>
          Vendor email
          <span className="vp-input">
            <i className="ti ti-mail" />
            <input
              type="email"
              name="email"
              value={email}
              placeholder="name@company.com"
              autoComplete="email"
              disabled={isSigningIn}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </span>
        </label>
        <label>
          Password
          <span className="vp-input">
            <i className="ti ti-lock" />
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={password}
              placeholder="Enter your password"
              autoComplete="current-password"
              disabled={isSigningIn}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <button type="button" aria-label="Show password" onClick={() => setShowPassword((value) => !value)}>
              <i className={`ti ${showPassword ? 'ti-eye' : 'ti-eye-off'}`} />
            </button>
          </span>
        </label>
        <div className="vp-form-tools">
          <label className="vp-check">
            <input type="checkbox" checked={remember} disabled={isSigningIn} onChange={(event) => setRemember(event.target.checked)} />{' '}
            Remember me
          </label>
          <button type="button" className="vp-link" onClick={() => setMessage('Password reset will be available once the API is ready.')}>
            Forgot password?
          </button>
        </div>
        <button className="vp-primary" type="submit" disabled={isSigningIn} aria-busy={isSigningIn}>
          {isSigningIn ? <span className="spinner-border spinner-border-sm" aria-hidden="true" /> : null}
          <span>{isSigningIn ? 'Signing in...' : 'Sign in as vendor'}</span>
          {!isSigningIn ? <i className="ti ti-arrow-right" /> : null}
        </button>
      </form>
      <div className="vp-divider">
        <span>Not a vendor yet?</span>
      </div>
      <button className="vp-secondary" type="button" onClick={() => navigate('/vendor-portal/register')}>
        Register as a vendor
      </button>
    </AuthShell>
  );
}

function RegistrationModal({ children, footer, submitting = false, completed = false }) {
  const navigate = useNavigate();
  return (
    <Modal
      show
      centered
      scrollable
      size="lg"
      className="vp-registration-modal"
      aria-labelledby="vp-registration-title"
      backdrop="static"
      keyboard={!submitting}
      onHide={() => {
        if (!submitting) navigate('/vendor-portal');
      }}
    >
      <Modal.Header closeButton={!submitting}>
        <Modal.Title id="vp-registration-title">{completed ? 'Registration complete' : 'Vendor registration'}</Modal.Title>
      </Modal.Header>
      <Modal.Body>{children}</Modal.Body>
      {footer ? <Modal.Footer className="vp-registration-footer">{footer}</Modal.Footer> : null}
    </Modal>
  );
}

function RegisterPage() {
  const navigate = useNavigate();
  const { showAlert } = useAlert();
  const vendorType = 'expedition';
  const [activeTab, setActiveTab] = useState('profile');
  const [validationMessage, setValidationMessage] = useState('');
  const [downloadingTemplate, setDownloadingTemplate] = useState(null);
  const registrationFormRef = useRef(null);
  const [files, setFiles] = useState({});
  const documentRequirements = getVendorDocuments(vendorType);
  const [submitted, setSubmitted] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [companyEmail, setCompanyEmail] = useState('');
  const [emailCheck, setEmailCheck] = useState('idle');
  const [emailCheckMessage, setEmailCheckMessage] = useState('');
  const [emailCheckAttempt, setEmailCheckAttempt] = useState(0);
  const emailInputRef = useRef(null);
  const emailVersionRef = useRef(0);

  useEffect(() => {
    const email = companyEmail.trim();
    if (!email || !emailInputRef.current?.validity.valid || submitted) return;
    let active = true;
    const version = emailVersionRef.current;
    const timer = setTimeout(async () => {
      try {
        const response = await VendorServices.getCheckEmail(email);
        if (!active || version !== emailVersionRef.current) return;
        if (!(response?.status >= 200 && response.status < 300) || response?.data?.success === false) {
          throw Object.assign(new Error('Unable to check email. Please try again.'), { response });
        }
        const available = response.data?.data?.available ?? response.data?.available;
        if (typeof available !== 'boolean') {
          throw Object.assign(new Error('Unable to check email. Please try again.'), { response });
        }
        setEmailCheck(available ? 'available' : 'exists');
        setEmailCheckMessage(
          response.data?.message ||
            response.data?.data?.message ||
            (available ? 'Email is available.' : 'This email is already registered.')
        );
      } catch (error) {
        if (!active || version !== emailVersionRef.current) return;
        setEmailCheck('error');
        const data = error.response?.data;
        const validationMessages = Object.values(data?.errors || {})
          .flat()
          .filter((message) => typeof message === 'string');
        setEmailCheckMessage(
          data?.message || data?.data?.message || validationMessages.join(' ') || 'Unable to check email. Please try again.'
        );
      }
    }, 500);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [companyEmail, emailCheckAttempt, submitted]);

  const setFile = (key, input) => {
    const file = input.files?.[0];
    const validFile = !file || (/\.(pdf|jpe?g|png)$/i.test(file.name) && file.size <= 10 * 1024 * 1024);
    input.setCustomValidity(validFile ? '' : 'Select a PDF, JPG, or PNG file up to 10 MB.');
    input.reportValidity();
    setFiles((current) => ({ ...current, [key]: file || null }));
  };

  const downloadTemplate = async (requirement) => {
    if (downloadingTemplate) return;
    setDownloadingTemplate(requirement.key);
    try {
      const response = await VendorServices.getDocumentTemplate(requirement.template);
      if (!(response?.status >= 200 && response.status < 300) || !(response.data instanceof Blob) || !response.data.size) {
        throw Object.assign(new Error('Unable to download template.'), { response });
      }
      const disposition = response.headers?.['content-disposition'] || '';
      const encodedName = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
      const plainName = disposition.match(/filename="([^"\r\n]+)"|filename=([^;\r\n]+)/i);
      let filename = plainName?.[1] || plainName?.[2]?.trim();
      if (encodedName) {
        try {
          filename = decodeURIComponent(encodedName);
        } catch {
          /* Use the plain filename when encoding is invalid. */
        }
      }
      const extension =
        {
          'application/pdf': '.pdf',
          'application/msword': '.doc',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx'
        }[response.data.type.split(';')[0]] || '';
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = (filename || `${requirement.template}${extension}`).split(/[\\/]/).pop();
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) {
      let data = error.response?.data;
      if (data instanceof Blob) {
        try {
          data = JSON.parse(await data.text());
        } catch {
          data = null;
        }
      }
      showAlert(data?.message || error.message || 'Unable to download template. Please try again.', 'danger');
    } finally {
      setDownloadingTemplate(null);
    }
  };

  const validateProfile = () => {
    const invalidInput = registrationFormRef.current?.querySelector('#vp-registration-profile :invalid');
    if (invalidInput) {
      const label = invalidInput.closest('label')?.firstChild?.textContent?.trim() || invalidInput.name;
      setValidationMessage(`${label}: ${invalidInput.validationMessage}`);
      setActiveTab('profile');
      requestAnimationFrame(() => invalidInput.reportValidity());
      return false;
    }
    if (emailCheck !== 'available') {
      setActiveTab('profile');
      requestAnimationFrame(() => emailInputRef.current?.focus());
      setValidationMessage(emailCheckMessage || 'Please wait for the company email availability check.');
      return false;
    }
    return true;
  };

  const changeTab = (tab) => {
    if (isSubmitting || (tab === 'documents' && !validateProfile())) return false;
    setActiveTab(tab);
    return true;
  };

  const handleTabKeyDown = (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const tab = event.key === 'Home' ? 'profile' : event.key === 'End' ? 'documents' : activeTab === 'profile' ? 'documents' : 'profile';
    if (changeTab(tab)) registrationFormRef.current?.querySelector(`#vp-tab-${tab}`)?.focus();
  };

  const submit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    setValidationMessage('');
    if (!validateProfile()) return;
    if (activeTab === 'profile') {
      setActiveTab('documents');
      requestAnimationFrame(() => registrationFormRef.current?.querySelector('#vp-tab-documents')?.focus());
      return;
    }
    const invalidInput = event.currentTarget.querySelector(':invalid');
    if (invalidInput) {
      const requirement = documentRequirements.find(({ key }) => key === invalidInput.name);
      const label = requirement?.label || (invalidInput.name === 'terms_agreed' ? 'Vendor partnership terms' : invalidInput.name);
      setValidationMessage(`${label}: ${invalidInput.validationMessage}`);
      invalidInput.scrollIntoView({ block: 'center', behavior: 'smooth' });
      invalidInput.reportValidity();
      return;
    }
    const values = new FormData(event.currentTarget);
    setIsSubmitting(true);
    try {
      const response = await VendorServices.postRegisterVendor({
        vendor_type: vendorType,
        company_name: values.get('company_name').trim(),
        company_email: values.get('company_email').trim(),
        company_npwp: values.get('company_npwp').trim(),
        address: values.get('address').trim(),
        pic_name: values.get('pic_name').trim(),
        pic_phone: values.get('pic_phone').trim(),
        terms_agreed: values.get('terms_agreed') === 'on',
        ...Object.fromEntries(documentRequirements.map(({ key }) => [key, files[key]]))
      });
      if (!(response?.status >= 200 && response.status < 300) || response?.data?.success === false) {
        throw Object.assign(new Error('Registration failed. Please try again.'), { response });
      }
      setSubmitted(true);
      registrationFormRef.current?.closest('.modal-body')?.scrollTo({ top: 0 });
    } catch (requestError) {
      const data = requestError.response?.data;
      const validationErrors = Object.values(data?.errors || {})
        .flat()
        .filter((message) => typeof message === 'string');
      showAlert(validationErrors.join(' ') || data?.message || 'Registration failed. Please try again.', 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <RegistrationModal completed>
        <div className="vp-success">
          <span>
            <i className="ti ti-rosette-discount-check" />
          </span>
          <h2>Registration submitted successfully</h2>
          <p>Your company details and documents have been submitted for verification.</p>
          <button className="vp-primary" type="button" onClick={() => navigate('/vendor-portal')}>
            Back to sign in
          </button>
        </div>
      </RegistrationModal>
    );
  }

  return (
    <RegistrationModal
      submitting={isSubmitting}
      footer={
        <>
          {validationMessage ? (
            <div className="vp-registration-error" role="alert">
              {validationMessage}
            </div>
          ) : null}
          <div className="vp-registration-actions">
            {activeTab === 'documents' ? (
              <button className="vp-secondary" type="button" disabled={isSubmitting} onClick={() => changeTab('profile')}>
                <i className="ti ti-arrow-left" aria-hidden="true" /> Back
              </button>
            ) : null}
            <button className="vp-primary" type="submit" form="vp-registration-form" disabled={isSubmitting} aria-busy={isSubmitting}>
              {isSubmitting ? <span className="spinner-border spinner-border-sm" aria-hidden="true" /> : null}
              <span aria-live="polite">
                {isSubmitting ? 'Submitting registration...' : activeTab === 'profile' ? 'Next: Legal documents' : 'Submit registration'}
              </span>
              {!isSubmitting ? <i className={`ti ${activeTab === 'profile' ? 'ti-arrow-right' : 'ti-send'}`} aria-hidden="true" /> : null}
            </button>
          </div>
          <button className="vp-link vp-back" type="button" disabled={isSubmitting} onClick={() => navigate('/vendor-portal')}>
            <i className="ti ti-arrow-left" /> Already have an account? Sign in
          </button>
        </>
      }
    >
      <div className="vp-form-heading vp-register-heading">
        <span className="vp-kicker">Join our network</span>
        <h2>Register your company</h2>
        <p>Complete your company profile and upload your legal documents.</p>
      </div>
      <form id="vp-registration-form" ref={registrationFormRef} className="vp-form" onSubmit={submit} aria-busy={isSubmitting} noValidate>
        <div className="vp-registration-tabs" role="tablist" aria-label="Registration steps">
          {[
            { key: 'profile', label: 'Company profile' },
            { key: 'documents', label: 'Legal documents' }
          ].map((tab, index) => (
            <button
              key={tab.key}
              id={`vp-tab-${tab.key}`}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              aria-controls={`vp-registration-${tab.key}`}
              tabIndex={activeTab === tab.key ? 0 : -1}
              disabled={isSubmitting}
              onClick={() => changeTab(tab.key)}
              onKeyDown={handleTabKeyDown}
            >
              <span>{index + 1}</span> {tab.label}
            </button>
          ))}
        </div>
        <div
          id="vp-registration-profile"
          className="vp-registration-panel"
          role="tabpanel"
          aria-labelledby="vp-tab-profile"
          hidden={activeTab !== 'profile'}
        >
          <fieldset className="vp-type-fieldset" disabled={isSubmitting}>
            <legend>Vendor type</legend>
            <div className="vp-type-grid">
              <button type="button" className="active" aria-pressed="true">
                <i className="ti ti-truck-delivery" />
                <span>
                  <strong>Expedition</strong>
                  <small>Shipping and logistics partner</small>
                </span>
                <i className="ti ti-circle-check vp-selected" />
              </button>
            </div>
          </fieldset>
          <div className="vp-two-columns">
            <label className="vp-full-row">
              Company name
              <input type="text" name="company_name" placeholder="PT Company Name" required disabled={isSubmitting} pattern={'.*\\S.*'} />
            </label>
            <label className="vp-full-row">
              Company email
              <span className="vp-email-input">
                <input
                  ref={emailInputRef}
                  type="email"
                  name="company_email"
                  placeholder="vendor@company.com"
                  required
                  disabled={isSubmitting}
                  value={companyEmail}
                  aria-describedby="vp-email-status"
                  aria-invalid={emailCheck === 'exists'}
                  onChange={(event) => {
                    emailVersionRef.current += 1;
                    setCompanyEmail(event.target.value);
                    setEmailCheckMessage('');
                    setEmailCheck(event.target.value.trim() && event.target.validity.valid ? 'checking' : 'idle');
                  }}
                />
                {emailCheck === 'available' || emailCheck === 'exists' ? (
                  <i
                    className={`ti ${emailCheck === 'available' ? 'ti-circle-check is-available' : 'ti-circle-x is-unavailable'} vp-email-icon`}
                    aria-hidden="true"
                  />
                ) : null}
              </span>
              <span className={`vp-email-feedback${emailCheck === 'error' || emailCheck === 'exists' ? ' has-error' : ''}`}>
                <small id="vp-email-status" role="status" aria-live="polite">
                  {emailCheck === 'checking' ? (
                    <>
                      <span className="spinner-border spinner-border-sm" aria-hidden="true" /> Checking email...
                    </>
                  ) : null}
                  {emailCheck === 'available' ? emailCheckMessage : null}
                  {emailCheck === 'exists' || emailCheck === 'error' ? emailCheckMessage : null}
                </small>
                {emailCheck === 'error' ? (
                  <button
                    className="vp-link"
                    type="button"
                    aria-label="Retry email check"
                    title="Retry email check"
                    onClick={() => {
                      setEmailCheckMessage('');
                      setEmailCheck('checking');
                      setEmailCheckAttempt((attempt) => attempt + 1);
                    }}
                  >
                    <i className="ti ti-refresh" aria-hidden="true" />
                  </button>
                ) : null}
              </span>
            </label>
            <label className="vp-full-row">
              Company NPWP
              <input
                type="text"
                name="company_npwp"
                placeholder="Enter company NPWP number"
                required
                disabled={isSubmitting}
                pattern={'.*\\S.*'}
              />
            </label>
            <label className="vp-full-row">
              Company address
              <textarea
                name="address"
                placeholder="Enter company address"
                autoComplete="street-address"
                rows={3}
                required
                disabled={isSubmitting}
                onChange={(event) => {
                  event.target.setCustomValidity(event.target.value.trim() ? '' : 'Please enter your company address.');
                }}
              />
            </label>
            <label>
              Contact person name
              <input
                type="text"
                name="pic_name"
                placeholder="Full name of contact person"
                required
                disabled={isSubmitting}
                pattern={'.*\\S.*'}
              />
            </label>
            <label>
              Phone number
              <input type="tel" name="pic_phone" placeholder="08xx xxxx xxxx" required disabled={isSubmitting} pattern={'.*\\S.*'} />
            </label>
          </div>
        </div>
        <div
          id="vp-registration-documents"
          className="vp-registration-panel"
          role="tabpanel"
          aria-labelledby="vp-tab-documents"
          hidden={activeTab !== 'documents'}
        >
          <div className="vp-document-section">
            <div>
              <h3>Legal documents</h3>
              <p>PDF, JPG, or PNG. Maximum 10 MB per file.</p>
            </div>
            <div className="vp-upload-grid">
              {documentRequirements.map((document) => (
                <div
                  className={`vp-registration-upload-card${document.template ? ' vp-document-upload-template' : ''}`}
                  key={`${vendorType}-${document.key}`}
                >
                  {document.template ? (
                    <div className="vp-template-download">
                      <button
                        type="button"
                        className="vp-link"
                        disabled={isSubmitting || Boolean(downloadingTemplate)}
                        onClick={() => downloadTemplate(document)}
                      >
                        <i className="ti ti-download" aria-hidden="true" />
                        {downloadingTemplate === document.key ? 'Downloading...' : `Download ${document.label}`}
                      </button>
                      <small>Download and complete the template, then upload the completed document below.</small>
                    </div>
                  ) : null}
                  <label className={files[document.key] ? 'vp-upload has-file' : 'vp-upload'}>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      name={document.key}
                      required={document.required}
                      disabled={isSubmitting}
                      onChange={(event) => setFile(document.key, event.target)}
                    />
                    <i className={`ti ${files[document.key] ? 'ti-circle-check' : document.icon}`} />
                    <span>
                      <strong>{document.label}</strong>
                      <small>{document.required ? 'Required' : 'Optional'}</small>
                      <small>
                        {files[document.key]?.name || (document.template ? 'Upload completed document' : 'Click to select a file')}
                      </small>
                    </span>
                  </label>
                </div>
              ))}
            </div>
          </div>
          <label className="vp-check vp-terms">
            <input type="checkbox" name="terms_agreed" required disabled={isSubmitting} /> I agree to the vendor partnership terms and
            policies.
          </label>
        </div>
      </form>
    </RegistrationModal>
  );
}

export default function VendorPortal() {
  const { page, vendorType } = useParams();
  const session = getVendorPortalSession();

  if (page === 'register')
    return (
      <>
        {' '}
        <LoginPage /> <RegisterPage />{' '}
      </>
    );
  if (page === 'account') return session ? <VendorAccount /> : <Navigate to="/vendor-portal" replace />;
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
