import MetricWidget from './MetricWidget';
import { count, production } from './widgetLoaders';
const load = async () => count(await production(), (s) => ['COMPLETED', 'COMPLETE', 'CLOSED', 'CLOSE'].includes(s));
export default function ProductionCompletedWidget() {
  return <MetricWidget title="Completed" moduleName="Production" icon="ti ti-circle-check" color="success" loadValue={load} />;
}
