import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Cookies from 'js-cookie';

// react-bootstrap
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import Dropdown from 'react-bootstrap/Dropdown';
import Form from 'react-bootstrap/Form';
import Image from 'react-bootstrap/Image';
import Nav from 'react-bootstrap/Nav';
import Row from 'react-bootstrap/Row';
import Stack from 'react-bootstrap/Stack';

// project-imports
import MainCard from 'components/MainCard';
import SimpleBarScroll from 'components/third-party/SimpleBar';
import { handlerDrawerOpen, useGetMenuMaster } from 'api/menu';

// assets
import Img1 from 'assets/images/user/avatar-1.png';
import Img2 from 'assets/images/user/avatar-2.png';
import Img3 from 'assets/images/user/avatar-3.png';
import Img4 from 'assets/images/user/avatar-4.png';
import Img5 from 'assets/images/user/avatar-5.png';
import { getCookies } from '../../utils/cookies';
import { InputGroup, Modal } from 'react-bootstrap';
import UserServices from '../../services/UserServices';
import LoaderButton from '../../components/LoaderButton';
import { useAlert } from '../../utils/alertContext';

const notifications = [
  {
    id: 1,
    avatar: Img1,
    time: '2 min ago',
    title: 'UI/UX Design',
    description: "Lorem Ipsum has been the industry's standard dummy text ever since the 1500s.",
    date: 'Today'
  },
  {
    id: 2,
    avatar: Img2,
    time: '1 hour ago',
    title: 'Message',
    description: "Lorem Ipsum has been the industry's standard dummy text ever since the 1500s.",
    date: 'Today'
  },
  {
    id: 3,
    avatar: Img3,
    time: '2 hour ago',
    title: 'Forms',
    description: "Lorem Ipsum has been the industry's standard dummy text ever since the 1500s.",
    date: 'Yesterday'
  },
  {
    id: 4,
    avatar: Img4,
    time: '12 hour ago',
    title: 'Challenge invitation',
    description: 'Jonny aber invites you to join the challenge',
    actions: true,
    date: 'Yesterday'
  },
  {
    id: 5,
    avatar: Img5,
    time: '5 hour ago',
    title: 'Security',
    description: "Lorem Ipsum has been the industry's standard dummy text ever since the 1500s.",
    date: 'Yesterday'
  }
];

// =============================|| MAIN LAYOUT - HEADER ||============================== //

