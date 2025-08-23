import { ethers } from "ethers";
import { getProvider } from "../web3/config";
import {
  decodePoolCreatedEvent,
  getAllEventsFromTransaction,
  getHistoricalEvents,
  getPoolCreatedFromTransaction,
  listenToEvents,
  type DecodedEvent,
  type PoolCreatedEvent,
} from "../web3/events";

// Configuration des contrats à surveiller
export const CONTRACT_ADDRESSES = {
  PoolFactory: {
    360: "0x...", // Adresse sur Shape mainnet
    11011: "0x...", // Adresse sur Shape sepolia
  },
  // Ajouter d'autres contrats si nécessaire
} as const;

export interface EventFilter {
  contractAddress: string;
  contractType: "PoolFactory" | "Pool";
  eventName: string;
  fromBlock?: number;
  toBlock?: number | "latest";
}

/**
 * Service principal pour gérer les événements
 */
export class EventService {
  private provider: ethers.Provider;
  private chainId: number;
  private listeners: (() => void)[] = [];

  constructor(chainId: number = 360) {
    this.chainId = chainId;
    this.provider = getProvider(chainId);
  }

  /**
   * Décode un événement PoolCreated et le sauvegarde éventuellement en DB
   */
  async handlePoolCreatedEvent(
    event: ethers.Log
  ): Promise<PoolCreatedEvent | null> {
    try {
      const decoded = await decodePoolCreatedEvent(event, this.provider);

      if (decoded) {
        console.log("New pool created:", decoded);

        // TODO: Sauvegarder en base de données
        // await this.savePoolCreatedToDB(decoded);
      }

      return decoded;
    } catch (error) {
      console.error("Error handling PoolCreated event:", error);
      return null;
    }
  }

  /**
   * Écoute les événements PoolCreated en temps réel
   */
  listenToPoolCreations(callback?: (event: PoolCreatedEvent) => void) {
    const poolFactoryAddress =
      CONTRACT_ADDRESSES.PoolFactory[
        this.chainId as keyof typeof CONTRACT_ADDRESSES.PoolFactory
      ];

    if (!poolFactoryAddress) {
      console.error(
        `No PoolFactory address configured for chain ${this.chainId}`
      );
      return;
    }

    const stopListening = listenToEvents(
      this.provider,
      poolFactoryAddress,
      "PoolFactory",
      "PoolCreated",
      async (decodedEvent) => {
        const poolEvent = await this.handlePoolCreatedEvent(
          decodedEvent as any
        );
        if (poolEvent && callback) {
          callback(poolEvent);
        }
      }
    );

    this.listeners.push(stopListening);
    return stopListening;
  }

  /**
   * Récupère l'historique des pools créées
   */
  async getPoolCreationHistory(
    fromBlock: number = 0
  ): Promise<PoolCreatedEvent[]> {
    const poolFactoryAddress =
      CONTRACT_ADDRESSES.PoolFactory[
        this.chainId as keyof typeof CONTRACT_ADDRESSES.PoolFactory
      ];

    if (!poolFactoryAddress) {
      console.error(
        `No PoolFactory address configured for chain ${this.chainId}`
      );
      return [];
    }

    try {
      const events = await getHistoricalEvents(
        this.provider,
        poolFactoryAddress,
        "PoolFactory",
        "PoolCreated",
        fromBlock
      );

      const poolEvents = await Promise.all(
        events.map(async (event) => {
          return await this.handlePoolCreatedEvent(event as any);
        })
      );

      return poolEvents.filter(
        (event): event is PoolCreatedEvent => event !== null
      );
    } catch (error) {
      console.error("Error getting pool creation history:", error);
      return [];
    }
  }

