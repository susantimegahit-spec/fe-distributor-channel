import MetricWidget from './MetricWidget';
import { count, logistics } from './widgetLoaders';
const load = async () => count(await logistics(), (s) => ['APPROVED', 'ORDER_APPROVED', 'RESCHEDULE_APPROVED'].includes(s));
export default function LogisticsApprovedWidget() {
  return <MetricWidget title="Approved Orders" moduleName="Logistics" icon="ti ti-circle-check" color="success" loadValue={load} />;
}
