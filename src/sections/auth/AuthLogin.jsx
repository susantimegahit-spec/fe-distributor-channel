import PropTypes from 'prop-types';
import { useState } from 'react';
import Cookies from 'js-cookie';
import { useDispatch } from 'react-redux';

// react-bootstrap
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';

// third-party
import { useForm } from 'react-hook-form';

// project-imports
import MainCard from 'components/MainCard';
import { passwordSchema, usernameSchema } from 'utils/validationSchema';
import { useAlert } from '../../utils/alertContext';

import { DataService } from '../../config/dataService';
import LoaderButton from '../../components/LoaderButton';
import Turnstile from 'components/Turnstile';
import { AUTH_STATE_CHANGED_EVENT } from '../../utils/authEvents';
import { getFirstAccessibleMenuPath, isAdministratorRole, normalizeAccessibleSystems, systems } from '../../systems';
import { setAccessibleSystem } from '../../redux/authReducer';

// ==============================|| AUTH LOGIN FORM ||============================== //

const normalizeAssignmentValues = (value, valueKeys = []) => {
  if (value === undefined || value === null || value === '') return [];

  if (Array.isArray(value)) {
    return [...new Set(value.flatMap((item) => normalizeAssignmentValues(item, valueKeys)).filter(Boolean))];
  }

  if (typeof value === 'object') {
    const objectValue = valueKeys.map((key) => value?.[key]).find((item) => item !== undefined && item !== null && item !== '');
    return normalizeAssignmentValues(objectValue, valueKeys);
  }

  const normalizedValue = String(value).trim();
  if (!normalizedValue) return [];

  try {
    const parsedValue = JSON.parse(normalizedValue);
    if (parsedValue !== normalizedValue) return normalizeAssignmentValues(parsedValue, valueKeys);
  } catch {
    // Use a comma-separated assignment value when the response is not JSON.
  }

  return [
    ...new Set(
      normalizedValue
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    )
  ];
};

const getAssignmentValues = (userData, loginData, keys, valueKeys = keys) => {
  const source = [...keys.map((key) => userData?.[key]), ...keys.map((key) => loginData?.[key])].find(
    (value) => value !== undefined && value !== null && value !== ''
  );

  return normalizeAssignmentValues(source, valueKeys);
};

const setAssignmentCookie = (key, values) => {
  if (values.length) {
    Cookies.set(key, JSON.stringify(values));
  } else {
    Cookies.remove(key);
  }
};

