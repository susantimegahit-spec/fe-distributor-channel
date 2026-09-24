import MetricWidget from './MetricWidget';
import { production } from './widgetLoaders';
const load = async () => (await production()).length;
export default function ProductionOrdersWidget() {
  return <MetricWidget title="Production Orders" moduleName="Production" icon="ti ti-clipboard-text" color="primary" loadValue={load} />;
}
