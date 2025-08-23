import { PoolStatus, PoolType } from "@prisma/client";
import { ethers } from "ethers";
import { createPool, getPoolByAddress } from "../../../models/Pool";
import { getProvider, POOL_FACTORY_ADDRESS } from "../web3/config";
import { getPoolCreatedFromTransaction } from "../web3/events";

interface PoolDetectionConfig {
  chainId: number;
  poolFactoryAddress: string;
  pollInterval?: number; // en millisecondes
  startBlock?: number;
}

interface DetectedPool {
  poolAddress: string;
  creator: string;
  txHash: string;
  blockNumber: number;
  timestamp: number;
  chainId: number;
}

export class PoolDetectionService {
  private provider: ethers.Provider;
  private config: PoolDetectionConfig;
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private lastProcessedBlock: number;
  private onPoolDetectedCallbacks: Array<
    (pool: DetectedPool) => Promise<void>
  > = [];

  constructor(config: PoolDetectionConfig) {
    this.config = {
      pollInterval: 15000, // 15 secondes par défaut
      startBlock: 0,
      ...config,
    };
    this.provider = getProvider(config.chainId);
    this.lastProcessedBlock = config.startBlock || 0;
  }

  /**
   * Démarre la détection des nouvelles pools
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn("Pool detection service is already running");
      return;
    }

    console.log(`🔍 Starting pool detection for chain ${this.config.chainId}`);

    // Récupérer le dernier bloc si pas de startBlock spécifié
    if (this.lastProcessedBlock === 0) {
      this.lastProcessedBlock = await this.provider.getBlockNumber();
      console.log(
        `Starting pool detection from block: ${this.lastProcessedBlock}`
      );
    }

    this.isRunning = true;
    this.intervalId = setInterval(
      () => this.detectNewPools(),
      this.config.pollInterval
    );

    // Scanner immédiatement
    await this.detectNewPools();
  }

  /**
   * Arrête la détection
   */
  stop(): void {
    if (!this.isRunning) return;

    console.log("🛑 Stopping pool detection service");
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Ajoute un callback pour les nouvelles pools détectées
   */
  onPoolDetected(callback: (pool: DetectedPool) => Promise<void>): void {
    this.onPoolDetectedCallbacks.push(callback);
  }

  /**
   * Détecte les nouvelles pools créées
   */
  private async detectNewPools(): Promise<void> {
    try {
      const currentBlock = await this.provider.getBlockNumber();

      if (currentBlock <= this.lastProcessedBlock) {
        return; // Pas de nouveaux blocs
      }

      console.log(
        `🔍 Scanning for new pools from block ${
          this.lastProcessedBlock + 1
        } to ${currentBlock}`
      );

      // Scanner les nouveaux blocs pour les événements PoolCreated
      const fromBlock = this.lastProcessedBlock + 1;
      const toBlock = currentBlock;

      await this.scanBlocksForPools(fromBlock, toBlock);

      this.lastProcessedBlock = currentBlock;
    } catch (error) {
      console.error("Error detecting new pools:", error);
    }
  }

  /**
   * Scanner une plage de blocs pour les pools
   */
  private async scanBlocksForPools(
    fromBlock: number,
    toBlock: number
  ): Promise<void> {
    try {
      // Créer le filtre pour les événements PoolCreated
      const poolFactoryContract = new ethers.Contract(
        this.config.poolFactoryAddress,
        [
          "event PoolCreated(address indexed poolAddress, address indexed creator, string name, string symbol)",
        ],
        this.provider
      );

      const filter = poolFactoryContract.filters.PoolCreated();
      const events = await poolFactoryContract.queryFilter(
        filter,
        fromBlock,
        toBlock
      );

      if (events.length > 0) {
        console.log(
          `🎯 Found ${events.length} new pools between blocks ${fromBlock}-${toBlock}`
        );

        for (const event of events) {
          await this.processPoolCreatedEvent(event);
        }
      }
    } catch (error) {
      console.error(`Error scanning blocks ${fromBlock}-${toBlock}:`, error);
    }
  }

  /**
   * Traite un événement PoolCreated
   */
  private async processPoolCreatedEvent(event: ethers.Log): Promise<void> {
    try {
      const poolCreatedEvent = await getPoolCreatedFromTransaction(
        event.transactionHash,
        this.config.chainId,
        this.provider
      );

      if (!poolCreatedEvent) {
        console.warn(
          `Could not decode PoolCreated event for tx ${event.transactionHash}`
        );
        return;
      }

      const detectedPool: DetectedPool = {
        poolAddress: poolCreatedEvent.poolAddress,
        creator: poolCreatedEvent.creator,
        txHash: event.transactionHash,
        blockNumber: poolCreatedEvent.blockNumber,
        timestamp: poolCreatedEvent.timestamp,
        chainId: this.config.chainId,
      };

      console.log(
        `🏊 New pool detected: ${detectedPool.poolAddress} by ${detectedPool.creator}`
      );

      // Sauvegarder la pool en base de données si elle n'existe pas déjà
      await this.savePoolToDatabase(detectedPool);

      // Notifier tous les callbacks
      for (const callback of this.onPoolDetectedCallbacks) {
        try {
          await callback(detectedPool);
        } catch (callbackError) {
          console.error("Error in pool detection callback:", callbackError);
        }
      }
    } catch (error) {
      console.error("Error processing PoolCreated event:", error);
    }
  }

  private async savePoolToDatabase(detectedPool: DetectedPool): Promise<void> {
    try {
      // Vérifier si la pool existe déjà
      const existingPool = await getPoolByAddress(detectedPool.poolAddress);

      if (existingPool) {
        console.log(
          `Pool ${detectedPool.poolAddress} already exists in database`
        );
        return;
      }

      // Récupérer les détails de la pool depuis le contrat
      const poolDetails = await this.getPoolDetailsFromContract(
        detectedPool.poolAddress
      );

      // Créer la pool en base
      await createPool({
        name:
          poolDetails.name ||
          `Auto-detected Pool ${detectedPool.poolAddress.slice(0, 8)}`,
        nftCollectionAddress:
          poolDetails.nftCollection ||
          "0x0000000000000000000000000000000000000000",
        creatorFee: poolDetails.creatorFee || 0,
        poolAddress: detectedPool.poolAddress,
        poolType: poolDetails.poolType || PoolType.COLLECTION,
        buyPrice: poolDetails.buyPrice || 0,
        sellPrice: poolDetails.sellPrice || 0,
        totalContribution: 0,
        creatorId: "auto-detected", // À améliorer avec un système de mapping des créateurs
        chainId: existingPool.chainId,
        status: PoolStatus.FUNDING,
      });

      console.log(`✅ Pool ${detectedPool.poolAddress} saved to database`);
    } catch (error) {
      console.error("Error saving pool to database:", error);
    }
  }

  private async getPoolDetailsFromContract(poolAddress: string): Promise<{
    name?: string;
    nftCollection?: string;
    creatorFee?: number;
    poolType?: PoolType;
    buyPrice?: number;
    sellPrice?: number;
  }> {
    try {
      // Interface basique du contrat Pool
      const poolContract = new ethers.Contract(
        poolAddress,
        [
          "function name() view returns (string)",
          "function nftCollection() view returns (address)",
          "function creatorFee() view returns (uint256)",
          "function buyPrice() view returns (uint256)",
          "function sellPrice() view returns (uint256)",
        ],
        this.provider
      );

      const [name, nftCollection, creatorFee, buyPrice, sellPrice] =
        await Promise.allSettled([
          poolContract.name(),
          poolContract.nftCollection(),
          poolContract.creatorFee(),
          poolContract.buyPrice(),
          poolContract.sellPrice(),
        ]);

      return {
        name: name.status === "fulfilled" ? name.value : undefined,
        nftCollection:
          nftCollection.status === "fulfilled"
            ? nftCollection.value
            : undefined,
        creatorFee:
          creatorFee.status === "fulfilled"
            ? Number(creatorFee.value) / 100
            : undefined, // Conversion en %
        buyPrice:
          buyPrice.status === "fulfilled"
            ? Number(ethers.formatEther(buyPrice.value))
            : undefined,
        sellPrice:
          sellPrice.status === "fulfilled"
            ? Number(ethers.formatEther(sellPrice.value))
            : undefined,
        poolType: PoolType.COLLECTION, // Par défaut
      };
    } catch (error) {
      console.error("Error getting pool details from contract:", error);
      return {};
    }
  }

  /**
   * Scanner manuellement une transaction pour une pool
   */
  async scanTransaction(txHash: string): Promise<DetectedPool | null> {
    try {
      const poolCreatedEvent = await getPoolCreatedFromTransaction(
        txHash,
        this.config.chainId,
        this.provider
      );

      if (!poolCreatedEvent) {
        return null;
      }

      const detectedPool: DetectedPool = {
        poolAddress: poolCreatedEvent.poolAddress,
        creator: poolCreatedEvent.creator,
        txHash,
        blockNumber: poolCreatedEvent.blockNumber,
        timestamp: poolCreatedEvent.timestamp,
        chainId: this.config.chainId,
      };

      // Sauvegarder et notifier
      await this.savePoolToDatabase(detectedPool);

      for (const callback of this.onPoolDetectedCallbacks) {
        await callback(detectedPool);
      }

      return detectedPool;
    } catch (error) {
      console.error("Error scanning transaction for pool:", error);
      return null;
    }
  }

  /**
   * Rattrapage des pools depuis un bloc spécifique
   */
  async catchupPools(
    fromBlock: number,
    toBlock?: number
  ): Promise<DetectedPool[]> {
    const endBlock = toBlock || (await this.provider.getBlockNumber());
    const detectedPools: DetectedPool[] = [];

    console.log(`🔄 Catching up pools from block ${fromBlock} to ${endBlock}`);

    // Scanner par batches de 1000 blocs pour éviter les timeouts
    const batchSize = 1000;
    for (
      let currentBlock = fromBlock;
      currentBlock <= endBlock;
      currentBlock += batchSize
    ) {
      const batchEnd = Math.min(currentBlock + batchSize - 1, endBlock);

      try {
        await this.scanBlocksForPools(currentBlock, batchEnd);

        // Petite pause entre les batches
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error(
          `Error in catchup batch ${currentBlock}-${batchEnd}:`,
          error
        );
      }
    }

    this.lastProcessedBlock = endBlock;
    return detectedPools;
  }

  /**
   * Obtient les statistiques du service
   */
  getStats() {
    return {
      isRunning: this.isRunning,
      chainId: this.config.chainId,
      poolFactoryAddress: this.config.poolFactoryAddress,
      lastProcessedBlock: this.lastProcessedBlock,
      callbacksCount: this.onPoolDetectedCallbacks.length,
      pollInterval: this.config.pollInterval,
    };
  }
}

// Instances globales pour chaque chaîne
const detectionServices: Record<number, PoolDetectionService> = {};

/**
 * Obtient ou crée un service de détection pour une chaîne
 */
export function getPoolDetectionService(
  chainId: number,
  poolFactoryAddress: string,
  config?: Partial<PoolDetectionConfig>
): PoolDetectionService {
  if (!detectionServices[chainId]) {
    detectionServices[chainId] = new PoolDetectionService({
      chainId,
      poolFactoryAddress,
      ...config,
    });
  }
  return detectionServices[chainId];
}

/**
 * Démarre tous les services de détection
 */
export async function startAllPoolDetection(): Promise<void> {
  const configs = [
    {
      chainId: 360,
      poolFactoryAddress: POOL_FACTORY_ADDRESS[360],
    },
    {
      chainId: 11011,
      poolFactoryAddress: POOL_FACTORY_ADDRESS[11011],
    },
  ];

  for (const config of configs) {
    if (config.poolFactoryAddress !== "0x...") {
      const service = getPoolDetectionService(
        config.chainId,
        config.poolFactoryAddress
      );
      await service.start();
    }
  }
}

export function stopAllPoolDetection(): void {
  Object.values(detectionServices).forEach((service) => service.stop());
}
