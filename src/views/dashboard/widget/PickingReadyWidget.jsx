import MetricWidget from './MetricWidget';
import { count, picking } from './widgetLoaders';
const load = async () => count(await picking(), (s) => ['OPEN', 'READY'].includes(s));
export default function PickingReadyWidget() {
  return <MetricWidget title="Ready" moduleName="Picking List" icon="ti ti-list-check" color="info" loadValue={load} />;
}
