import React from 'react';
import _ from 'lodash';
import { HStack, Button, Stack } from '@raidguild/design-system';
import { IRaid } from '@raidguild/dm-utils';
import StatusUpdateForm from './StatusUpdateForm';
import RaidUpdateForm from './RaidUpdateForm';
import ModalWrapper from './ModalWrapper';
import RaidPartyInfo from './RaidPartyInfo';
import { useOverlay } from '../contexts/OverlayContext';

interface RaidDetailsSidebarProps {
  raid: Partial<IRaid>;
}

const RaidDetailsSidebar: React.FC<RaidDetailsSidebarProps> = ({
  raid,
}: RaidDetailsSidebarProps) => {
  const localOverlay = useOverlay();
  const { setModals, closeModals } = localOverlay;
  // const relatedRaids = _.get(raid, 'raidByRelatedRaids');

  const handleShowStatusModal = () => {
    setModals({ raidStatus: true });
  };

  const handleShowRaidUpdatFormModal = () => {
    setModals({ raidForm: true });
  };

  return (
    <Stack spacing={5}>
      <HStack w='100%'>
        <Button onClick={handleShowStatusModal} flexGrow={1}>
          {_.get(raid, 'raidStatus.raidStatus')}
        </Button>
        <Button variant='outline' onClick={handleShowRaidUpdatFormModal}>
          Edit
        </Button>
      </HStack>

      <ModalWrapper
        name='raidStatus'
        size='sm'
        title='Update Raid Status'
        localOverlay={localOverlay}
      >
        <StatusUpdateForm
          raidId={_.get(raid, 'id')}
          raid={raid}
          currentStatus={_.get(raid, 'raidStatus.raidStatus')}
          closeModal={closeModals}
        />
      </ModalWrapper>
      <ModalWrapper
        name='raidForm'
        size='xl'
        title='Update Raid'
        localOverlay={localOverlay}
      >
        <RaidUpdateForm
          raidId={_.get(raid, 'id')}
          raid={raid}
          closeModal={closeModals}
        />
      </ModalWrapper>

      <RaidPartyInfo raid={raid} />
      {/* RAID TAGS */}
      {/* <RaidTags raid={raid} /> */}
      {/* RELATED RAIDS */}
      {/* {_.map(relatedRaids, (raid: IRaid) => (
        <Text key={1}>Related Raid 1</Text>
      ))} */}
    </Stack>
  );
};

export default RaidDetailsSidebar;
