import MetricWidget from './MetricWidget';
import { productionResource } from './widgetLoaders';
const load = () => productionResource('issues');
export default function ProductionIssuesWidget() {
  return <MetricWidget title="Production Issues" moduleName="Production" icon="ti ti-package-export" color="danger" loadValue={load} />;
}
