import MetricWidget from './MetricWidget';
import { count, vendors } from './widgetLoaders';
const load = async () => count(await vendors(), (s) => s.includes('APPROV'));
export default function VendorApprovedWidget() {
  return <MetricWidget title="Approved Vendors" moduleName="Vendor Management" icon="ti ti-user-check" color="success" loadValue={load} />;
}
