import { Badge } from '@raidguild/design-system';

const statusColorScheme = {
  PREPARING: 'yellow',
  RAIDING: 'green',
  SHIPPED: 'blue',
  LOST: 'orange',
  AWAITING: 'red',
};

const RaidStatusBadge = ({ status }: { status: any }) => (
  <Badge colorScheme={statusColorScheme[status]}>{status}</Badge>
);

export default RaidStatusBadge;
