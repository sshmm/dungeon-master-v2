/* eslint-disable no-await-in-loop */
import {
  client as dmGraphQlClient,
  TRANSACTIONS_QUERY_V3,
} from '@raidguild/dm-graphql';
import {
  IAccountingRaid,
  Invoice,
  Proposal,
  RageQuit,
} from '@raidguild/dm-types';
import {
  camelize,
  GNOSIS_SAFE_ADDRESS,
  GUILD_GNOSIS_DAO_ADDRESS_V3,
} from '@raidguild/dm-utils';
import { client as getEscrowClient } from '@raidguild/escrow-gql';
import { NETWORK_CONFIG } from '@raidguild/escrow-utils';
import { useInfiniteQuery, useQueries, useQuery } from '@tanstack/react-query';
import { GraphQLClient } from 'graphql-request';
import _ from 'lodash';
import { useSession } from 'next-auth/react';
import { getAddress } from 'viem';
import { gnosis } from 'viem/chains';

const graphUrl = (chainId: number = 4) =>
  `https://api.thegraph.com/subgraphs/name/${_.get(NETWORK_CONFIG, [
    chainId,
    'SUBGRAPH',
  ])}`;

export const SUPPORTED_NETWORKS = _.map(_.keys(NETWORK_CONFIG), _.toNumber);

export const client = (chainId: number) => new GraphQLClient(graphUrl(chainId));

const API_URL = 'https://safe-transaction-gnosis-chain.safe.global/api/v1';

const listTokenBalances = async ({ safeAddress }: { safeAddress: string }) => {
  try {
    const res = await fetch(`${API_URL}/safes/${safeAddress}/balances/`);
    const data = await res.json();
    const filteredTokenBalanceRes = _.filter(data, 'tokenAddress');

    return {
      data: { safeAddress, tokenBalances: filteredTokenBalanceRes },
    };
  } catch (err) {
    return { error: `Error fetching token balances. Please try again. ${err}` };
  }
};

const getSafeTransactionProposals = async ({
  safeAddress,
}: {
  safeAddress: string;
}) => {
  try {
    const limit = 100;
    let offset = 0;
    let allTxData = [];

    let hasNext = true;
    while (hasNext) {
      const res = await fetch(
        `${API_URL}/safes/${safeAddress}/all-transactions/?limit=${limit}&offset=${offset}`
      );
      const txData = await res.json();
      allTxData = _.concat(allTxData, txData.results);

      hasNext = !!txData.next;
      if (hasNext) offset += limit;
    }

    return { txData: allTxData };
  } catch (err) {
    return {
      error: `Error fetching safe transactions. Please try again. ${err}`,
    };
  }
};

const getRageQuits = async (v3client: GraphQLClient): Promise<RageQuit[]> => {
  try {
    const rageQuits: { rageQuits: RageQuit[] } = await v3client.request(`
      {
        rageQuits(where: { dao: "${GNOSIS_SAFE_ADDRESS}" }) { 
          shares
          txHash
        }
      }
    `);

    return rageQuits.rageQuits;
  } catch (error) {
    return [];
  }
};

const getSmartInvoice = async (
  v3ClientInvoices: GraphQLClient
): Promise<Invoice[]> => {
  try {
    const invoices: { invoices: Invoice[] } = await v3ClientInvoices.request(`
        {
          invoices (where: { provider: "${GUILD_GNOSIS_DAO_ADDRESS_V3}" }) {
            token
            address
            releases {
              timestamp
              amount
            }
          }
        }
    `);

    return invoices.invoices;
  } catch (error) {
    return [];
  }
};

const raidsQueryResult = async (token: string) => {
  const response = await dmGraphQlClient({ token }).request(
    TRANSACTIONS_QUERY_V3
  );

  return {
    raids: camelize(_.get(response, 'raids')),
  };
};

