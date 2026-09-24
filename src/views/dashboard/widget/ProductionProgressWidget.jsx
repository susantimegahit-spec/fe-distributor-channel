import MetricWidget from './MetricWidget';
import { count, production } from './widgetLoaders';
const load = async () => count(await production(), (s) => !['COMPLETED', 'COMPLETE', 'CLOSED', 'CLOSE'].includes(s));
export default function ProductionProgressWidget() {
  return <MetricWidget title="In Progress" moduleName="Production" icon="ti ti-settings-automation" color="warning" loadValue={load} />;
}
