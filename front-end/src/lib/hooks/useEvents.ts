import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import type { PoolCreatedEvent } from "../web3/events";

interface UsePoolEventsOptions {
  chainId?: number;
  fromBlock?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

/**
 * Hook pour récupérer les événements de création de pools
 */
export function usePoolEvents(options: UsePoolEventsOptions = {}) {
  const {
    chainId = 360,
    fromBlock = 0,
    autoRefresh = false,
    refreshInterval = 30000, // 30 secondes
  } = options;

  const {
    data: events,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["poolEvents", chainId, fromBlock],
    queryFn: async (): Promise<PoolCreatedEvent[]> => {
      const params = new URLSearchParams({
        chainId: chainId.toString(),
        fromBlock: fromBlock.toString(),
      });

      const response = await fetch(`/api/events/pools?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch pool events");
      }

      const data = await response.json();
      return data.events;
    },
    refetchInterval: autoRefresh ? refreshInterval : false,
    staleTime: 10000, // 10 secondes
  });

  return {
    events: events || [],
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook pour écouter les nouveaux événements en temps réel
 */
export function useRealTimePoolEvents(chainId: number = 360) {
  const [newEvents, setNewEvents] = useState<PoolCreatedEvent[]>([]);
  const [isListening, setIsListening] = useState(false);

  const startListening = useCallback(() => {
    if (typeof window === "undefined") return;

    setIsListening(true);

    // TODO: Implémenter WebSocket ou Server-Sent Events pour les événements temps réel
    // Pour l'instant, on peut utiliser un polling
    const interval = setInterval(async () => {
      try {
        const response = await fetch(
          `/api/events/pools?chainId=${chainId}&fromBlock=latest`
        );
        if (response.ok) {
          const data = await response.json();
          if (data.events.length > 0) {
            setNewEvents((prev) => [...data.events, ...prev].slice(0, 50)); // Garder les 50 derniers
          }
        }
      } catch (error) {
        console.error("Error polling for new events:", error);
      }
    }, 10000); // Toutes les 10 secondes

    return () => {
      clearInterval(interval);
      setIsListening(false);
    };
  }, [chainId]);

  const stopListening = useCallback(() => {
    setIsListening(false);
  }, []);

  const clearEvents = useCallback(() => {
    setNewEvents([]);
  }, []);

  return {
    newEvents,
    isListening,
    startListening,
    stopListening,
    clearEvents,
  };
}

/**
 * Hook combiné pour gérer tous les aspects des événements de pools
 */
export function usePoolEventManager(options: UsePoolEventsOptions = {}) {
  const { chainId = 360 } = options;

  // Événements historiques
  const {
    events: historicalEvents,
    isLoading: isLoadingHistorical,
    error: historicalError,
    refetch: refetchHistorical,
  } = usePoolEvents(options);

  // Événements temps réel
  const {
    newEvents: realtimeEvents,
    isListening,
    startListening,
    stopListening,
    clearEvents,
  } = useRealTimePoolEvents(chainId);

  // Événements combinés (historiques + temps réel)
  const allEvents = [...realtimeEvents, ...historicalEvents];

  // Auto-start listening on mount
  useEffect(() => {
    startListening();
    return stopListening;
  }, [startListening, stopListening]);

  return {
    // Données
    historicalEvents,
    realtimeEvents,
    allEvents,

    // États
    isLoadingHistorical,
    isListening,

    // Erreurs
    historicalError,

    // Actions
    refetchHistorical,
    startListening,
    stopListening,
    clearEvents,
  };
}

/**
 * Hook pour filtrer les événements
 */
export function useFilteredPoolEvents(
  events: PoolCreatedEvent[],
  filters: {
    creator?: string;
    fromTimestamp?: number;
    toTimestamp?: number;
  } = {}
) {
  const filteredEvents = events.filter((event) => {
    if (
      filters.creator &&
      event.creator.toLowerCase() !== filters.creator.toLowerCase()
    ) {
      return false;
    }

    if (filters.fromTimestamp && event.timestamp < filters.fromTimestamp) {
      return false;
    }

    if (filters.toTimestamp && event.timestamp > filters.toTimestamp) {
      return false;
    }

    return true;
  });

  return {
    filteredEvents,
    totalCount: events.length,
    filteredCount: filteredEvents.length,
  };
}
