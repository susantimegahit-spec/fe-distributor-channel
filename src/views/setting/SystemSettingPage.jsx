import { lazy, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import Col from 'react-bootstrap/Col';
import Collapse from 'react-bootstrap/Collapse';
import Nav from 'react-bootstrap/Nav';
import Row from 'react-bootstrap/Row';
import Stack from 'react-bootstrap/Stack';

import MainCard from 'components/MainCard';
import Loadable from 'components/Loadable';
import { masterDataModules } from '../../systems/masterData';
import { getThemePreference, saveThemePreference } from '../../utils/themePreference';
import UserList from './users/UserList';
import PermissionList from './permission/PermissionList';
import CronJobList from './cronjob/CronJobList';
import NotificationSettings from './notification/NotificationSettings';
import './system-setting-page.scss';

const MasterDistributor = Loadable(lazy(() => import('views/customer-portal/master/MasterDistributor')));
const MasterProduct = Loadable(lazy(() => import('views/customer-portal/master/MasterProduct')));
const DepartmentList = Loadable(lazy(() => import('views/setting/department/DepartmentList')));
const MasterOrigin = Loadable(lazy(() => import('views/logistics/master/MasterOrigin')));
const MasterDestination = Loadable(lazy(() => import('views/logistics/master/MasterDestination')));
const Rates = Loadable(lazy(() => import('views/logistics/master/Rates')));
const MasterLeadTime = Loadable(lazy(() => import('views/logistics/master/MasterLeadTime')));
const Material = Loadable(lazy(() => import('views/production/master/material/Material')));
const Resource = Loadable(lazy(() => import('views/production/master/resource/Resource')));
const Warehouse = Loadable(lazy(() => import('views/production/master/warehouse/Warehouse')));
const VendorRegistrations = Loadable(lazy(() => import('views/vendor-management/VendorRegistrations')));

const masterDataComponents = {
  'master-distributor': MasterDistributor,
  'master-product': MasterProduct,
  'enterprise-master-data-department': DepartmentList,
  'logistics-origin': MasterOrigin,
  'logistics-destination': MasterDestination,
  'logistics-rates': Rates,
  'logistics-lead-time': MasterLeadTime,
  'production-material': Material,
  'production-resource': Resource,
  'production-warehouse': Warehouse,
  'vendor-list': VendorRegistrations
};

const menus = [
  { key: 'users', title: 'Users', icon: 'ti ti-users' },
  { key: 'roles', title: 'Roles', icon: 'ti ti-shield-lock' },
  { key: 'master-data', title: 'Master Data', icon: 'ti ti-database' },
  { key: 'personalize', title: 'Personalize', icon: 'ti ti-palette' },
  { key: 'automation', title: 'Automation', icon: 'ti ti-alarm' },
  { key: 'notifications', title: 'Notifications', icon: 'ti ti-bell-cog' }
];

function PersonalizeSettings() {
  const [theme, setTheme] = useState(getThemePreference);
  const [switchingTheme, setSwitchingTheme] = useState('');
  const switchTimerRef = useRef(null);

  useEffect(
    () => () => {
      if (switchTimerRef.current) window.clearTimeout(switchTimerRef.current);
    },
    []
  );

  const selectTheme = (nextTheme) => {
    if (nextTheme === theme || switchingTheme) return;
    setSwitchingTheme(nextTheme);
    switchTimerRef.current = window.setTimeout(() => {
      setTheme(saveThemePreference(nextTheme));
      switchTimerRef.current = window.setTimeout(() => setSwitchingTheme(''), 450);
    }, 300);
  };

  return (
    <MainCard title="Personalize" subheader="Choose the appearance used across the application.">
      <div className="system-setting-theme-options">
        <button type="button" disabled={Boolean(switchingTheme)} className={theme === 'light' ? 'active' : ''} onClick={() => selectTheme('light')}>
          <span className="system-setting-theme-preview is-light"><i className="ti ti-sun" /></span>
          <span><strong>Light Mode</strong><small>Bright and clean appearance</small></span>
          <i className={`ti ${theme === 'light' ? 'ti-circle-check-filled' : 'ti-circle'}`} />
        </button>
        <button type="button" disabled={Boolean(switchingTheme)} className={theme === 'dark' ? 'active' : ''} onClick={() => selectTheme('dark')}>
          <span className="system-setting-theme-preview is-dark"><i className="ti ti-moon" /></span>
          <span><strong>Dark Mode</strong><small>Comfortable appearance in low light</small></span>
          <i className={`ti ${theme === 'dark' ? 'ti-circle-check-filled' : 'ti-circle'}`} />
        </button>
      </div>
      {switchingTheme ? (
        <div className="system-setting-theme-loader" role="status" aria-live="polite">
          <div className="system-setting-theme-loader-card">
            <span className="system-setting-theme-loader-icon"><i className="ti ti-loader-2" /></span>
            <div>
              <strong>Initializing {switchingTheme === 'dark' ? 'Dark' : 'Light'} Mode</strong>
              <small>Applying colors and interface preferences...</small>
            </div>
          </div>
        </div>
      ) : null}
    </MainCard>
  );
}

function MasterDataContent({ moduleKey, masterItem }) {
  const navigate = useNavigate();
  const selectedModule = masterDataModules.find((module) => module.key === moduleKey);

  if (!selectedModule) {
    return (
      <MainCard title="Master Data" subheader="Select a module from the sidebar to manage its master data.">
        <div className="system-setting-module-grid">
          {masterDataModules.map((module) => (
            <button
              type="button"
              className="system-setting-module-card"
              key={module.key}
              onClick={() => navigate(`/system-setting/master-data/${module.key}`)}
            >
              <span><i className={module.icon} /></span>
              <strong>{module.title}</strong>
              <i className="ti ti-chevron-right" />
            </button>
          ))}
        </div>
      </MainCard>
    );
  }

  const masterItems = selectedModule.items;
  const selectedItem = masterItems.find((item) => item.id === masterItem);
  const ActiveMasterComponent = selectedItem ? masterDataComponents[selectedItem.id] : null;

  if (ActiveMasterComponent) {
    return selectedItem.id === 'vendor-list' ? (
      <VendorRegistrations approvedOnly title="Vendors" subheader="Browse approved vendors." />
    ) : (
      <ActiveMasterComponent />
    );
  }

  return (
    <MainCard title={`${selectedModule.title} Master Data`} subheader="Select a master menu to open its management page.">
      <div className="system-setting-master-list">
        {masterItems.length ? (
          masterItems.map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => navigate(`/system-setting/master-data/${selectedModule.key}/${item.id}`)}
            >
              <span><i className={item.icon || 'ti ti-database'} /></span>
              <strong>{item.title}</strong>
              <i className="ti ti-arrow-up-right" />
            </button>
          ))
        ) : (
          <div className="system-setting-empty-master">No master data menu is registered for this module.</div>
        )}
      </div>
    </MainCard>
  );
}

