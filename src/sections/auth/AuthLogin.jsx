import PropTypes from 'prop-types';
import { useState } from 'react';
import Cookies from 'js-cookie';

// react-bootstrap
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Image from 'react-bootstrap/Image';
import InputGroup from 'react-bootstrap/InputGroup';
import Modal from 'react-bootstrap/Modal';

// third-party
import { useForm } from 'react-hook-form';

// project-imports
import MainCard from 'components/MainCard';
import { passwordSchema, usernameSchema } from 'utils/validationSchema';
import { useAlert } from '../../utils/alertContext';

import CustomerPortalMark from 'assets/images/customer-portal-mark.png';
import { DataService } from '../../config/dataService';
import LoaderButton from '../../components/LoaderButton';
import { customerCodeSchema } from '../../utils/validationSchema';
import Turnstile from 'components/Turnstile';
import { AUTH_STATE_CHANGED_EVENT } from '../../utils/authEvents';

// ==============================|| AUTH LOGIN FORM ||============================== //

export default function AuthLoginForm({ className }) {
  const [showPassword, setShowPassword] = useState(false);
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
      code_customer: getValues().customerCode,
      cf_turnstile_response: turnstileToken,
      force: isForce
    };

    try {
      const response = await DataService.post('/auth/login', payload);

      if (response.data.success === true) {
        Cookies.set('isLoggedIn', true);
        Cookies.set('accessToken', response.data.data.access_token);
        Cookies.set('id', response.data.data.user.id);
        Cookies.set('name', response.data.data.user.name);
        Cookies.set('email', response.data.data.user.email);
        Cookies.set('role', response.data.data.user.role_id);
        Cookies.set('menu', JSON.stringify(response.data.data?.menu));
        Cookies.set('systems', JSON.stringify(response.data.data?.systems || response.data.data?.system_permissions || []));
        Cookies.set('customerCode', response.data.data?.user?.code_customer);
        Cookies.set('distributorName', response.data.data?.user?.name_distributor);
        Cookies.set('distributorId', response.data.data?.user?.id_distributor);
        window.dispatchEvent(new Event(AUTH_STATE_CHANGED_EVENT));
        setTimeout(() => {
          showAlert('Login berhasil', 'success');
        }, 150);
      } else if (
        response.data.active_session === true ||
        response.data.message === 'Akun ini sedang aktif di perangkat lain. Silakan logout terlebih dahulu dari perangkat tersebut.'
      ) {
        setShowConfirmModal(true);
      } else {
        showAlert(response.data.message, 'danger');
      }
    } catch (error) {
      showAlert(error?.message || 'Login gagal. Silakan coba kembali.', 'danger');
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
      <div className="text-center mb-4">
        <Image src={CustomerPortalMark} alt="sm-connect" className="sm-login-logo mb-3" />
        {/* <span className="sm-auth-eyebrow d-block mt-3">Selamat Datang</span> */}
        <p className="text-muted mb-0">Gunakan akun yang sudah terdaftar.</p>
      </div>
      <Form onSubmit={handleSubmit(() => onSubmit(false))}>
        <Form.Group className="mb-3" controlId="formUsername">
          <Form.Label>Username</Form.Label>
          <InputGroup className="sm-input-group">
            <InputGroup.Text>
              <i className="ti ti-user" />
            </InputGroup.Text>
            <Form.Control
              type="text"
              placeholder="Masukkan username"
              {...register('username', usernameSchema)}
              isInvalid={!!errors.username}
              name="username"
              className={className && 'bg-transparent border-white text-white border-opacity-25 '}
            />
          </InputGroup>
          <Form.Control.Feedback type="invalid">{errors.username?.message}</Form.Control.Feedback>
        </Form.Group>
        {/* <Form.Group className="mb-3" controlId="formCustomerCode">
          <Form.Label>Kode Customer</Form.Label>
          <InputGroup className="sm-input-group">
            <InputGroup.Text>
              <i className="ti ti-id" />
            </InputGroup.Text>
            <Form.Control
              type="text"
              placeholder="Masukkan kode customer"
              {...register('customerCode', customerCodeSchema)}
              isInvalid={!!errors.customerCode}
              name="customerCode"
              className={className && 'bg-transparent border-white text-white border-opacity-25 '}
            />
          </InputGroup>
          <Form.Control.Feedback type="invalid">{errors.customerCode?.message}</Form.Control.Feedback>
        </Form.Group> */}
        <Form.Group className="mb-3" controlId="formPassword">
          <Form.Label>Password</Form.Label>
          <InputGroup className="sm-input-group">
            <InputGroup.Text>
              <i className="ti ti-lock" />
            </InputGroup.Text>
            <Form.Control
              type={showPassword ? 'text' : 'password'}
              placeholder="Masukkan password"
              {...register('password', passwordSchema)}
              isInvalid={!!errors.password}
              className={className && 'bg-transparent border-white text-white border-opacity-25 '}
            />
            <Button type="button" variant="light" className="sm-password-toggle" onClick={togglePasswordVisibility}>
              {showPassword ? <i className="ti ti-eye" /> : <i className="ti ti-eye-off" />}
            </Button>
          </InputGroup>
          <Form.Control.Feedback type="invalid">{errors.password?.message}</Form.Control.Feedback>
        </Form.Group>

        {import.meta.env.VITE_TURNSTILE_ENABLED !== 'false' && (
          <Turnstile
            siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'}
            onVerify={setTurnstileToken}
          />
        )}

        <div className="d-grid mt-4">
          <Button
            type="submit"
            disabled={isLoading || (import.meta.env.VITE_TURNSTILE_ENABLED !== 'false' && !turnstileToken)}
            className="sm-login-submit"
          >
            {isLoading ? <LoaderButton /> : 'Login'}
          </Button>
        </div>
      </Form>
      <Modal show={showConfirmModal} onHide={() => setShowConfirmModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Konfirmasi Login</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center py-4">
          <div className="text-warning mb-3">
            <i className="ti ti-alert-triangle" style={{ fontSize: '3.5rem' }} />
          </div>
          <h5 className="mb-2">Akun Sedang Aktif</h5>
          <p className="text-muted mb-0">
            Akun ini sedang aktif di perangkat lain. Apakah Anda ingin mengeluarkan (logout) perangkat tersebut dan masuk di perangkat ini?
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowConfirmModal(false)}>
            Batal
          </Button>
          <Button variant="danger" onClick={handleForceLogin}>
            Ya, Keluarkan
          </Button>
        </Modal.Footer>
      </Modal>
    </MainCard>
  );
}

AuthLoginForm.propTypes = { className: PropTypes.string };
