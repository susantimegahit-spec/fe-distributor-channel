import MetricWidget from './MetricWidget';
import { pickingTotal } from './widgetLoaders';
export default function PickingTotalWidget() {
  return (
    <MetricWidget title="Total Tasks" moduleName="Picking List" icon="ti ti-clipboard-list" color="primary" loadValue={pickingTotal} />
  );
}
