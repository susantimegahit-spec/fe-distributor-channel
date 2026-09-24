import MetricWidget from './MetricWidget';
import { corporate, count } from './widgetLoaders';
const load = async () => count(await corporate(), (s) => s.includes('APPROV'));
export default function CorporateApprovedWidget() {
  return <MetricWidget title="Approved Requests" moduleName="Corporate" icon="ti ti-circle-check" color="success" loadValue={load} />;
}
