import MetricWidget from './MetricWidget';
import { productionResource } from './widgetLoaders';
const load = () => productionResource('materials');
export default function ProductionMaterialsWidget() {
  return <MetricWidget title="Materials" moduleName="Production" icon="ti ti-box" color="info" loadValue={load} />;
}
