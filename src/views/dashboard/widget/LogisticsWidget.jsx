import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import LogisticsServices from 'services/logistics/LogisticsServices';
import WidgetShell from './WidgetShell';
import { getRows, getTotal } from './widgetUtils';

export default function LogisticsWidget() {
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, error: '', metrics: [] });

  useEffect(() => {
    let active = true;
    LogisticsServices.getLogisticOrders({ per_page: 100, page: 1 })
      .then((response) => {
        const rows = getRows(response, ['orders']);
        const status = (item) => String(item.logistic_status || item.status || '').toUpperCase();
        if (!active) return;
        setState({
          loading: false,
          error: '',
          metrics: [
            { label: 'Orders', value: getTotal(response, rows) },
            { label: 'Approved', value: rows.filter((item) => ['APPROVED', 'RESCHEDULE_APPROVED'].includes(status(item))).length },
            { label: 'Pending', value: rows.filter((item) => !['APPROVED', 'RESCHEDULE_APPROVED'].includes(status(item))).length }
          ]
        });
      })
      .catch((error) => active && setState({ loading: false, error: error.message || 'Unable to load logistics data', metrics: [] }));
    return () => {
      active = false;
    };
  }, []);

  return (
    <WidgetShell
      title="Logistics"
      subtitle="Orders ready for packing"
      icon="ti ti-truck-delivery"
      color="warning"
      {...state}
      onOpen={() => navigate('/logistics/dashboard')}
    />
  );
}
