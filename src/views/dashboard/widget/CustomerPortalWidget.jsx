import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import DashboardServices from 'services/customer-portal/DashboardServices';
import { getCookies } from 'utils/cookies';
import WidgetShell from './WidgetShell';
import { findNumericValue, getPayload } from './widgetUtils';

export default function CustomerPortalWidget() {
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, error: '', metrics: [] });

  useEffect(() => {
    let active = true;
    const isDistributor = Number(getCookies('role')) !== 5;
    const request = isDistributor ? DashboardServices.getDistributorSummary() : DashboardServices.getAdminSummary();
    request
      .then((response) => {
        const payload = getPayload(response);
        if (!active) return;
        setState({
          loading: false,
          error: '',
          metrics: [
            { label: 'Revenue', value: findNumericValue(payload, ['total_revenue_this_month', 'total_revenue', 'revenue']) },
            { label: 'Orders', value: findNumericValue(payload, ['total_orders_this_month', 'total_orders', 'order_count']) },
            { label: 'Items', value: findNumericValue(payload, ['total_item', 'total_items', 'item_count']) }
          ]
        });
      })
      .catch((error) => active && setState({ loading: false, error: error.message || 'Unable to load sales summary', metrics: [] }));
    return () => {
      active = false;
    };
  }, []);

  return (
    <WidgetShell
      title="Customer Portal"
      subtitle="Sales order overview"
      icon="ti ti-building-store"
      color="primary"
      {...state}
      onOpen={() => navigate('/customer-portal/dashboard')}
    />
  );
}
