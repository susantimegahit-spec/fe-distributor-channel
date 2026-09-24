import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import PurchasingServices from 'services/corporate/PurchasingServices';
import WidgetShell from './WidgetShell';
import { getRows } from './widgetUtils';

export default function CorporateWidget() {
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, error: '', metrics: [] });

  useEffect(() => {
    let active = true;
    PurchasingServices.getPurchasing()
      .then((response) => {
        const rows = getRows(response, ['requests']);
        const status = (value) => String(value?.status || value?.approval_status || '').toUpperCase();
        if (!active) return;
        setState({
          loading: false,
          error: '',
          metrics: [
            { label: 'Requests', value: rows.length },
            { label: 'Pending', value: rows.filter((item) => status(item).includes('PENDING')).length },
            { label: 'Approved', value: rows.filter((item) => status(item).includes('APPROV')).length }
          ]
        });
      })
      .catch((error) => active && setState({ loading: false, error: error.message || 'Unable to load purchasing data', metrics: [] }));
    return () => {
      active = false;
    };
  }, []);

  return (
    <WidgetShell
      title="Corporate"
      subtitle="Purchasing requests"
      icon="ti ti-building-skyscraper"
      color="info"
      {...state}
      onOpen={() => navigate('/corporate/purchasing/request')}
    />
  );
}
