import React, { useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Cookies from 'js-cookie';
import { useDispatch } from 'react-redux';

// react-bootstrap
import Button from 'react-bootstrap/Button';
import Dropdown from 'react-bootstrap/Dropdown';
import Form from 'react-bootstrap/Form';
import Nav from 'react-bootstrap/Nav';
import Stack from 'react-bootstrap/Stack';

// project-imports
import SimpleBarScroll from 'components/third-party/SimpleBar';
import { handlerDrawerOpen, useGetMenuMaster } from 'api/menu';

import { getAssignedCustomerCodes, getCookies } from '../../utils/cookies';
import { Modal } from 'react-bootstrap';
import UserServices from '../../services/setting/UserServices';
import NotificationServices from '../../services/shared/NotificationServices';
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
import { destroyAuthState } from '../../redux/authReducer';
// =============================|| MAIN LAYOUT - HEADER ||============================== //

export default function Header({ showSidebar = true }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const dispatch = useDispatch();
  const { menuMaster } = useGetMenuMaster();
  const { showAlert } = useAlert();
  const drawerOpen = menuMaster?.isDashboardDrawerOpened;
  const userId = getCookies('id');
  const userName = getCookies('name');
  const userEmail = getCookies('email');
  const customerCodes = getAssignedCustomerCodes();
  const isMultiCustomer = customerCodes.length > 1;
  const userInitial = userName?.charAt(0)?.toUpperCase() || 'U';

  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [showChangePass, setShowChangePass] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [notificationError, setNotificationError] = useState('');
  const [sendingTestNotification, setSendingTestNotification] = useState(false);
  const notificationAudioContextRef = useRef(null);
  const accountMenuRef = useRef(null);
  const knownNotificationIdsRef = useRef(new Set());
  const hasLoadedNotificationsRef = useRef(false);
  const canSubmitPassword = Boolean(oldPass && newPass && confirmPass && newPass === confirmPass);
  const showBackButton =
    pathname === '/notifications' ||
    pathname === '/setting' ||
    pathname.startsWith('/setting/') ||
    pathname.startsWith('/customer-portal/setting');
  const isSettingPage = pathname === '/setting' || pathname.startsWith('/setting/') || pathname.startsWith('/customer-portal/setting');

  useEffect(() => {
    if (!showAccountMenu) return undefined;

    const closeAccountMenu = (event) => {
      if (!accountMenuRef.current?.contains(event.target)) setShowAccountMenu(false);
    };

    document.addEventListener('pointerdown', closeAccountMenu, true);
    return () => document.removeEventListener('pointerdown', closeAccountMenu, true);
  }, [showAccountMenu]);

  const handleHeaderBack = () => {
    if (isSettingPage) {
      navigate('/customer-portal/dashboard');
      return;
    }

    navigate(-1);
  };

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
        setNotificationError('Notifications could not be loaded.');
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
        window.sessionStorage.setItem('sm-orders-refresh-pending', 'true');
        window.dispatchEvent(new CustomEvent('sm:orders-refresh-needed'));
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

      // Show the notification popup in real time
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
      Cookies.remove('actions');
      Cookies.remove('systems');
      Cookies.remove('system');
      Cookies.remove('expedition_code');
      Cookies.remove('whs_code');
      Cookies.remove('ocr_code');
      Cookies.remove('ocr_code2');
      Cookies.remove('ocr_code3');
      Cookies.remove('units');
      Cookies.remove('organization_assignment');
      dispatch(destroyAuthState());
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
        message: 'Test notification sent successfully from the backend.'
      });
      const payload = getNotificationResponsePayload(response);

      if (payload?.id) {
        handleIncomingNotification(payload);
      } else {
        fetchNotifications(true);
      }

      showAlert('Test notification sent successfully', 'success');
    } catch (error) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to send test notification', 'danger');
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
        showAlert('Password changed successfully', 'success');
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
    <header className={`pc-header ${!showSidebar ? 'pc-header-no-sidebar' : ''}`}>
      <div className="header-wrapper">
        <div className="me-auto pc-mob-drp">
          <Nav className="list-unstyled">
            {showSidebar && (
              <>
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
                  <Nav.Link
                    as={Link}
                    to="#"
                    className="pc-head-link ms-0"
                    id="mobile-collapse"
                    onClick={() => handlerDrawerOpen(!drawerOpen)}
                  >
                    <i className="ph ph-list" />
                  </Nav.Link>
                </Nav.Item>
              </>
            )}

            {showBackButton && (
              <Nav.Item className="pc-h-item">
                <Button className="sm-page-back-button sm-header-back-button" onClick={handleHeaderBack}>
                  <i className="ti ti-arrow-left me-1" />
                  Back
                </Button>
              </Nav.Item>
            )}

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
                    <h5 className="m-0">Notifications</h5>
                    <small className="text-muted">{unreadCount > 0 ? `${unreadCount} unread` : 'All read'}</small>
                  </div>
                  <Button variant="link" size="sm" className="p-0 text-primary" disabled={!unreadCount} onClick={handleMarkAllAsRead}>
                    Mark as read
                  </Button>
                </Dropdown.Header>
                <SimpleBarScroll style={{ maxHeight: 'calc(100vh - 215px)' }}>
                  <div className="dropdown-body text-wrap position-relative">
                    {loadingNotifications && <div className="sm-notification-state">Loading notifications...</div>}

                    {!loadingNotifications && notificationError && (
                      <div className="sm-notification-state text-danger">{notificationError}</div>
                    )}

                    {!loadingNotifications && !notificationError && notifications.length === 0 && (
                      <div className="sm-notification-state">
                        <span className="sm-notification-empty-icon">
                          <i className="ph ph-bell-simple" />
                        </span>
                        <strong>No notifications yet</strong>
                        <small>Notifications from the backend will appear here.</small>
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
                    View all
                  </Button>
                  <Button variant="link" size="sm" onClick={() => fetchNotifications(true)}>
                    Refresh
                  </Button>
                  <Button variant="link" size="sm" disabled={sendingTestNotification} onClick={handleSendTestNotification}>
                    {sendingTestNotification ? 'Sending...' : 'Test'}
                  </Button>
                </div>
              </Dropdown.Menu>
            </Dropdown>
            <Dropdown
              ref={accountMenuRef}
              className="pc-h-item"
              align="end"
              show={showAccountMenu}
              onToggle={(isOpen) => setShowAccountMenu(isOpen)}
              onSelect={() => setShowAccountMenu(false)}
            >
              <Dropdown.Toggle
                className="pc-head-link sm-account-toggle arrow-none me-0"
                variant="link"
                id="user-profile-dropdown"
                aria-haspopup="true"
                aria-expanded={showAccountMenu}
              >
                <span className="sm-account-avatar">{userInitial}</span>
                <span className="sm-account-toggle-text">
                  <span>{userName || 'User'}</span>
                  <small>{isMultiCustomer ? `${customerCodes.length} Customers` : customerCodes[0] || 'Account'}</small>
                </span>
                <i className="ti ti-chevron-down" />
              </Dropdown.Toggle>

              <Dropdown.Menu className="dropdown-user-profile sm-account-menu pc-h-dropdown p-0">
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
                  <div className="profile-notification-scroll position-relative">
                    {/* {roleId === 5 && ( */}
                    <Dropdown.Item as={Link} to="/setting" className="sm-account-item">
                      <span className="sm-account-item-icon">
                        <i className="ti ti-settings" />
                      </span>

                      <span>
                        <strong>Setting</strong>
                        <small>Users, access rights, and signatures</small>
                      </span>
                    </Dropdown.Item>
                    {/* )} */}
                    <Dropdown.Item
                      as="button"
                      className="sm-account-item"
                      onClick={() => {
                        setShowAccountMenu(false);
                        setShowChangePass(true);
                      }}
                    >
                      <span className="sm-account-item-icon">
                        <i className="ph ph-lock-key" />
                      </span>
                      <span>
                        <strong>Change Password</strong>
                        <small>Update account security</small>
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
      <Modal
        show={showChangePass}
        centered
        onHide={closeChangePassword}
        dialogClassName="sm-change-password-dialog"
        contentClassName="sm-change-password-modal"
      >
        <Modal.Header closeButton className="sm-change-password-header">
          <Modal.Title className="sm-change-password-title">
            <span className="sm-change-password-title-icon">
              <i className="ph ph-lock-key" />
            </span>
            <span className="min-w-0">
              <span>Change Password</span>
              <small>Update your account security credentials.</small>
            </span>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="sm-change-password-body">
          <Stack gap={3}>
            <div className="sm-change-password-note">
              <i className="ti ti-shield-lock" />
              <span>Use a new password that is different from your current password.</span>
            </div>
            <div className="sm-change-password-control">
              <Form.Label className="f-12 text-muted">Old Password</Form.Label>
              <div className="sm-change-password-input">
                <span className="sm-change-password-input-icon">
                  <i className="ti ti-lock" />
                </span>
                <Form.Control
                  className="sm-change-password-input-control"
                  type={showOldPassword ? 'text' : 'password'}
                  placeholder="Enter old password"
                  value={oldPass}
                  onChange={(e) => setOldPass(e.target.value)}
                />
                <Button type="button" variant="link" className="sm-change-password-visibility" onClick={toggleOldPass}>
                  {showOldPassword ? <i className="ti ti-eye" /> : <i className="ti ti-eye-off" />}
                </Button>
              </div>
            </div>
            <div className="sm-change-password-control">
              <Form.Label className="f-12 text-muted">New Password</Form.Label>
              <div className="sm-change-password-input">
                <span className="sm-change-password-input-icon">
                  <i className="ti ti-key" />
                </span>
                <Form.Control
                  className="sm-change-password-input-control"
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="Enter new password"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                />
                <Button type="button" variant="link" className="sm-change-password-visibility" onClick={toggleNewPass}>
                  {showNewPassword ? <i className="ti ti-eye" /> : <i className="ti ti-eye-off" />}
                </Button>
              </div>
            </div>
            <div className="sm-change-password-control">
              <Form.Label className="f-12 text-muted">Confirm Password</Form.Label>
              <div className={`sm-change-password-input ${confirmPass && newPass !== confirmPass ? 'is-invalid' : ''}`}>
                <span className="sm-change-password-input-icon">
                  <i className="ti ti-checkup-list" />
                </span>
                <Form.Control
                  className="sm-change-password-input-control"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Repeat new password"
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                />
                <Button type="button" variant="link" className="sm-change-password-visibility" onClick={toggleConfirmPass}>
                  {showConfirmPassword ? <i className="ti ti-eye" /> : <i className="ti ti-eye-off" />}
                </Button>
              </div>
              {confirmPass && newPass !== confirmPass ? (
                <div className="sm-change-password-feedback">Password confirmation does not match.</div>
              ) : null}
            </div>
          </Stack>
        </Modal.Body>
        <Modal.Footer className="sm-change-password-footer">
          <Button variant="danger" onClick={closeChangePassword}>
            Cancel
          </Button>
          <Button
            variant="primary"
            className="sm-change-password-submit"
            onClick={() => handleChangePassword()}
            disabled={loadingSubmit || !canSubmitPassword}
          >
            {loadingSubmit ? <LoaderButton /> : 'Save'}
          </Button>
        </Modal.Footer>
      </Modal>
    </header>
  );
}

Header.propTypes = {
  showSidebar: PropTypes.bool
};
