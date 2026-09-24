import PropTypes from 'prop-types';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import Spinner from 'react-bootstrap/Spinner';
import Stack from 'react-bootstrap/Stack';

import MainCard from 'components/MainCard';
import { formatMetric } from './widgetUtils';

export default function WidgetShell({ title, subtitle, icon, color, loading, error, metrics, onOpen }) {
  return (
    <MainCard
      className="h-100 sm-dashboard-widget"
      title={
        <Stack direction="horizontal" className="justify-content-between align-items-start" gap={3}>
          <Stack direction="horizontal" gap={2}>
            <span className={`avtar avtar-s bg-light-${color} text-${color}`}>
              <i className={icon} />
            </span>
            <span>
              <h5 className="mb-0">{title}</h5>
              <small className="text-muted">{subtitle}</small>
            </span>
          </Stack>
          <button type="button" className="sm-widget-open" onClick={onOpen} aria-label={`Open ${title}`}>
            <i className="ti ti-arrow-up-right" />
          </button>
        </Stack>
      }
    >
      {loading ? (
        <div className="sm-widget-state">
          <Spinner size="sm" />
          <span>Loading widget...</span>
        </div>
      ) : error ? (
        <div className="sm-widget-state text-danger">{error}</div>
      ) : (
        <Row className="g-2">
          {metrics.map((metric) => (
            <Col xs={6} md={metrics.length > 2 ? 3 : 6} key={metric.label}>
              <Card className="sm-widget-metric h-100 mb-0">
                <Card.Body>
                  <span>{metric.label}</span>
                  <strong>{metric.formatter ? metric.formatter(metric.value) : formatMetric(metric.value)}</strong>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </MainCard>
  );
}

WidgetShell.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string.isRequired,
  icon: PropTypes.string.isRequired,
  color: PropTypes.string.isRequired,
  loading: PropTypes.bool,
  error: PropTypes.string,
  metrics: PropTypes.arrayOf(PropTypes.object).isRequired,
  onOpen: PropTypes.func.isRequired
};