export default function AuthLoginForm({ className }) {
  const isSessionExpired = new URLSearchParams(window.location.search).get('reason') === 'session-expired';
  const [showPassword, setShowPassword] = useState(false);
  const dispatch = useDispatch();
  const { showAlert } = useAlert();
  const [isLoading, setIsLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors }
  } = useForm();

  const togglePasswordVisibility = () => {
    setShowPassword((prevState) => !prevState);
  };

  const onSubmit = async (force = false) => {
    const isForce = force === true;
    setIsLoading(true);
    const payload = {
      username: getValues().username,
      password: getValues().password,
      code_customer: '',
      cf_turnstile_response: turnstileToken,
      force: isForce
    };

    try {
      const response = await DataService.post('/auth/login', payload);
      console.log('Login response:', JSON.stringify(response.data, null, 2));

      if (response.data.success === true) {
        sessionStorage.removeItem('dc-session-expired-redirecting');
        sessionStorage.removeItem('dc-browser-workspace-v1');
        const loginData = response.data.data || {};
        const userData = loginData.user || {};
        const accessibleSystemSource =
          loginData.accessible_system || loginData.accessible_systems || userData.accessible_system || userData.accessible_systems || [];
        const accessibleSystems = normalizeAccessibleSystems(accessibleSystemSource);
        const actions = loginData.actions || loginData.permissions || userData.actions || userData.custom_permissions || [];
        const customerCode = userData.customer_code || userData.code_customer || loginData.customer_code || loginData.code_customer || '';
        const expeditionData = userData.expedition || loginData.expedition || {};
        const expeditionCode =
          userData.expedition_code ||
          userData.expeditionCode ||
          userData.code_expedition ||
          loginData.expedition_code ||
          loginData.expeditionCode ||
          loginData.code_expedition ||
          expeditionData.code ||
          expeditionData.expedition_code ||
          '';
        const warehouseCodes = getAssignmentValues(
          userData,
          loginData,
          ['whs_code', 'whsCodes', 'warehouse_codes', 'warehouses', 'warehouse'],
          ['whs_code', 'whsCode', 'warehouse_code', 'code', 'value']
        );
        const ocrCodes = getAssignmentValues(
          userData,
          loginData,
          ['ocr_code', 'ocrCode', 'branches', 'branch_codes'],
          ['ocr_code', 'ocrCode', 'code', 'value']
        );
        const ocrCodes2 = getAssignmentValues(
          userData,
          loginData,
          ['ocr_code2', 'ocrCode2', 'business_units', 'business_unit_codes'],
          ['ocr_code2', 'ocrCode2', 'ocr_code', 'code', 'value']
        );
        const ocrCodes3 = getAssignmentValues(
          userData,
          loginData,
          ['ocr_code3', 'ocrCode3', 'departments', 'department_codes'],
          ['ocr_code3', 'ocrCode3', 'ocr_code', 'code', 'value']
        );

        Cookies.set('isLoggedIn', true);
        Cookies.set('accessToken', loginData.access_token);
        Cookies.set('id', userData.id);
        Cookies.set('name', userData.name);
        Cookies.set('email', userData.email);
        Cookies.set('role', userData.role_id);
        Cookies.set('menu', JSON.stringify(loginData?.menu));
        Cookies.set('actions', JSON.stringify(actions));
        Cookies.set('systems', JSON.stringify(loginData?.systems || loginData?.system_permissions || []));
        Cookies.set('system', JSON.stringify(accessibleSystems));
        dispatch(setAccessibleSystem(accessibleSystems));
        if (String(customerCode).trim()) {
          Cookies.set('customerCode', String(customerCode).trim());
        } else {
          Cookies.remove('customerCode');
        }
        if (String(expeditionCode).trim()) {
          Cookies.set('expedition_code', String(expeditionCode).trim());
        } else {
          Cookies.remove('expedition_code');
        }
        setAssignmentCookie('whs_code', warehouseCodes);
        setAssignmentCookie('ocr_code', ocrCodes);
        setAssignmentCookie('ocr_code2', ocrCodes2);
        setAssignmentCookie('ocr_code3', ocrCodes3);
        Cookies.set('distributorName', userData?.name_distributor);
        Cookies.set('distributorId', userData?.id_distributor);
        const permissionMenu = Array.isArray(loginData?.menu) ? loginData.menu : [];
        const accessibleSystemList = systems.filter(
          (system) => isAdministratorRole(userData.role_id) || accessibleSystems.includes(system.key)
        );
        const firstSystemWithAccessibleMenu = accessibleSystemList
          .map((system) => ({
            system,
            menuPath: getFirstAccessibleMenuPath(system, permissionMenu, userData.role_id)
          }))
          .find(({ menuPath }) => Boolean(menuPath));
        const firstAccessibleSystem = firstSystemWithAccessibleMenu?.system || accessibleSystemList[0];
        const firstAccessiblePath = firstSystemWithAccessibleMenu?.menuPath || firstAccessibleSystem?.defaultPath || '/systems';

        window.dispatchEvent(new Event(AUTH_STATE_CHANGED_EVENT));
        setTimeout(() => {
          showAlert('Login berhasil', 'success');
        }, 150);
        const baseName = (import.meta.env.VITE_APP_BASE_NAME || '').replace(/\/$/, '');
        window.location.replace(`${baseName}${firstAccessiblePath}`);
      } else if (
        response.data.active_session === true ||
        response.data.message === 'This account is active on another device. Please log out from that device first.'
      ) {
        setShowConfirmModal(true);
      } else {
        showAlert(response.data.message, 'danger');
      }
    } catch (error) {
      showAlert(error?.message || 'Login failed. Please try again.', 'danger');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForceLogin = () => {
    setShowConfirmModal(false);
    onSubmit(true);
  };

  return (
    <MainCard className="sm-login-card mb-0">
      {isSessionExpired ? (
        <div className="sm-session-expired-alert" role="alert">
          <span>
            <i className="ti ti-clock-exclamation" />
          </span>
          <div>
            <strong>Your session has expired</strong>
            <p>Please sign in again to continue your work.</p>
          </div>
        </div>
      ) : null}
      <div className="sm-login-header">
        <div className="sm-login-title-group">
          <h4>Sign in</h4>
        </div>
        {/* <span className="sm-login-access">OPERATOR ACCESS</span> */}
        <p>Enter your credentials to access your assigned workspace.</p>
      </div>
      <Form onSubmit={handleSubmit(() => onSubmit(false))}>
        <Form.Group className="sm-login-field" controlId="formUsername">
          <div className="sm-input-group">
            <span className="sm-input-icon" aria-hidden="true">
              <i className="ti ti-user" />
            </span>
            <Form.Control
              type="text"
              aria-label="Username"
              placeholder="Enter your username"
              {...register('username', usernameSchema)}
              isInvalid={!!errors.username}
              name="username"
              className={className && 'bg-transparent border-white text-white border-opacity-25 '}
            />
          </div>
          <Form.Control.Feedback type="invalid">{errors.username?.message}</Form.Control.Feedback>
        </Form.Group>
        <Form.Group className="sm-login-field" controlId="formPassword">
          <div className="sm-input-group">
            <span className="sm-input-icon" aria-hidden="true">
              <i className="ti ti-lock" />
            </span>
            <Form.Control
              type={showPassword ? 'text' : 'password'}
              aria-label="Password"
              placeholder="Enter your password"
              {...register('password', passwordSchema)}
              isInvalid={!!errors.password}
              className={`sm-password-input ${className ? 'bg-transparent border-white text-white border-opacity-25 ' : ''}`}
            />
            <Button type="button" variant="light" className="sm-password-toggle" onClick={togglePasswordVisibility}>
              {showPassword ? <i className="ti ti-eye" /> : <i className="ti ti-eye-off" />}
            </Button>
          </div>
          {errors.password && (
            <Form.Control.Feedback type="invalid" className="d-block">
              {errors.password.message}
            </Form.Control.Feedback>
          )}
        </Form.Group>

        {import.meta.env.VITE_TURNSTILE_ENABLED !== 'false' && (
          <Turnstile siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'} onVerify={setTurnstileToken} />
        )}

        <div className="d-grid sm-login-action">
          <Button
            type="submit"
            disabled={isLoading || (import.meta.env.VITE_TURNSTILE_ENABLED !== 'false' && !turnstileToken)}
            className="sm-login-submit"
          >
            {isLoading ? <LoaderButton /> : 'Sign In'}
          </Button>
        </div>
      </Form>
      <div className="sm-login-footnote">
        <i className="ti ti-lock" aria-hidden="true" /> Your access is protected and role-based.
      </div>
      <Modal show={showConfirmModal} onHide={() => setShowConfirmModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Sign-In Confirmation</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center py-4">
          <div className="text-warning mb-3">
            <i className="ti ti-alert-triangle" style={{ fontSize: '3.5rem' }} />
          </div>
          <h5 className="mb-2">Account Already Active</h5>
          <p className="text-muted mb-0">
            This account is currently active on another device. Do you want to sign out that device and continue here?
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="danger" onClick={() => setShowConfirmModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleForceLogin}>
            Yes, Sign Out
          </Button>
        </Modal.Footer>
      </Modal>
    </MainCard>
  );
}

AuthLoginForm.propTypes = { className: PropTypes.string };
