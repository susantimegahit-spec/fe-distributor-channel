import PropTypes from 'prop-types';

// react-bootstrap
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Stack from 'react-bootstrap/Stack';

// project-imports
import MainCard from 'components/MainCard';

export default function ProductionModulePage({
  title,
  description,
  icon,
  actionLabel,
  actionVariant = 'primary',
  actionDisabled = true,
  onAction
}) {
  return (
    <MainCard
      title={
        <Stack gap={1}>
          <h5 className="mb-0">{title}</h5>
          <span className="text-muted f-12">{description}</span>
        </Stack>
      }
      secondary={
        <Button variant={actionVariant} disabled={actionDisabled} onClick={onAction}>
          <i className="ti ti-plus me-1" />
          {actionLabel || `Add ${title}`}
        </Button>
      }
    >
      <Card className="border border-dashed mb-0">
        <Card.Body className="text-center py-5">
          <span className="avtar avtar-xl bg-light-primary text-primary mb-3">
            <i className={`${icon} f-32`} />
          </span>
          <h5 className="mb-2">No {title.toLowerCase()} data yet</h5>
          <p className="text-muted mb-0">This module is ready for data and API integration.</p>
        </Card.Body>
      </Card>
    </MainCard>
  );
}

ProductionModulePage.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  icon: PropTypes.string.isRequired,
  actionLabel: PropTypes.string,
  actionVariant: PropTypes.string,
  actionDisabled: PropTypes.bool,
  onAction: PropTypes.func
};