export default function Header() {
  const { menuMaster } = useGetMenuMaster();
  const { showAlert } = useAlert();
  const drawerOpen = menuMaster?.isDashboardDrawerOpened;
  const userName = getCookies('name');
  const userEmail = getCookies('email');
  const customerCode = getCookies('customerCode');
  const distributorName = getCookies('distributorName');
  const userInitial = userName?.charAt(0)?.toUpperCase() || 'U';

  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [showChangePass, setShowChangePass] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const canSubmitPassword = Boolean(oldPass && newPass && confirmPass && newPass === confirmPass);

  const handleLogout = () => {
    Cookies.remove('isLoggedIn');
    Cookies.remove('accessToken');
    Cookies.remove('id');
    Cookies.remove('name');
    Cookies.remove('email');
    Cookies.remove('role');
    Cookies.remove('menu');
    Cookies.remove('customerCode');
    Cookies.remove('distributorName');
    Cookies.remove('distributorId');
    window.location.replace('/');
  };

  const toggleOldPass = () => {
    setShowOldPassword((prevState) => !prevState);
  };

  const toggleNewPass = () => {
    setShowNewPassword((prevState) => !prevState);
  };

  const toggleConfirmPass = () => {
    setShowConfirmPassword((prevState) => !prevState);
  };

  const closeChangePassword = () => {
    setShowChangePass(false);
    setOldPass('');
    setNewPass('');
    setConfirmPass('');
    setShowOldPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const handleChangePassword = async () => {
    setLoadingSubmit(true);
    const payload = {
      old_password: oldPass,
      new_password: newPass,
      new_password_confirmation: confirmPass
    };

    const response = await UserServices.postChangePassword(payload);
    console.log('resp => ', response.data.message)
    try {
      if (response.data.success) {
        setLoadingSubmit(false);
        showAlert('Kata sandi berhasil di ubah', 'success');
        closeChangePassword();
      } else {
        setLoadingSubmit(false);
        showAlert(response.data.message, 'danger');
      }
    } catch (error) {
      console.log(error)
      setLoadingSubmit(false);
    }
  };

  return (
    <header className="pc-header">
      <div className="header-wrapper">
        <div className="me-auto pc-mob-drp">
          <Nav className="list-unstyled">
            <Nav.Item className="pc-h-item pc-sidebar-collapse">
              <Nav.Link
                as={Link}
                to="#"
                className="pc-head-link ms-0"
                id="sidebar-hide"
                onClick={() => {
                  handlerDrawerOpen(!drawerOpen);
                }}
              >
                <i className="ph ph-list" />
              </Nav.Link>
            </Nav.Item>

            <Nav.Item className="pc-h-item pc-sidebar-popup">
              <Nav.Link as={Link} to="#" className="pc-head-link ms-0" id="mobile-collapse" onClick={() => handlerDrawerOpen(!drawerOpen)}>
                <i className="ph ph-list" />
              </Nav.Link>
            </Nav.Item>

            {/* <Dropdown className="pc-h-item dropdown">
              <Dropdown.Toggle variant="link" className="pc-head-link arrow-none m-0 trig-drp-search" id="dropdown-search">
                <i className="ph ph-magnifying-glass" />
              </Dropdown.Toggle>
              <Dropdown.Menu className="pc-h-dropdown drp-search">
                <Form className="px-3 py-2">
                  <Form.Control type="search" placeholder="Search here. . ." className="border-0 shadow-none" />
                </Form>
              </Dropdown.Menu>
            </Dropdown> */}
          </Nav>
        </div>
        <div className="ms-auto">
          <Nav className="list-unstyled">
            <Dropdown className="pc-h-item" align="end">
              {/* <Dropdown.Toggle className="pc-head-link me-0 arrow-none" variant="link" id="notification-dropdown">
                <i className="ph ph-bell" />
                <span className="badge bg-success pc-h-badge">3</span>
              </Dropdown.Toggle> */}

              <Dropdown.Menu className="dropdown-notification pc-h-dropdown">
                <Dropdown.Header className="d-flex align-items-center justify-content-between">
                  <h5 className="m-0">Notifications</h5>
                  <Link className="btn btn-link btn-sm" to="#">
                    Mark all read
                  </Link>
                </Dropdown.Header>
                <SimpleBarScroll style={{ maxHeight: 'calc(100vh - 215px)' }}>
                  <div className="dropdown-body text-wrap position-relative">
                    {notifications.map((notification, index) => (
                      <React.Fragment key={notification.id}>
                        {index === 0 || notifications[index - 1].date !== notification.date ? (
                          <p className="text-span">{notification.date}</p>
                        ) : null}
                        <MainCard className="mb-0">
                          <Stack direction="horizontal" gap={3}>
                            <Image className="img-radius avatar rounded-0" src={notification.avatar} alt="Generic placeholder image" />
                            <div>
                              <span className="float-end text-sm text-muted">{notification.time}</span>
                              <h5 className="text-body mb-2">{notification.title}</h5>
                              <p className="mb-0">{notification.description}</p>
                              {notification.actions && (
                                <div className="mt-2">
                                  <Button variant="outline-secondary" size="sm" className="me-2">
                                    Decline
                                  </Button>
                                  <Button variant="primary" size="sm">
                                    Accept
                                  </Button>
                                </div>
                              )}
                            </div>
                          </Stack>
                        </MainCard>
                      </React.Fragment>
                    ))}
                  </div>
                </SimpleBarScroll>

                <div className="text-center py-2">
                  <Link to="#!" className="link-danger">
                    Clear all Notifications
                  </Link>
                </div>
              </Dropdown.Menu>
            </Dropdown>
            <Dropdown className="pc-h-item" align="end">
              <Dropdown.Toggle
                className="pc-head-link sm-account-toggle arrow-none me-0"
                variant="link"
                id="user-profile-dropdown"
                aria-haspopup="true"
                aria-expanded="false"
              >
                <span className="sm-account-avatar">{userInitial}</span>
                <span className="sm-account-toggle-text">
                  <span>{userName || 'User'}</span>
                  <small>Akun</small>
                </span>
                <i className="ti ti-chevron-down" />
              </Dropdown.Toggle>

              <Dropdown.Menu className="dropdown-user-profile sm-account-menu pc-h-dropdown p-0 overflow-hidden">
                <Dropdown.Header className="sm-account-header">
                  <Stack direction="horizontal" gap={3} className="align-items-center">
                    <span className="sm-account-avatar sm-account-avatar-lg">{userInitial}</span>
                    <div className="min-w-0">
                      <h6 className="mb-1">{userName || 'User'}</h6>
                      <span>{userEmail || '-'}</span>
                    </div>
                  </Stack>
                </Dropdown.Header>

                <div className="dropdown-body sm-account-body">
                  <div className="sm-account-meta">
                    <div>
                      <span>Kode Customer</span>
                      <strong>{customerCode || '-'}</strong>
                    </div>
                    <div>
                      <span>Distributor</span>
                      <strong>{distributorName || '-'}</strong>
                    </div>
                  </div>

                  <div className="profile-notification-scroll position-relative">
                    <Dropdown.Item as={Link} to="/setting/user-list" className="sm-account-item">
                      <span className="sm-account-item-icon">
                        <i className="ti ti-users-group" />
                      </span>
                      <span>
                        <strong>Users</strong>
                        <small>Kelola daftar pengguna</small>
                      </span>
                    </Dropdown.Item>
                    <Dropdown.Item as={Link} to="/setting/role-permission" className="sm-account-item">
                      <span className="sm-account-item-icon">
                        <i className="ph ph-gear" />
                      </span>
                      <span>
                        <strong>Hak Akses</strong>
                        <small>Atur role dan permission</small>
                      </span>
                    </Dropdown.Item>
                    <Dropdown.Item as="button" className="sm-account-item" onClick={() => setShowChangePass(true)}>
                      <span className="sm-account-item-icon">
                        <i className="ph ph-lock-key" />
                      </span>
                      <span>
                        <strong>Ubah Kata Sandi</strong>
                        <small>Perbarui keamanan akun</small>
                      </span>
                    </Dropdown.Item>
                    <div className="d-grid mt-3">
                      <Button onClick={handleLogout} className="sm-account-logout">
                        <i className="ph ph-sign-out align-middle me-2" />
                        Logout
                      </Button>
                    </div>
                  </div>
                </div>
              </Dropdown.Menu>
            </Dropdown>
          </Nav>
        </div>
      </div>
      <Modal show={showChangePass} size="lg" centered onHide={closeChangePassword}>
        <Modal.Header closeButton>
          <Modal.Title>Ubah Kata Sandi</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="g-3">
            <Col lg={4}>
              <Card className="border mb-0 h-100">
                <Card.Body>
                  <div className="avtar avtar-xl bg-light-primary text-primary mb-3">
                    <i className="ph ph-lock-key f-24" />
                  </div>
                  <h6 className="mb-1">Keamanan Akun</h6>
                  <p className="text-muted mb-0">Gunakan kata sandi baru yang berbeda dan mudah Anda ingat.</p>
                </Card.Body>
              </Card>
            </Col>
            <Col lg={8}>
              <Stack gap={3}>
                <div>
                  <Form.Label className="f-12 text-muted">Kata Sandi Lama</Form.Label>
                  <InputGroup className="sm-input-group">
                    <InputGroup.Text>
                      <i className="ti ti-lock" />
                    </InputGroup.Text>
                    <Form.Control
                      type={showOldPassword ? 'text' : 'password'}
                      placeholder="Masukkan kata sandi lama"
                      value={oldPass}
                      onChange={(e) => setOldPass(e.target.value)}
                    />
                    <Button type="button" variant="light" className="sm-password-toggle" onClick={toggleOldPass}>
                      {showOldPassword ? <i className="ti ti-eye" /> : <i className="ti ti-eye-off" />}
                    </Button>
                  </InputGroup>
                </div>
                <div>
                  <Form.Label className="f-12 text-muted">Kata Sandi Baru</Form.Label>
                  <InputGroup className="sm-input-group">
                    <InputGroup.Text>
                      <i className="ti ti-key" />
                    </InputGroup.Text>
                    <Form.Control
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="Masukkan kata sandi baru"
                      value={newPass}
                      onChange={(e) => setNewPass(e.target.value)}
                    />
                    <Button type="button" variant="light" className="sm-password-toggle" onClick={toggleNewPass}>
                      {showNewPassword ? <i className="ti ti-eye" /> : <i className="ti ti-eye-off" />}
                    </Button>
                  </InputGroup>
                </div>
                <div>
                  <Form.Label className="f-12 text-muted">Konfirmasi Kata Sandi</Form.Label>
                  <InputGroup className="sm-input-group">
                    <InputGroup.Text>
                      <i className="ti ti-checkup-list" />
                    </InputGroup.Text>
                    <Form.Control
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Ulangi kata sandi baru"
                      value={confirmPass}
                      onChange={(e) => setConfirmPass(e.target.value)}
                      isInvalid={Boolean(confirmPass && newPass !== confirmPass)}
                    />
                    <Button type="button" variant="light" className="sm-password-toggle" onClick={toggleConfirmPass}>
                      {showConfirmPassword ? <i className="ti ti-eye" /> : <i className="ti ti-eye-off" />}
                    </Button>
                    <Form.Control.Feedback type="invalid">Konfirmasi kata sandi belum sama.</Form.Control.Feedback>
                  </InputGroup>
                </div>
              </Stack>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light-secondary" onClick={closeChangePassword}>
            Batal
          </Button>
          <Button variant="primary" onClick={() => handleChangePassword()} disabled={loadingSubmit || !canSubmitPassword}>
            {loadingSubmit ? <LoaderButton /> : 'Simpan'}
          </Button>
        </Modal.Footer>
      </Modal>
    </header>
  );
}
