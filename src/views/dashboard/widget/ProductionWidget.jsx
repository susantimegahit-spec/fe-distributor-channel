import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import MaterialServices from 'services/production/MaterialServices';
import ProductionServices from 'services/production/ProductionServices';
import WidgetShell from './WidgetShell';
import { getRows } from './widgetUtils';

const inputDate = (date) => date.toISOString().slice(0, 10);

export default function ProductionWidget() {
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, error: '', metrics: [] });

  useEffect(() => {
    let active = true;
    const now = new Date();
    const from = new Date(now);
    from.setDate(now.getDate() - 7);
    Promise.allSettled([
      ProductionServices.getListOrderSap({ from: inputDate(from), to: inputDate(now) }),
      ProductionServices.getReceipt({ from: inputDate(from), to: inputDate(now) }),
      ProductionServices.getIssueProduction({ from: inputDate(from), to: inputDate(now) }),
      MaterialServices.getMaterial('')
    ]).then((results) => {
      if (!active) return;
      const counts = results.map((result) =>
        result.status === 'fulfilled' ? getRows(result.value, ['orders', 'receipts', 'issues']).length : 0
      );
      setState({
        loading: false,
        error: results.every((result) => result.status === 'rejected') ? 'Unable to load production data' : '',
        metrics: [
          { label: 'Orders', value: counts[0] },
          { label: 'Receipts', value: counts[1] },
          { label: 'Issues', value: counts[2] },
          { label: 'Materials', value: counts[3] }
        ]
      });
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <WidgetShell
      title="Production"
      subtitle="Current production activity"
      icon="ti ti-building-factory-2"
      color="primary"
      {...state}
      onOpen={() => navigate('/corporate/production/order')}
    />
  );
}
