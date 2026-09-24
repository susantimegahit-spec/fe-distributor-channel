import { useEffect, useMemo, useState } from 'react';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import MainCard from 'components/MainCard';
import { isAdministratorRole } from '../../systems';
import { getCookies } from '../../utils/cookies';
import DashboardBuilder, { readLayout } from './DashboardBuilder';
import { widgetRegistry } from './widget';
export default function Dashboard() {
  const roleId = String(getCookies('role') || '');
  const isAdministrator = isAdministratorRole(roleId);
  const [layout, setLayout] = useState(() => readLayout(roleId));
  const [showBuilder, setShowBuilder] = useState(false);
  useEffect(() => {
    const update = (e) => {
      if (String(e.detail?.roleId) === roleId) setLayout(readLayout(roleId));
    };
    window.addEventListener('dashboard-layout-updated', update);
    return () => window.removeEventListener('dashboard-layout-updated', update);
  }, [roleId]);
  const widgets = useMemo(() => layout.map((id) => widgetRegistry.find((w) => w.id === id)).filter(Boolean), [layout]);
  return (
    <div className="sm-global-dashboard">
      {widgets.length ? (
        <Row className="g-3">
          {widgets.map((w) => {
            const Widget = w.component;
            return (
              <Col xs={12} md={6} xl={4} key={w.id}>
                <Widget />
              </Col>
            );
          })}
        </Row>
      ) : (
        <MainCard>
          <div className="sm-global-dashboard-empty">
            <span>
              <i className="ti ti-layout-dashboard" />
            </span>
            <h4>Dashboard belum diatur</h4>
            <p>
              {isAdministrator
                ? 'Gunakan tombol pengaturan untuk menambahkan widget.'
                : 'Administrator belum menambahkan widget untuk role Anda.'}
            </p>
          </div>
        </MainCard>
      )}
      {isAdministrator && (
        <button type="button" className="sm-dashboard-builder-fab" onClick={() => setShowBuilder(true)}>
          <i className="ti ti-adjustments-horizontal" />
          <span>Setting Dashboard</span>
        </button>
      )}
      {isAdministrator && (
        <DashboardBuilder
          show={showBuilder}
          onClose={() => setShowBuilder(false)}
          roleId={roleId}
          onSaved={(target) => {
            if (String(target) === roleId) setLayout(readLayout(roleId));
          }}
        />
      )}
    </div>
  );
}
