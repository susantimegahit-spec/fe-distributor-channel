import PropTypes from 'prop-types';
import Card from 'react-bootstrap/Card';

import MainCard from 'components/MainCard';
import RecruitmentCandidate from './RecruitmentCandidate';

const pageConfig = {
  vacancy: {
    title: 'Vacancy',
    description: 'Kelola lowongan kerja dan kebutuhan posisi perusahaan.',
    icon: 'ti ti-briefcase',
    menuKey: 'enterprise-hrd-recruitment-vacancy'
  },
  candidate: {
    title: 'Candidate',
    description: 'Kelola kandidat dan pantau proses seleksi rekrutmen.',
    icon: 'ti ti-users',
    menuKey: 'enterprise-hrd-recruitment-candidate'
  }
};

export default function Recruitment({ type }) {
  if (type === 'candidate') return <RecruitmentCandidate />;

  const page = pageConfig[type] || pageConfig.vacancy;

  return (
    <MainCard title={page.title} data-permission-action="view" data-permission-menu-key={page.menuKey}>
      <Card className="border mb-0">
        <Card.Body className="py-5 text-center">
          <span className="d-inline-flex align-items-center justify-content-center rounded-circle bg-light-primary text-primary p-3 mb-3">
            <i className={`${page.icon} f-28`} />
          </span>
          <h4 className="mb-2">{page.title}</h4>
          <p className="text-muted mb-0">{page.description}</p>
        </Card.Body>
      </Card>
    </MainCard>
  );
}

Recruitment.propTypes = {
  type: PropTypes.oneOf(['vacancy', 'candidate']).isRequired
};
