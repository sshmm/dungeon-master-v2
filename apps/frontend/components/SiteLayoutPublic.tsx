/* eslint-disable no-continue */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
import { Flex, Heading, Spinner, Stack } from '@raidguild/design-system';
import _ from 'lodash';
import { useRouter } from 'next/router';
import React, { ReactNode, useEffect, useState } from 'react';
import { useAccount, useConfig, useConnect } from 'wagmi';

import CommandPalette from './CommandPalette';
import Footer from './Footer';
import Navbar from './Navbar';
import ScrollToTopButton from './ScrollToTopButton';

interface SiteLayoutPublicProps {
  children: ReactNode;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
  subheader: ReactNode;
  emptyDataPhrase?: string;
  error?: Error;
  isLoading?: boolean;
  minHeight?: string | string[];
}

type GeneralLayoutProps = {
  minHeight?: string | string[];
  subheader?: ReactNode;
  showScrollToTopButton?: boolean;
  children?: ReactNode;
};

const GeneralLayout = ({
  minHeight,
  subheader,
  showScrollToTopButton,
  children,
}: GeneralLayoutProps) => (
  <Flex
    direction='column'
    overflowX='hidden'
    margin='0 auto'
    minHeight={minHeight || ['100%', null, '100vh']}
    minWidth={['100%', null, null, '100vw']}
    position='relative'
    background='gray.700'
  >
    <Navbar />
    <CommandPalette />
    <Flex
      direction='column'
      justify='flex-start'
      flex='1'
      align='center'
      minHeight={['50vh', '100vh', '0', '0']}
    >
      <Stack
        spacing={8}
        align='center'
        w={['90%', null, null, '80%']}
        mx='auto'
      >
        {subheader}
        {children}
      </Stack>
    </Flex>
    {showScrollToTopButton && <ScrollToTopButton />}
    <Footer />
  </Flex>
);

const SiteLayoutPublic = ({
  isLoading,
  data,
  error,
  subheader,
  emptyDataPhrase,
  children,
  minHeight = '100vh',
}: SiteLayoutPublicProps) => {
  const { pathname } = useRouter();

  // Copied as it is from 'SiteLayout.tsx'
  // TODO handle autoconnect
  const [isAutoConnecting, setIsAutoConnecting] = useState(false);
  const { address, chain } = useAccount();
  const { connectAsync, connectors } = useConnect();
  const client = useConfig();

  useEffect(() => {
    if (isAutoConnecting) return;
    if (address) return;

    setIsAutoConnecting(true);

    const autoConnect = async () => {
      const lastUsedConnector = client.storage?.getItem('wallet');

      const sorted = lastUsedConnector
        ? [...connectors].sort((x) => (x.id === lastUsedConnector ? -1 : 1))
        : connectors;

      for (const connector of sorted) {
        if (!connector.ready || !connector.isAuthorized) continue;
        const isAuthorized = await connector.isAuthorized();
        if (!isAuthorized) continue;

        await connectAsync({ connector });
        break;
      }
    };

    autoConnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showScrollToTopButton =
    pathname === '/raids' ||
    pathname === '/consultations' ||
    pathname === '/members' ||
    pathname === '/applications';

  if (!chain) {
    return (
      <GeneralLayout
        showScrollToTopButton={showScrollToTopButton}
        subheader={subheader}
        minHeight={minHeight}
      >
        <Flex
          justify='center'
          align='center'
          minH='70vh'
          maxW={['70%', 'none']}
        >
          <Heading size='md' textAlign='center'>
            Connect your wallet & Sign in
          </Heading>
        </Flex>
      </GeneralLayout>
    );
  }

  if (isLoading) {
    return (
      <GeneralLayout
        showScrollToTopButton={showScrollToTopButton}
        subheader={subheader}
        minHeight={minHeight}
      >
        <Flex w='100%' justify='center' alignItems='center' py={60}>
          <Spinner size='xl' />
        </Flex>
      </GeneralLayout>
    );
  }

  if (error) {
    return (
      <GeneralLayout
        showScrollToTopButton={showScrollToTopButton}
        subheader={subheader}
        minHeight={minHeight}
      >
        <Flex w='100%' justify='center' pt={40}>
          <Heading size='md'>Error loading data: {error.message}</Heading>
        </Flex>
      </GeneralLayout>
    );
  }

  return data && _.isEmpty(data) ? (
    <GeneralLayout
      showScrollToTopButton={showScrollToTopButton}
      subheader={subheader}
      minHeight={minHeight}
    >
      <Flex justify='center' align='center' minH='50vh'>
        <Heading size='md'>{emptyDataPhrase || 'No raids found!'}</Heading>
      </Flex>
    </GeneralLayout>
  ) : (
    <GeneralLayout
      showScrollToTopButton={showScrollToTopButton}
      subheader={subheader}
      minHeight={minHeight}
    >
      {children}
    </GeneralLayout>
  );
};

export default SiteLayoutPublic;
