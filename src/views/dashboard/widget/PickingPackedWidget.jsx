import MetricWidget from './MetricWidget';
import { count, picking } from './widgetLoaders';
const load = async () => count(await picking(), (s) => s === 'PACKED');
export default function PickingPackedWidget() {
  return <MetricWidget title="Packed" moduleName="Picking List" icon="ti ti-package-export" color="success" loadValue={load} />;
}
