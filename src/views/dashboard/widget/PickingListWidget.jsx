import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import LogisticsServices from 'services/logistics/LogisticsServices';
import WidgetShell from './WidgetShell';
import { getRows, getTotal } from './widgetUtils';

export default function PickingListWidget() {
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, error: '', metrics: [] });

  useEffect(() => {
    let active = true;
    LogisticsServices.getPicklist({ per_page: 100, page: 1 })
      .then((response) => {
        const rows = getRows(response, ['picklists']);
        const status = (item) => String(item.status || item.picklist_status || '').toUpperCase();
        if (!active) return;
        setState({
          loading: false,
          error: '',
          metrics: [
            { label: 'Picklists', value: getTotal(response, rows) },
            { label: 'Open', value: rows.filter((item) => ['OPEN', 'READY'].includes(status(item))).length },
            { label: 'Packed', value: rows.filter((item) => status(item) === 'PACKED').length }
          ]
        });
      })
      .catch((error) => active && setState({ loading: false, error: error.message || 'Unable to load picklists', metrics: [] }));
    return () => {
      active = false;
    };
  }, []);

  return (
    <WidgetShell
      title="Picking List"
      subtitle="Warehouse fulfillment"
      icon="ti ti-clipboard-list"
      color="success"
      {...state}
      onOpen={() => navigate('/picking-list/master/picking-list')}
    />
  );
}
