import MetricWidget from './MetricWidget';
import { logisticsTotal } from './widgetLoaders';
export default function LogisticsOrdersWidget() {
  return (
    <MetricWidget title="Orders Ready" moduleName="Logistics" icon="ti ti-truck-delivery" color="primary" loadValue={logisticsTotal} />
  );
}
