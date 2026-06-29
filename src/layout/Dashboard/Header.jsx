import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Cookies from 'js-cookie';

// react-bootstrap
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import Dropdown from 'react-bootstrap/Dropdown';
import Form from 'react-bootstrap/Form';
import Nav from 'react-bootstrap/Nav';
import Row from 'react-bootstrap/Row';
import Stack from 'react-bootstrap/Stack';

// project-imports
import SimpleBarScroll from 'components/third-party/SimpleBar';
import { handlerDrawerOpen, useGetMenuMaster } from 'api/menu';

import { getCookies } from '../../utils/cookies';
import { InputGroup, Modal } from 'react-bootstrap';
import UserServices from '../../services/UserServices';
import NotificationServices from '../../services/NotificationServices';
import LoaderButton from '../../components/LoaderButton';
import { useAlert } from '../../utils/alertContext';
import { createEchoClient, getNotificationChannelName } from '../../config/echo';
import {
  getNotificationItems,
  getNotificationKey,
  getNotificationResponsePayload,
  getUnreadNotificationCount,
  normalizeNotification
} from '../../utils/notification';
import { DataService } from '../../config/dataService';

// =============================|| MAIN LAYOUT - HEADER ||============================== //

export default function Header() {
  const roleId = getCookies('role');
  const { menuMaster } = useGetMenuMaster();
  const { showAlert } = useAlert();
  const drawerOpen = menuMaster?.isDashboardDrawerOpened;
  const userId = getCookies('id');
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
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [notificationError, setNotificationError] = useState('');
  const [sendingTestNotification, setSendingTestNotification] = useState(false);
  const notificationAudioContextRef = useRef(null);
  const knownNotificationIdsRef = useRef(new Set());
  const hasLoadedNotificationsRef = useRef(false);
  const canSubmitPassword = Boolean(oldPass && newPass && confirmPass && newPass === confirmPass);

  const playNotificationSound = useCallback(() => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;

      if (!notificationAudioContextRef.current) {
        notificationAudioContextRef.current = new AudioContext();
      }

      const audioContext = notificationAudioContextRef.current;
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      const startTime = audioContext.currentTime;

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, startTime);
      oscillator.frequency.setValueAtTime(1175, startTime + 0.08);
      gainNode.gain.setValueAtTime(0.001, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.2, startTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.32);

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.start(startTime);
      oscillator.stop(startTime + 0.34);
    } catch (error) {
      // Browser can block audio until the user interacts with the page.
    }
  }, []);

  const fetchNotifications = useCallback(
    async (silent = false) => {
      if (!silent) setLoadingNotifications(true);
      setNotificationError('');

      try {
        const response = await NotificationServices.getNotifications();
        const payload = getNotificationResponsePayload(response);
        const items = getNotificationItems(payload).map(normalizeNotification);
        const incomingKeys = items.map(getNotificationKey).filter(Boolean);
        const hasNewUnreadNotification = items.some((item) => {
          const key = getNotificationKey(item);
          return item.unread && key && !knownNotificationIdsRef.current.has(key);
        });

        if (hasLoadedNotificationsRef.current && hasNewUnreadNotification) {
          playNotificationSound();
        }

        incomingKeys.forEach((key) => knownNotificationIdsRef.current.add(key));
        hasLoadedNotificationsRef.current = true;

        setNotifications(items);
        setUnreadCount(getUnreadNotificationCount(payload, items));
      } catch (error) {
        setNotificationError('Notifikasi belum bisa dimuat.');
      } finally {
        if (!silent) setLoadingNotifications(false);
      }
    },
    [playNotificationSound]
  );

  const handleIncomingNotification = useCallback(
    (payload) => {
      const notification = normalizeNotification({
        ...payload,
        read_at: payload?.read_at ?? null,
        created_at: payload?.created_at || payload?.createdAt || new Date().toISOString()
      });
      const notificationKey = getNotificationKey(notification);
      const isNewNotification = notificationKey && !knownNotificationIdsRef.current.has(notificationKey);

      if (notificationKey) {
        knownNotificationIdsRef.current.add(notificationKey);
      }

      if (notification.unread && isNewNotification) {
        playNotificationSound();
      }

      setNotifications((prevState) => {
        const existingNotification = notification.id ? prevState.find((item) => item.id === notification.id) : null;

        if (existingNotification) {
          if (!existingNotification.unread && notification.unread) {
            setUnreadCount((prevCount) => prevCount + 1);
          }

          return prevState.map((item) => (item.id === notification.id ? notification : item));
        }

        if (notification.unread) {
          setUnreadCount((prevCount) => prevCount + 1);
        }

        return [notification, ...prevState];
      });

      // Tampilkan popup notifikasi secara real-time
      showAlert(`${notification.title}: ${notification.description}`, 'info', 8000);
    },
    [playNotificationSound, showAlert]
  );

  const handleLogout = async () => {
    try {
      await DataService.post('/auth/logout');
    } catch (error) {
      console.error('Failed to logout on server:', error);
    } finally {
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
    }
  };

  const handleNotificationDropdownToggle = (isOpen) => {
    if (isOpen) {
      fetchNotifications(true);
    }
  };

  const handleMarkAsRead = async (notification) => {
    if (!notification?.id) return;

    if (notification.unread) {
      setNotifications((prevState) => prevState.map((item) => (item.id === notification.id ? { ...item, unread: false } : item)));
      setUnreadCount((prevState) => Math.max(prevState - 1, 0));
    }

    try {
      await NotificationServices.markAsRead(notification.id);
      fetchNotifications(true);
    } catch (error) {
      fetchNotifications(true);
    }
  };

  const handleMarkAllAsRead = async () => {
    setNotifications((prevState) => prevState.map((item) => ({ ...item, unread: false })));
    setUnreadCount(0);

    try {
      await NotificationServices.markAllAsRead();
      fetchNotifications(true);
    } catch (error) {
      fetchNotifications(true);
    }
  };

  const handleSendTestNotification = async () => {
    setSendingTestNotification(true);

    try {
      const response = await NotificationServices.sendTestNotification({
        title: 'Test Push Notification',
        message: 'Notifikasi test berhasil dikirim dari backend.'
      });
      const payload = getNotificationResponsePayload(response);

      if (payload?.id) {
        handleIncomingNotification(payload);
      } else {
        fetchNotifications(true);
      }

      showAlert('Notifikasi test berhasil dikirim', 'success');
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Gagal mengirim notifikasi test', 'danger');
    } finally {
      setSendingTestNotification(false);
    }
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
      console.log(error);
      setLoadingSubmit(false);
    }
  };

  useEffect(() => {
    // fetchNotifications();
  }, [fetchNotifications]);

  // useEffect(() => {
  //   const intervalId = window.setInterval(() => {
  //     fetchNotifications(true);
  //   }, 15000);

  //   return () => window.clearInterval(intervalId);
  // }, [fetchNotifications]);

  useEffect(() => {
    const unlockNotificationAudio = () => {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;

        if (!notificationAudioContextRef.current) {
          notificationAudioContextRef.current = new AudioContext();
        }

        if (notificationAudioContextRef.current.state === 'suspended') {
          notificationAudioContextRef.current.resume();
        }
      } catch (error) {
        // Ignore browsers that block or do not support Web Audio.
      }

      window.removeEventListener('pointerdown', unlockNotificationAudio);
      window.removeEventListener('keydown', unlockNotificationAudio);
    };

    window.addEventListener('pointerdown', unlockNotificationAudio);
    window.addEventListener('keydown', unlockNotificationAudio);

    return () => {
      window.removeEventListener('pointerdown', unlockNotificationAudio);
      window.removeEventListener('keydown', unlockNotificationAudio);
    };
  }, []);

  useEffect(() => {
    if (!userId) return undefined;

    const echo = createEchoClient();
    const channelName = getNotificationChannelName(userId);

    if (!echo) {
      return undefined;
    }

    const channel = echo.private(channelName);
    const customEvent = import.meta.env.VITE_ECHO_NOTIFICATION_EVENT || '.NotificationCreated';

    channel.notification(handleIncomingNotification);

    if (customEvent) {
      channel.listen(customEvent, handleIncomingNotification);
    }

    return () => {
      channel.stopListeningForNotification(handleIncomingNotification);

      if (customEvent) {
        channel.stopListening(customEvent);
      }

      echo.leave(channelName);
      echo.disconnect();
    };
  }, [handleIncomingNotification, userId]);

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
            <Dropdown className="pc-h-item" align="end" onToggle={handleNotificationDropdownToggle}>
              <Dropdown.Toggle className="pc-head-link sm-notification-toggle me-0 arrow-none" variant="link" id="notification-dropdown">
                <i className="ph ph-bell" />
                {unreadCount > 0 && <span className="badge bg-danger pc-h-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
              </Dropdown.Toggle>

              <Dropdown.Menu className="dropdown-notification pc-h-dropdown">
                <Dropdown.Header className="d-flex align-items-center justify-content-between">
                  <div>
                    <h5 className="m-0">Notifikasi</h5>
                    <small className="text-muted">{unreadCount > 0 ? `${unreadCount} belum dibaca` : 'Semua sudah dibaca'}</small>
                  </div>
                  <Button variant="link" size="sm" className="p-0 text-primary" disabled={!unreadCount} onClick={handleMarkAllAsRead}>
                    Tandai dibaca
                  </Button>
                </Dropdown.Header>
                <SimpleBarScroll style={{ maxHeight: 'calc(100vh - 215px)' }}>
                  <div className="dropdown-body text-wrap position-relative">
                    {loadingNotifications && <div className="sm-notification-state">Memuat notifikasi...</div>}

                    {!loadingNotifications && notificationError && (
                      <div className="sm-notification-state text-danger">{notificationError}</div>
                    )}

                    {!loadingNotifications && !notificationError && notifications.length === 0 && (
                      <div className="sm-notification-state">
                        <span className="sm-notification-empty-icon">
                          <i className="ph ph-bell-simple" />
                        </span>
                        <strong>Belum ada notifikasi</strong>
                        <small>Notifikasi dari backend akan tampil di sini.</small>
                      </div>
                    )}

                    {!loadingNotifications &&
                      !notificationError &&
                      notifications.map((notification, index) => (
                        <React.Fragment key={notification.id || `${notification.title}-${index}`}>
                          {index === 0 || notifications[index - 1].date !== notification.date ? (
                            <p className="text-span">{notification.date}</p>
                          ) : null}
                          <button type="button" className="sm-notification-item" onClick={() => handleMarkAsRead(notification)}>
                            <span className={`sm-notification-icon ${notification.unread ? 'is-unread' : ''}`}>
                              <i className="ph ph-bell-ringing" />
                            </span>
                            <span className="sm-notification-content">
                              <span className="d-flex align-items-start justify-content-between gap-2">
                                <strong>{notification.title}</strong>
                                {notification.unread && <span className="sm-notification-dot" />}
                              </span>
                              <span>{notification.description}</span>
                              {notification.time && <small>{notification.time}</small>}
                            </span>
                          </button>
                        </React.Fragment>
                      ))}
                  </div>
                </SimpleBarScroll>

                <div className="text-center py-2 sm-notification-footer">
                  <Button as={Link} to="/notifications" variant="link" size="sm">
                    Lihat semua
                  </Button>
                  <Button variant="link" size="sm" onClick={() => fetchNotifications(true)}>
                    Refresh
                  </Button>
                  <Button variant="link" size="sm" disabled={sendingTestNotification} onClick={handleSendTestNotification}>
                    {sendingTestNotification ? 'Mengirim...' : 'Test'}
                  </Button>
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
                    {/* {roleId === 5 && ( */}
                    <Dropdown.Item as={Link} to="/setting" className="sm-account-item">
                      <span className="sm-account-item-icon">
                        <i className="ti ti-settings" />
                      </span>

                      <span>
                        <strong>Setting</strong>
                        <small>User, hak akses, dan TTD</small>
                      </span>
                    </Dropdown.Item>
                    {/* )} */}
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
