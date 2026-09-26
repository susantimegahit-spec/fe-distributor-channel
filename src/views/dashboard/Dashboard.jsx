import { useCallback, useEffect, useMemo, useState } from 'react';
import MainCard from 'components/MainCard';
import DashboardLayoutServices from 'services/setting/DashboardLayoutServices';
import { isAdministratorRole } from '../../systems';
import { getCookies } from '../../utils/cookies';
import { layoutKey, normalizeLayout, readLayout } from './DashboardBuilder';
import { widgetRegistry } from './widget';
export default function Dashboard() {
  const roleId = String(getCookies('role') || '');
  const isAdministrator = isAdministratorRole(roleId);
  const [layout, setLayout] = useState(() => readLayout(roleId));
  const loadDashboardLayout = useCallback(async () => {
    try {
      const response = await DashboardLayoutServices.getDashboardLayout();
      if (response?.data?.success === false) {
        throw new Error(response.data.message || 'Gagal mengambil layout dashboard.');
      }

      const responseLayout = response?.data?.data;
      if (!responseLayout || typeof responseLayout !== 'object') {
        throw new Error('Format layout dashboard tidak valid.');
      }

      const nextLayout = normalizeLayout(responseLayout);
      localStorage.setItem(layoutKey(roleId), JSON.stringify(nextLayout));
      setLayout(nextLayout);
    } catch (error) {
      console.error('[Dashboard] Failed to load dashboard-layouts/me, using cached layout:', error);
      setLayout(readLayout(roleId));
    }
  }, [roleId]);

  useEffect(() => {
    loadDashboardLayout();
  }, [loadDashboardLayout]);

  useEffect(() => {
    const refreshOnActivation = (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'dc:workspace-tab-activated' && event.data?.path === '/dashboard') {
        loadDashboardLayout();
      }
    };

    window.addEventListener('message', refreshOnActivation);
    return () => window.removeEventListener('message', refreshOnActivation);
  }, [loadDashboardLayout]);

  useEffect(() => {
    const update = (e) => {
      if (String(e.detail?.roleId) === roleId) setLayout(readLayout(roleId));
    };
    window.addEventListener('dashboard-layout-updated', update);
    return () => window.removeEventListener('dashboard-layout-updated', update);
  }, [roleId]);
  useEffect(() => {
    const syncLayoutFromBuilderTab = (event) => {
      if (event.key === layoutKey(roleId)) setLayout(readLayout(roleId));
    };
    window.addEventListener('storage', syncLayoutFromBuilderTab);
    return () => window.removeEventListener('storage', syncLayoutFromBuilderTab);
  }, [roleId]);
  const widgets = useMemo(
    () =>
      layout.widgets
        .map((item) => ({ ...item, definition: widgetRegistry.find((widget) => widget.id === item.id) }))
        .filter((item) => item.definition),
    [layout]
  );
  return (
    <div className="sm-global-dashboard">
      {widgets.length ? (
        <div className="sm-global-dashboard-rows">
          {layout.rows.map((row, rowIndex) => (
            <div
              className="sm-global-dashboard-grid"
              style={{ gridTemplateColumns: `repeat(${row.columns}, minmax(0, 1fr))` }}
              key={rowIndex}
            >
              {widgets
                .filter((item) => item.row === rowIndex + 1)
                .map((item) => {
                  const Widget = item.definition.component;
                  return (
                    <div style={{ gridColumn: `${item.column} / span ${item.span}` }} key={item.id}>
                      <Widget />
                    </div>
                  );
                })}
            </div>
          ))}
        </div>
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
        <button
          type="button"
          className="sm-dashboard-builder-fab"
          title="Setting Dashboard"
          aria-label="Buka Setting Dashboard"
          onClick={() => {
            const baseName = (import.meta.env.VITE_APP_BASE_NAME || '').replace(/\/$/, '');
            window.open(`${baseName}/dashboard-builder`, '_blank', 'noopener,noreferrer');
          }}
        >
          <i className="ti ti-adjustments-horizontal" />
        </button>
      )}
    </div>
  );
}
