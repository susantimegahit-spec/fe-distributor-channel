import MetricWidget from './MetricWidget';
import { count, picking } from './widgetLoaders';
const load = async () => count(await picking(), (s) => ['PICKING', 'IN_PROGRESS'].includes(s));
export default function PickingProgressWidget() {
  return <MetricWidget title="Picking" moduleName="Picking List" icon="ti ti-package" color="warning" loadValue={load} />;
}
