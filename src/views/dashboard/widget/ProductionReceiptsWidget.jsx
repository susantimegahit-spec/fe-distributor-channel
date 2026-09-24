import MetricWidget from './MetricWidget';
import { productionResource } from './widgetLoaders';
const load = () => productionResource('receipts');
export default function ProductionReceiptsWidget() {
  return <MetricWidget title="Production Receipts" moduleName="Production" icon="ti ti-package-import" color="success" loadValue={load} />;
}
