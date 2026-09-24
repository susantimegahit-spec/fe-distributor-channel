import MetricWidget from './MetricWidget';
import { count, logistics } from './widgetLoaders';
const load = async () => count(await logistics(), (s) => !['APPROVED', 'ORDER_APPROVED', 'RESCHEDULE_APPROVED'].includes(s));
export default function LogisticsPendingWidget() {
  return <MetricWidget title="Non Approved" moduleName="Logistics" icon="ti ti-clock" color="warning" loadValue={load} />;
}