const useAccountingV3 = () => {
  const { data: session } = useSession();
  const token = _.get(session, 'token') as string;

  const checksum = getAddress(GNOSIS_SAFE_ADDRESS);

  const v3client = new GraphQLClient(
    `https://gateway-arbitrum.network.thegraph.com/api/${process.env.NEXT_PUBLIC_THE_GRAPH_API_KEY}/subgraphs/id/6x9FK3iuhVFaH9sZ39m8bKB5eckax8sjxooBPNKWWK8r`
  );

  const v3ClientInvoices = getEscrowClient(gnosis.id);

  const {
    isError: raidsIsError,
    isLoading: raidsIsLoading,
    error: raidsError,
    data: raidsData,
  } = useInfiniteQuery<
    {
      raids: Array<IAccountingRaid>;
    },
    Error
  >({
    queryKey: ['raidsV3'],
    queryFn: () => raidsQueryResult(token),
    getNextPageParam: (lastPage, allPages) =>
      _.isEmpty(lastPage)
        ? undefined
        : _.divide(_.size(_.flatten(allPages)), 100),
    enabled: Boolean(token),
    initialPageParam: 0,
  });

  const {
    data: tokenBalances,
    error: tokenBalancesError,
    isLoading: tokenBalancesLoading,
    isError: tokenBalancesIsError,
  } = useQuery({
    queryKey: ['tokenBalances', checksum],
    queryFn: () => listTokenBalances({ safeAddress: checksum }),
  });

  const {
    data: txResponse,
    error: txResponseError,
    isLoading: txResponseLoading,
    isError: txResponseIsError,
  } = useQuery({
    queryKey: ['transactions', checksum],
    queryFn: () => getSafeTransactionProposals({ safeAddress: checksum }),
  });

  const {
    data: rageQuitsData,
    error: rageQuitsError,
    isLoading: rageQuitsDataLoading,
    isError: rageQuitsIsError,
  } = useQuery({
    queryKey: ['rageQuits'],
    queryFn: () => getRageQuits(v3client),
  });

  const {
    data: smartInvoiceData,
    error: smartInvoiceError,
    isLoading: smartInvoiceLoading,
    isError: smartInvoiceIsError,
  } = useQuery({
    queryKey: ['smartInvoice'],
    queryFn: () => getSmartInvoice(v3ClientInvoices),
  });

  const proposalQueries =
    _.map(txResponse?.txData, (tx) => {
      const txHash = tx.transactionHash || tx.txHash;
      return {
        queryKey: ['proposal', txHash],
        queryFn: async (): Promise<Proposal | null> => {
          try {
            const proposal: { proposals: Proposal[] } = await v3client.request(`
            {
              proposals(where: { processTxHash: "${txHash}"}) {
                id
                createdAt
                createdBy
                proposedBy
                processTxHash
                proposalType
                description
                title
                txHash
              }
            }
          `);
            if (!_.size(proposal.proposals)) {
              return null;
            }
            return _.first(proposal.proposals) || null;
          } catch (error) {
            return null;
          }
        },
        onError: (error: Error) => {
          console.error(
            `Error in query proposal with txHash: ${txHash}`,
            error
          );
        },
      };
    }) || [];

  const proposalsInfo = useQueries({ queries: proposalQueries });
  const error =
    tokenBalancesError ||
    txResponseError ||
    rageQuitsError ||
    smartInvoiceError ||
    raidsError;
  const isError =
    tokenBalancesIsError ||
    txResponseIsError ||
    rageQuitsIsError ||
    smartInvoiceIsError ||
    raidsIsError;
  const loading =
    tokenBalancesLoading ||
    txResponseLoading ||
    rageQuitsDataLoading ||
    smartInvoiceLoading ||
    raidsIsLoading;
  const transformProposals = proposalsInfo
    .filter((query) => query.data)
    .map((query) => query.data as Proposal)
    .reduce((acc, proposal) => {
      const { processTxHash, ...rest } = proposal;
      acc[processTxHash] = rest;
      return acc;
    }, {} as Record<string, Omit<Proposal, 'processTxHash'>>);

  const data = {
    raids: raidsData?.pages[0].raids,
    smartInvoice: smartInvoiceData,
    tokens: tokenBalances?.data,
    transactions: txResponse?.txData,
    rageQuits: rageQuitsData || [],
    proposalsInfo: transformProposals,
  };

  return { data, error, isError, loading };
};

export default useAccountingV3;
