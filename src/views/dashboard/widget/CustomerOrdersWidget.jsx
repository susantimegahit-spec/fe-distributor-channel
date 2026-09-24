import MetricWidget from './MetricWidget';
import { customer } from './widgetLoaders';
const load = () => customer(['total_orders_this_month', 'total_orders', 'order_count']);
export default function CustomerOrdersWidget() {
  return <MetricWidget title="Total Orders" moduleName="Customer Portal" icon="ti ti-shopping-cart" color="primary" loadValue={load} />;
}
