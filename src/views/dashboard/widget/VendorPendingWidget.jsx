import MetricWidget from './MetricWidget';
import { count, vendors } from './widgetLoaders';
const load = async () => count(await vendors(), (s) => s.includes('PENDING'));
export default function VendorPendingWidget() {
  return <MetricWidget title="Pending Vendors" moduleName="Vendor Management" icon="ti ti-clock" color="warning" loadValue={load} />;
}
