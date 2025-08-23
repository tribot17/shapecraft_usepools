import { useQuery } from "@tanstack/react-query";
import {
  getAllEventsFromTransaction,
  getEventFromTransaction,
  getEventsFromTransactions,
  getPoolCreatedFromTransaction,
  type DecodedEvent,
  type PoolCreatedEvent,
} from "../web3/events";

interface UseTransactionEventOptions {
  txHash: string;
  eventName?: string;
  chainId?: number;
  contractType: "PoolFactory" | "Pool";
  enabled?: boolean;
}

/**
 * Hook pour récupérer un événement spécifique à partir d'un hash de transaction
 */
export function useTransactionEvent({
  txHash,
  eventName,
  chainId = 360,
  contractType,
  enabled = true,
}: UseTransactionEventOptions) {
  return useQuery({
    queryKey: ["transactionEvent", txHash, eventName, chainId, contractType],
    queryFn: async (): Promise<DecodedEvent | null> => {
      if (!eventName) {
        throw new Error("eventName is required for useTransactionEvent");
      }

      return await getEventFromTransaction({
        txHash,
        eventName,
        chainId,
        contractType,
      });
    },
    enabled: enabled && !!txHash && !!eventName,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook pour récupérer tous les événements d'une transaction
 */
export function useAllTransactionEvents({
  txHash,
  chainId = 360,
  contractType,
  enabled = true,
}: Omit<UseTransactionEventOptions, "eventName">) {
  return useQuery({
    queryKey: ["allTransactionEvents", txHash, chainId, contractType],
    queryFn: async (): Promise<DecodedEvent[]> => {
      return await getAllEventsFromTransaction({
        txHash,
        chainId,
        contractType,
      });
    },
    enabled: enabled && !!txHash,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook spécialisé pour récupérer l'événement PoolCreated
 */
export function usePoolCreatedEvent({
  txHash,
  chainId = 360,
  enabled = true,
}: {
  txHash: string;
  chainId?: number;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: ["poolCreatedEvent", txHash, chainId],
    queryFn: async (): Promise<PoolCreatedEvent | null> => {
      return await getPoolCreatedFromTransaction(txHash, chainId);
    },
    enabled: enabled && !!txHash,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook pour récupérer des événements à partir de plusieurs transactions
 */
export function useMultipleTransactionEvents({
  txHashes,
  eventName,
  chainId = 360,
  contractType,
  enabled = true,
}: {
  txHashes: string[];
  eventName?: string;
  chainId?: number;
  contractType: "PoolFactory" | "Pool";
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: [
      "multipleTransactionEvents",
      txHashes,
      eventName,
      chainId,
      contractType,
    ],
    queryFn: async (): Promise<DecodedEvent[]> => {
      return await getEventsFromTransactions({
        txHashes,
        eventName,
        chainId,
        contractType,
      });
    },
    enabled: enabled && txHashes.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook combiné pour gérer différents types de requêtes d'événements
 */
export function useTransactionEventManager({
  txHash,
  txHashes,
  eventName,
  chainId = 360,
  contractType,
  mode = "single",
}: {
  txHash?: string;
  txHashes?: string[];
  eventName?: string;
  chainId?: number;
  contractType: "PoolFactory" | "Pool";
  mode?: "single" | "multiple" | "all" | "poolCreated";
}) {
  // Événement spécifique d'une transaction
  const singleEvent = useTransactionEvent({
    txHash: txHash || "",
    eventName,
    chainId,
    contractType,
    enabled: mode === "single" && !!txHash && !!eventName,
  });

  // Tous les événements d'une transaction
  const allEvents = useAllTransactionEvents({
    txHash: txHash || "",
    chainId,
    contractType,
    enabled: mode === "all" && !!txHash,
  });

  // Événements de plusieurs transactions
  const multipleEvents = useMultipleTransactionEvents({
    txHashes: txHashes || [],
    eventName,
    chainId,
    contractType,
    enabled: mode === "multiple" && !!txHashes?.length,
  });

  // Événement PoolCreated spécifique
  const poolCreatedEvent = usePoolCreatedEvent({
    txHash: txHash || "",
    chainId,
    enabled: mode === "poolCreated" && !!txHash,
  });

  const isLoading =
    singleEvent.isLoading ||
    allEvents.isLoading ||
    multipleEvents.isLoading ||
    poolCreatedEvent.isLoading;

  const error =
    singleEvent.error ||
    allEvents.error ||
    multipleEvents.error ||
    poolCreatedEvent.error;

  return {
    // Données
    singleEvent: singleEvent.data,
    allEvents: allEvents.data || [],
    multipleEvents: multipleEvents.data || [],
    poolCreatedEvent: poolCreatedEvent.data,

    // États
    isLoading,
    error,

    // Actions
    refetchSingle: singleEvent.refetch,
    refetchAll: allEvents.refetch,
    refetchMultiple: multipleEvents.refetch,
    refetchPoolCreated: poolCreatedEvent.refetch,
  };
}
