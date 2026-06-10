import PropTypes from 'prop-types';
import { useState } from 'react';
import Cookies from 'js-cookie';

// react-bootstrap
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Image from 'react-bootstrap/Image';
import InputGroup from 'react-bootstrap/InputGroup';

// third-party
import { useForm } from 'react-hook-form';

// project-imports
import MainCard from 'components/MainCard';
import { passwordSchema, usernameSchema } from 'utils/validationSchema';
import { useAlert } from '../../utils/alertContext';

// assets
import SusantiMegahLogo from 'assets/images/susanti-megah-logo.svg';
import { DataService } from '../../config/dataService';
import LoaderButton from '../../components/LoaderButton';
import { customerCodeSchema } from '../../utils/validationSchema';

// ==============================|| AUTH LOGIN FORM ||============================== //

export default function AuthLoginForm({ className }) {
  const [showPassword, setShowPassword] = useState(false);
  const { showAlert } = useAlert();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors }
  } = useForm();

  const togglePasswordVisibility = () => {
    setShowPassword((prevState) => !prevState);
  };

  const onSubmit = async () => {
    setIsLoading(true);
    const payload = {
      username: getValues().username,
      password: getValues().password,
      code_customer: getValues().customerCode
    };
    const response = await DataService.post('/auth/login', payload);
    console.log('response login => ', response.data);
    try {
      if (response.data.success === true) {
        Cookies.set('isLoggedIn', true);
        Cookies.set('accessToken', response.data.data.access_token);
        Cookies.set('id', response.data.data.user.id);
        Cookies.set('name', response.data.data.user.name);
        Cookies.set('email', response.data.data.user.email);
        Cookies.set('role', response.data.data.user.role_id);
        Cookies.set('menu', JSON.stringify(response.data.data?.menu));
        Cookies.set('customerCode', response.data.data?.user?.code_customer);
        Cookies.set('distributorName', response.data.data?.user?.name_distributor);
        Cookies.set('distributorId', response.data.data?.user?.id_distributor);
        showAlert('Login Successful', 'success');
        setIsLoading(false);
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        setIsLoading(false);
        showAlert(response.data.message, 'danger');
      }
    } catch (error) {
      setIsLoading(false);
      console.log('login error => ', error);
    }
  };

  return (
    <MainCard className="sm-login-card mb-0">
      <div className="text-center mb-4">
        <Image src={SusantiMegahLogo} alt="PT. Susanti Megah" className="sm-login-logo" />
        <span className="sm-auth-eyebrow d-block mt-3">Selamat Datang</span>
        <h4 className="mb-1">Masuk ke Distributor Channel</h4>
        <p className="text-muted mb-0">Gunakan akun dan kode customer yang sudah terdaftar.</p>
      </div>
      <Form onSubmit={handleSubmit(onSubmit)}>
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
        <Form.Group className="mb-3" controlId="formCustomerCode">
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
        </Form.Group>
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

        <div className="d-grid mt-4">
          <Button type="submit" disabled={isLoading} className="sm-login-submit">
            {isLoading ? <LoaderButton /> : 'Login'}
          </Button>
        </div>
      </Form>
    </MainCard>
  );
}

AuthLoginForm.propTypes = { className: PropTypes.string };
