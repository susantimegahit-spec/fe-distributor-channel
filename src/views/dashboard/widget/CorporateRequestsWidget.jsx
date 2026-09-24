import MetricWidget from './MetricWidget';
import { corporate } from './widgetLoaders';
const load = async () => (await corporate()).length;
export default function CorporateRequestsWidget() {
  return <MetricWidget title="Purchase Requests" moduleName="Corporate" icon="ti ti-file-invoice" color="info" loadValue={load} />;
}
