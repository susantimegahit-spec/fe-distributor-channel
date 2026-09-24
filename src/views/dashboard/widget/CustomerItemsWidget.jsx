import MetricWidget from './MetricWidget';
import { customer } from './widgetLoaders';
const load = () => customer(['total_item', 'total_items', 'item_count']);
export default function CustomerItemsWidget() {
  return <MetricWidget title="Total Items" moduleName="Customer Portal" icon="ti ti-package" color="info" loadValue={load} />;
}
