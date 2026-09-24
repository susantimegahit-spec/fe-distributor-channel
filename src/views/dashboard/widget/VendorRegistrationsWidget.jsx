import MetricWidget from './MetricWidget';
import { vendors } from './widgetLoaders';
const load = async () => (await vendors()).length;
export default function VendorRegistrationsWidget() {
  return <MetricWidget title="Registrations" moduleName="Vendor Management" icon="ti ti-building-store" color="info" loadValue={load} />;
}
