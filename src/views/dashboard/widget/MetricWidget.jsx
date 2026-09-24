import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import Card from 'react-bootstrap/Card';
import Spinner from 'react-bootstrap/Spinner';
import { formatMetric } from './widgetUtils';

export default function MetricWidget({ title, moduleName, icon, color, loadValue }) {
  const [state, setState] = useState({ loading: true, value: 0, error: '' });
  useEffect(() => {
    let active = true;
    Promise.resolve(loadValue())
      .then((value) => active && setState({ loading: false, value, error: '' }))
      .catch((error) => active && setState({ loading: false, value: 0, error: error?.message || 'Data gagal dimuat' }));
    return () => {
      active = false;
    };
  }, [loadValue]);
  return (
    <Card className="sm-dashboard-metric-widget h-100 mb-0">
      <Card.Body>
        <div className="sm-dashboard-metric-head">
          <span className={`sm-dashboard-metric-icon bg-light-${color} text-${color}`}>
            <i className={icon} />
          </span>
          <span>{moduleName}</span>
        </div>
        <small>{title}</small>
        {state.loading ? (
          <Spinner size="sm" />
        ) : state.error ? (
          <em className="text-danger">{state.error}</em>
        ) : (
          <strong>{formatMetric(state.value)}</strong>
        )}
      </Card.Body>
    </Card>
  );
}
MetricWidget.propTypes = {
  title: PropTypes.string.isRequired,
  moduleName: PropTypes.string.isRequired,
  icon: PropTypes.string.isRequired,
  color: PropTypes.string.isRequired,
  loadValue: PropTypes.func.isRequired
};