  /**
   * Recherche des événements avec filtres personnalisés
   */
  async searchEvents(filters: EventFilter[]): Promise<DecodedEvent[]> {
    try {
      const allEvents = await Promise.all(
        filters.map(async (filter) => {
          return await getHistoricalEvents(
            this.provider,
            filter.contractAddress,
            filter.contractType,
            filter.eventName,
            filter.fromBlock,
            filter.toBlock
          );
        })
      );

      return allEvents.flat();
    } catch (error) {
      console.error("Error searching events:", error);
      return [];
    }
  }

  /**
   * Surveille plusieurs types d'événements
   */
  startEventMonitoring(eventConfig: {
    poolCreated?: (event: PoolCreatedEvent) => void;
    // Ajouter d'autres événements ici
  }) {
    // Surveiller les créations de pools
    if (eventConfig.poolCreated) {
      this.listenToPoolCreations(eventConfig.poolCreated);
    }

    console.log(`Event monitoring started for chain ${this.chainId}`);
  }

  /**
   * Arrête tous les listeners
   */
  stopAllListeners() {
    this.listeners.forEach((stop) => stop());
    this.listeners = [];
    console.log("All event listeners stopped");
  }

  /**
   * Récupère l'événement PoolCreated à partir d'un hash de transaction
   */
  async getPoolCreatedFromTx(txHash: string): Promise<PoolCreatedEvent | null> {
    try {
      return await getPoolCreatedFromTransaction(
        txHash,
        this.chainId,
        this.provider
      );
    } catch (error) {
      console.error("Error getting PoolCreated from transaction:", error);
      return null;
    }
  }

  /**
   * Récupère tous les événements d'une transaction
   */
  async getAllEventsFromTx(
    txHash: string,
    contractType: "PoolFactory" | "Pool"
  ): Promise<DecodedEvent[]> {
    try {
      return await getAllEventsFromTransaction({
        txHash,
        chainId: this.chainId,
        contractType,
        provider: this.provider,
      });
    } catch (error) {
      console.error("Error getting all events from transaction:", error);
      return [];
    }
  }

  /**
   * Traite une transaction après sa confirmation pour extraire les événements
   */
  async processTransactionEvents(txHash: string): Promise<{
    poolCreated?: PoolCreatedEvent;
    allEvents: DecodedEvent[];
  }> {
    try {
      console.log(`Processing events for transaction: ${txHash}`);

      // Récupérer l'événement PoolCreated s'il existe
      const poolCreated = await this.getPoolCreatedFromTx(txHash);

      // Récupérer tous les événements PoolFactory
      const poolFactoryEvents = await this.getAllEventsFromTx(
        txHash,
        "PoolFactory"
      );

      // Récupérer tous les événements Pool (si applicable)
      const poolEvents = await this.getAllEventsFromTx(txHash, "Pool");

      const allEvents = [...poolFactoryEvents, ...poolEvents];

      console.log(`Found ${allEvents.length} events in transaction ${txHash}`);

      return {
        poolCreated: poolCreated || undefined,
        allEvents,
      };
    } catch (error) {
      console.error("Error processing transaction events:", error);
      return { allEvents: [] };
    }
  }

  /**
   * Change de réseau
   */
  switchChain(newChainId: number) {
    this.stopAllListeners();
    this.chainId = newChainId;
    this.provider = getProvider(newChainId);
  }
}

// Instance globale (singleton)
let eventServiceInstance: EventService | null = null;

export function getEventService(chainId: number = 360): EventService {
  if (!eventServiceInstance || eventServiceInstance.chainId !== chainId) {
    eventServiceInstance = new EventService(chainId);
  }
  return eventServiceInstance;
}

// Fonctions utilitaires pour usage direct
export async function getRecentPoolCreations(
  chainId: number = 360,
  fromBlock: number = 0
): Promise<PoolCreatedEvent[]> {
  const service = getEventService(chainId);
  return await service.getPoolCreationHistory(fromBlock);
}

export function monitorPoolCreations(
  chainId: number = 360,
  callback: (event: PoolCreatedEvent) => void
) {
  const service = getEventService(chainId);
  return service.listenToPoolCreations(callback);
}