export default function SystemSettingPage() {
  const navigate = useNavigate();
  const { activeMenu, moduleKey, masterItem } = useParams();
  const selectedMenu = menus.some((menu) => menu.key === activeMenu) ? activeMenu : 'users';
  const [masterOpen, setMasterOpen] = useState(selectedMenu === 'master-data');

  useEffect(() => {
    if (activeMenu !== selectedMenu) navigate(`/system-setting/${selectedMenu}`, { replace: true });
  }, [activeMenu, navigate, selectedMenu]);

  useEffect(() => {
    if (selectedMenu === 'master-data') setMasterOpen(true);
  }, [selectedMenu]);

  const content = useMemo(() => {
    switch (selectedMenu) {
      case 'roles':
        return <PermissionList />;
      case 'master-data':
        return <MasterDataContent moduleKey={moduleKey} masterItem={masterItem} />;
      case 'personalize':
        return <PersonalizeSettings />;
      case 'automation':
        return <CronJobList />;
      case 'notifications':
        return <NotificationSettings />;
      case 'users':
      default:
        return <UserList />;
    }
  }, [masterItem, moduleKey, selectedMenu]);

  return (
    <Stack gap={3} className="system-setting-page">
      <MainCard className="system-setting-header-card" bodyClassName="system-setting-header">
        <div>
          <span className="system-setting-eyebrow">ADMINISTRATOR</span>
          <h3 className="mb-1">System Setting</h3>
          <p className="text-muted mb-0">Manage users, access, master data, automation, and system notifications.</p>
        </div>
        <span className="system-setting-header-icon" aria-hidden="true">
          <i className="ti ti-settings" />
        </span>
      </MainCard>

      <Row className="g-3 align-items-start">
        <Col lg={3} xl={2}>
          <MainCard className="system-setting-sidebar-card" bodyClassName="system-setting-sidebar-body">
            <Nav
              activeKey={selectedMenu}
              onSelect={(key) => key && navigate(`/system-setting/${key}`)}
              className="system-setting-sidebar flex-column"
              aria-label="System setting navigation"
            >
              {menus.map((menu) =>
                menu.key === 'master-data' ? (
                  <div className="system-setting-sidebar-section" key={menu.key}>
                    <button
                      type="button"
                      className={`system-setting-sidebar-link ${selectedMenu === menu.key ? 'active' : ''}`}
                      onClick={() => {
                        setMasterOpen((current) => !current);
                        navigate('/system-setting/master-data');
                      }}
                      aria-expanded={masterOpen}
                    >
                      <span className="system-setting-sidebar-icon"><i className={menu.icon} /></span>
                      <span className="system-setting-sidebar-copy">{menu.title}</span>
                      <i className={`ti ti-chevron-${masterOpen ? 'down' : 'right'} system-setting-sidebar-arrow`} />
                    </button>
                    <Collapse in={masterOpen}>
                      <div className="system-setting-master-submenu">
                        {masterDataModules.map((module) => {
                          const isModuleOpen = moduleKey === module.key;
                          return (
                            <div className={`system-setting-master-module ${isModuleOpen ? 'is-open' : ''}`} key={module.key}>
                              <button
                                type="button"
                                className={`system-setting-master-module-button ${isModuleOpen ? 'active' : ''}`}
                                onClick={() => navigate(`/system-setting/master-data/${module.key}`)}
                                aria-expanded={isModuleOpen}
                              >
                                <i className={module.icon} />
                                <span>{module.title}</span>
                                <i className={`ti ti-chevron-${isModuleOpen ? 'down' : 'right'} system-setting-module-arrow`} />
                              </button>
                              <Collapse in={isModuleOpen}>
                                <div className="system-setting-master-items">
                                  {module.items.map((item) => (
                                    <button
                                      type="button"
                                      className={masterItem === item.id ? 'active' : ''}
                                      key={item.id}
                                      onClick={() => navigate(`/system-setting/master-data/${module.key}/${item.id}`)}
                                    >
                                      <i className={item.icon || 'ti ti-database'} />
                                      <span>{item.title}</span>
                                    </button>
                                  ))}
                                </div>
                              </Collapse>
                            </div>
                          );
                        })}
                      </div>
                    </Collapse>
                  </div>
                ) : (
                  <Nav.Link key={menu.key} eventKey={menu.key} className="system-setting-sidebar-link">
                    <span className="system-setting-sidebar-icon"><i className={menu.icon} /></span>
                    <span className="system-setting-sidebar-copy">{menu.title}</span>
                    <i className="ti ti-chevron-right system-setting-sidebar-arrow" aria-hidden="true" />
                  </Nav.Link>
                )
              )}
            </Nav>
          </MainCard>
        </Col>
        <Col lg={9} xl={10} className="system-setting-content">
          {content}
        </Col>
      </Row>
    </Stack>
  );
}
