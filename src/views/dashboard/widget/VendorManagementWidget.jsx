import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import VendorManagementServices from 'services/vendor-management/VendorManagementServices';
import WidgetShell from './WidgetShell';
import { getRows, getTotal } from './widgetUtils';

export default function VendorManagementWidget() {
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, error: '', metrics: [] });

  useEffect(() => {
    let active = true;
    VendorManagementServices.getVendorRegister({ page: 1, per_page: 100 })
      .then((response) => {
        const rows = getRows(response, ['registrations']);
        const status = (item) => String(item.status || item.registration_status || '').toUpperCase();
        if (!active) return;
        setState({
          loading: false,
          error: '',
          metrics: [
            { label: 'Registrations', value: getTotal(response, rows) },
            { label: 'Pending', value: rows.filter((item) => status(item).includes('PENDING')).length },
            { label: 'Approved', value: rows.filter((item) => status(item).includes('APPROV')).length }
          ]
        });
      })
      .catch((error) => active && setState({ loading: false, error: error.message || 'Unable to load vendors', metrics: [] }));
    return () => {
      active = false;
    };
  }, []);

  return (
    <WidgetShell
      title="Vendor Management"
      subtitle="Vendor registrations"
      icon="ti ti-building-store"
      color="info"
      {...state}
      onOpen={() => navigate('/vendor-management/dashboard')}
    />
  );
}
