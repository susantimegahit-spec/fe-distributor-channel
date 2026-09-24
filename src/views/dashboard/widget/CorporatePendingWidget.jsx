import MetricWidget from './MetricWidget';
import { corporate, count } from './widgetLoaders';
const load = async () => count(await corporate(), (s) => s.includes('PENDING'));
export default function CorporatePendingWidget() {
  return <MetricWidget title="Pending Requests" moduleName="Corporate" icon="ti ti-clock" color="warning" loadValue={load} />;
}
