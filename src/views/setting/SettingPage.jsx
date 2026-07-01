import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { useNavigate, useParams } from 'react-router-dom';

// react-bootstrap
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Nav from 'react-bootstrap/Nav';
import Row from 'react-bootstrap/Row';
import Stack from 'react-bootstrap/Stack';

// project-imports
import MainCard from 'components/MainCard';
import { useAlert } from '../../utils/alertContext';
import { getCookies } from '../../utils/cookies';
import MasterSignature from '../master/MasterSignature';
import PermissionList from './permission/PermissionList';
import UserList from './users/UserList';
import CronJobList from './cronjob/CronJobList';

const adminRoleId = 5;
const generalSettingKey = 'dc-general-settings';

const tabs = [
  { key: 'users', title: 'Setting User', icon: 'ti ti-users' },
  // { key: 'general', title: 'Setting', icon: 'ti ti-settings' },
  { key: 'permissions', title: 'Hak Akses', icon: 'ti ti-shield-lock' },
  { key: 'signatures', title: 'Setting TTD User', icon: 'ti ti-signature' },
  { key: 'cronjobs', title: 'Setting Cron Job', icon: 'ti ti-alarm', adminOnly: true }
];

const canAccessTab = (tab, isAdministrator) => !tab.adminOnly || isAdministrator;

const defaultGeneralSettings = {
  appName: 'Distributor Channel',
  notificationEmail: '',
  timezone: 'Asia/Jakarta',
  language: 'id',
  approvalReminder: true,
  emailNotification: true
};

const readStorage = (key, fallback) => {
  try {
    const savedValue = localStorage.getItem(key);
    return savedValue ? JSON.parse(savedValue) : fallback;
  } catch (error) {
    return fallback;
  }
};

function GeneralSettings() {
  const { showAlert } = useAlert();
  const [settings, setSettings] = useState(() => readStorage(generalSettingKey, defaultGeneralSettings));

  const handleChange = (field, value) => {
    setSettings((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    try {
      localStorage.setItem(generalSettingKey, JSON.stringify(settings));
      showAlert('Setting berhasil disimpan', 'success');
    } catch (error) {
      showAlert('Gagal menyimpan setting', 'danger');
    }
  };

  return (
    <MainCard
      title={
        <Stack gap={1}>
          <h5 className="mb-0">Setting</h5>
          <span className="text-muted f-12">Kelola konfigurasi umum aplikasi distributor channel.</span>
        </Stack>
      }
    >
      <Form onSubmit={handleSubmit}>
        <Row className="g-3">
          <Col md={6}>
            <Form.Group controlId="settingAppName">
              <Form.Label className="fw-semibold">Nama Aplikasi</Form.Label>
              <Form.Control value={settings.appName} onChange={(event) => handleChange('appName', event.target.value)} />
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group controlId="settingEmail">
              <Form.Label className="fw-semibold">Email Notifikasi</Form.Label>
              <Form.Control
                type="email"
                placeholder="admin@example.com"
                value={settings.notificationEmail}
                onChange={(event) => handleChange('notificationEmail', event.target.value)}
              />
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group controlId="settingTimezone">
              <Form.Label className="fw-semibold">Timezone</Form.Label>
              <Form.Select value={settings.timezone} onChange={(event) => handleChange('timezone', event.target.value)}>
                <option value="Asia/Jakarta">Asia/Jakarta</option>
                <option value="Asia/Makassar">Asia/Makassar</option>
                <option value="Asia/Jayapura">Asia/Jayapura</option>
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group controlId="settingLanguage">
              <Form.Label className="fw-semibold">Bahasa</Form.Label>
              <Form.Select value={settings.language} onChange={(event) => handleChange('language', event.target.value)}>
                <option value="id">Indonesia</option>
                <option value="en">English</option>
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Check
              type="switch"
              id="settingApprovalReminder"
              label="Reminder approval order"
              checked={settings.approvalReminder}
              onChange={(event) => handleChange('approvalReminder', event.target.checked)}
            />
          </Col>
          <Col md={6}>
            <Form.Check
              type="switch"
              id="settingEmailNotification"
              label="Kirim notifikasi email"
              checked={settings.emailNotification}
              onChange={(event) => handleChange('emailNotification', event.target.checked)}
            />
          </Col>
        </Row>

        <Stack direction="horizontal" className="justify-content-end mt-4">
          <Button type="submit">
            <i className="ti ti-device-floppy me-1" />
            Simpan Setting
          </Button>
        </Stack>
      </Form>
    </MainCard>
  );
}

export default function SettingPage({ defaultTab = 'users' }) {
  const navigate = useNavigate();
  const { activeTab } = useParams();
  const roleId = getCookies('role');
  const isAdministrator = Number(roleId) === adminRoleId;
  const availableTabs = useMemo(() => {
    const roleTabs = isAdministrator ? tabs : tabs.filter((tab) => tab.key === 'signatures');

    return roleTabs.filter((tab) => canAccessTab(tab, isAdministrator));
  }, [isAdministrator]);
  const canAccessDefaultTab = tabs.some((tab) => tab.key === defaultTab && canAccessTab(tab, isAdministrator));
  const fallbackTab = isAdministrator && canAccessDefaultTab ? defaultTab : availableTabs[0]?.key || 'signatures';
  const selectedTab = availableTabs.some((tab) => tab.key === activeTab) ? activeTab : fallbackTab;

  useEffect(() => {
    if (activeTab && activeTab !== selectedTab) {
      navigate(`/setting/${selectedTab}`, { replace: true });
    }
  }, [activeTab, navigate, selectedTab]);

  const currentContent = useMemo(() => {
    if (!availableTabs.some((tab) => tab.key === selectedTab)) {
      return <MasterSignature />;
    }

    switch (selectedTab) {
      case 'general':
        return <GeneralSettings />;
      case 'permissions':
        return <PermissionList />;
      case 'signatures':
        return <MasterSignature />;
      case 'cronjobs':
        return <CronJobList />;
      case 'users':
      default:
        return <UserList />;
    }
  }, [availableTabs, selectedTab]);

  const handleSelect = (tabKey) => {
    if (!tabKey) return;
    navigate(`/setting/${tabKey}`);
  };

  return (
    <Stack gap={3}>
      <MainCard bodyClassName="py-2">
        <Nav variant="tabs" activeKey={selectedTab} onSelect={handleSelect} className="border-0">
          {availableTabs.map((tab) => (
            <Nav.Item key={tab.key}>
              <Nav.Link eventKey={tab.key} className="d-flex align-items-center gap-2">
                <i className={tab.icon} />
                {tab.title}
              </Nav.Link>
            </Nav.Item>
          ))}
        </Nav>
      </MainCard>
      {currentContent}
    </Stack>
  );
}

SettingPage.propTypes = {
  defaultTab: PropTypes.string
};
