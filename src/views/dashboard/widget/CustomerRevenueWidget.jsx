import MetricWidget from './MetricWidget';
import { customer } from './widgetLoaders';
const load = () => customer(['total_revenue_this_month', 'total_revenue', 'revenue']);
export default function CustomerRevenueWidget() {
  return <MetricWidget title="Revenue" moduleName="Customer Portal" icon="ti ti-cash" color="success" loadValue={load} />;
}
