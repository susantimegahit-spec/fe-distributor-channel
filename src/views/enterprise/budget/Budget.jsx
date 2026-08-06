import EnterpriseWorkspace from '../components/EnterpriseWorkspace';

const metrics = [
  { label: 'Total Budget', value: 'Rp0', variant: 'primary', icon: 'ti ti-wallet' },
  { label: 'Committed', value: 'Rp0', variant: 'warning', icon: 'ti ti-lock' },
  { label: 'Actual Usage', value: 'Rp0', variant: 'danger', icon: 'ti ti-cash' },
  { label: 'Available', value: 'Rp0', variant: 'success', icon: 'ti ti-pig-money' }
];

export default function Budget() {
  return (
    <EnterpriseWorkspace
      title="Budget"
      description="Plan departmental budgets and monitor commitments, realization, and available balances."
      icon="ti ti-calculator"
      actionLabel="New Budget"
      metrics={metrics}
      columns={['Budget Code', 'Fiscal Year', 'Department', 'Allocated', 'Committed', 'Actual', 'Available', 'Action']}
      emptyMessage="Budget plans will appear here after they are created."
    />
  );
}
