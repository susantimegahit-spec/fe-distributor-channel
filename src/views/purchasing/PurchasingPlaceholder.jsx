import PropTypes from 'prop-types';

// react-bootstrap
import Card from 'react-bootstrap/Card';
import Stack from 'react-bootstrap/Stack';

// project-imports
import MainCard from 'components/MainCard';

export default function PurchasingPlaceholder({ title, description, icon }) {
  return (
    <MainCard
      title={
        <Stack gap={1}>
          <h5 className="mb-0">{title}</h5>
          <span className="text-muted f-12">{description}</span>
        </Stack>
      }
    >
      <Card className="border border-dashed mb-0">
        <Card.Body className="text-center py-5">
          <span className="avtar avtar-xl bg-light-primary text-primary mb-3">
            <i className={`${icon} f-32`} />
          </span>
          <h5 className="mb-2">{title}</h5>
          <p className="text-muted mb-0">This Purchasing module is ready for API and workflow integration.</p>
        </Card.Body>
      </Card>
    </MainCard>
  );
}

PurchasingPlaceholder.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  icon: PropTypes.string.isRequired
};
