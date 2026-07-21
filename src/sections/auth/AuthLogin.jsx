import PropTypes from 'prop-types';
import { useState } from 'react';
import Cookies from 'js-cookie';
import { useDispatch } from 'react-redux';

// react-bootstrap
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Image from 'react-bootstrap/Image';
import Modal from 'react-bootstrap/Modal';

// third-party
import { useForm } from 'react-hook-form';

// project-imports
import MainCard from 'components/MainCard';
import { passwordSchema, usernameSchema } from 'utils/validationSchema';
import { useAlert } from '../../utils/alertContext';

import CapKapalLogo from 'assets/images/cap-kapal.png';
import CapLayarLogo from 'assets/images/cap_layar.png';
import GaramCapTanganLogo from 'assets/images/garam-cap-tangan.png';
import GaramiLogo from 'assets/images/garami.png';
import GaramJempolLogo from 'assets/images/garam-jempol.png';
import GaramkuLogo from 'assets/images/garamku.png';
import SusantiMegahLogo from 'assets/images/logo-susanti-white.png';
import { DataService } from '../../config/dataService';
import LoaderButton from '../../components/LoaderButton';
import Turnstile from 'components/Turnstile';
import { AUTH_STATE_CHANGED_EVENT } from '../../utils/authEvents';
import { normalizeAccessibleSystems } from '../../systems';
import { setAccessibleSystem } from '../../redux/authReducer';

// ==============================|| AUTH LOGIN FORM ||============================== //

const productLogos = [
  { src: GaramkuLogo, alt: 'Garamku' },
  { src: CapKapalLogo, alt: 'Cap Kapal' },
  { src: CapLayarLogo, alt: 'Cap Layar' },
  { src: GaramiLogo, alt: 'Garami' },
  { src: GaramCapTanganLogo, alt: 'Garam Cap Tangan' },
  { src: GaramJempolLogo, alt: 'Garam Jempol' }
];

export default function AuthLoginForm({ className }) {
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

      if (response.data.success === true) {
        const loginData = response.data.data || {};
        const userData = loginData.user || {};
        const accessibleSystemSource =
          loginData.accessible_system ||
          loginData.accessible_systems ||
          userData.accessible_system ||
          userData.accessible_systems ||
          [];
        const accessibleSystems = normalizeAccessibleSystems(accessibleSystemSource);
        const customerCode = userData.customer_code || userData.code_customer || loginData.customer_code || loginData.code_customer || '';

        Cookies.set('isLoggedIn', true);
        Cookies.set('accessToken', loginData.access_token);
        Cookies.set('id', userData.id);
        Cookies.set('name', userData.name);
        Cookies.set('email', userData.email);
        Cookies.set('role', userData.role_id);
        Cookies.set('menu', JSON.stringify(loginData?.menu));
        Cookies.set('systems', JSON.stringify(loginData?.systems || loginData?.system_permissions || []));
        Cookies.set('system', JSON.stringify(accessibleSystems));
        dispatch(setAccessibleSystem(accessibleSystems));
        if (String(customerCode).trim()) {
          Cookies.set('customerCode', String(customerCode).trim());
        } else {
          Cookies.remove('customerCode');
        }
        Cookies.set('distributorName', userData?.name_distributor);
        Cookies.set('distributorId', userData?.id_distributor);
        window.dispatchEvent(new Event(AUTH_STATE_CHANGED_EVENT));
        setTimeout(() => {
          showAlert('Login berhasil', 'success');
        }, 150);
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
      <div className="sm-login-header">
        <div className="sm-login-title-group">
          <div className="sm-login-logo-wrap">
            <Image src={SusantiMegahLogo} alt="Susanti Megah" className="sm-login-logo" />
          </div>
          <h4>Sign in to Customer Portal</h4>
        </div>
        {/* <span className="sm-login-access">OPERATOR ACCESS</span> */}
        <p>Enter your account credentials to continue to the workspace assigned to your role.</p>
      </div>
      <div className="sm-login-products" aria-label="Product brands">
        {productLogos.map((product) => (
          <div className="sm-login-product" key={product.alt}>
            <img src={product.src} alt={product.alt} />
          </div>
        ))}
      </div>
      <Form onSubmit={handleSubmit(() => onSubmit(false))}>
        <Form.Group className="sm-login-field" controlId="formUsername">
          <Form.Label>
            <span>*</span> Username
          </Form.Label>
          <div className="sm-input-group">
            <span className="sm-input-icon" aria-hidden="true">
              <i className="ti ti-user" />
            </span>
            <Form.Control
              type="text"
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
          <Form.Label>
            <span>*</span> Password
          </Form.Label>
          <div className="sm-input-group">
            <span className="sm-input-icon" aria-hidden="true">
              <i className="ti ti-lock" />
            </span>
            <Form.Control
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              {...register('password', passwordSchema)}
              isInvalid={!!errors.password}
              className={`sm-password-input ${className ? 'bg-transparent border-white text-white border-opacity-25 ' : ''}`}
            />
            <Button type="button" variant="light" className="sm-password-toggle" onClick={togglePasswordVisibility}>
              {showPassword ? <i className="ti ti-eye" /> : <i className="ti ti-eye-off" />}
            </Button>
          </div>
          <Form.Control.Feedback type="invalid">{errors.password?.message}</Form.Control.Feedback>
        </Form.Group>

        {import.meta.env.VITE_TURNSTILE_ENABLED !== 'false' && (
          <Turnstile
            siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'}
            onVerify={setTurnstileToken}
          />
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
      <div className="sm-login-footnote">Dashboard access follows your registered role and distributor assignment.</div>
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
          <Button variant="secondary" onClick={() => setShowConfirmModal(false)}>
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
