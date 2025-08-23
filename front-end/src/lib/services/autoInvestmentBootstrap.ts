import {
  getAutoInvestmentEngine,
  startAutoInvestmentEngine,
} from "./autoInvestmentEngine";
import {
  getPoolDetectionService,
  startAllPoolDetection,
} from "./poolDetectionService";

interface AutoInvestmentBootstrapConfig {
  enablePoolDetection?: boolean;
  enableAutoInvestment?: boolean;
  poolFactoryAddresses?: {
    360?: string;
    11011?: string;
  };
}

export class AutoInvestmentBootstrap {
  private config: AutoInvestmentBootstrapConfig;
  private isRunning = false;

  constructor(config: AutoInvestmentBootstrapConfig = {}) {
    this.config = {
      enablePoolDetection: process.env.ENABLE_POOL_DETECTION === "true",
      enableAutoInvestment: process.env.ENABLE_AUTO_INVESTMENT === "true",
      poolFactoryAddresses: {
        360: process.env.POOL_FACTORY_ADDRESS_360,
        11011: process.env.POOL_FACTORY_ADDRESS_11011,
      },
      ...config,
    };
  }

  /**
   * Démarre le système d'auto-investment complet
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn("⚠️ Auto-investment system is already running");
      return;
    }

    console.log("🤖 Starting auto-investment system...");
    console.log("Config:", this.config);

    try {
      // Démarrer le moteur d'auto-investment
      if (this.config.enableAutoInvestment) {
        console.log("💰 Starting auto-investment engine...");
        startAutoInvestmentEngine();
      }

      // Démarrer la détection des pools
      if (this.config.enablePoolDetection) {
        console.log("🔍 Starting pool detection services...");

        // Configurer les callbacks pour l'auto-investment
        await this.setupPoolDetectionCallbacks();

        // Démarrer tous les services de détection
        await startAllPoolDetection();
      }

      this.isRunning = true;
      console.log("✅ Auto-investment system started successfully");
    } catch (error) {
      console.error("❌ Failed to start auto-investment system:", error);
      throw error;
    }
  }

  /**
   * Configure les callbacks entre détection de pools et auto-investment
   */
  private async setupPoolDetectionCallbacks(): Promise<void> {
    const autoInvestmentEngine = getAutoInvestmentEngine();

    // Configuration pour Shape Mainnet
    if (this.config.poolFactoryAddresses?.["360"]) {
      const detectionService360 = getPoolDetectionService(
        360,
        this.config.poolFactoryAddresses["360"]
      );

      detectionService360.onPoolDetected(async (detectedPool) => {
        console.log(
          `🎯 New pool detected on Shape Mainnet: ${detectedPool.poolAddress}`
        );

        // Attendre un peu pour que la pool soit sauvegardée en base
        setTimeout(async () => {
          try {
            // Récupérer l'ID de la pool depuis la base de données
            const { getPoolByAddress } = await import("../../../models/Pool");
            const pool = await getPoolByAddress(detectedPool.poolAddress);

            if (pool) {
              await autoInvestmentEngine.processNewPool(pool.id);
            } else {
              console.warn(
                `Pool ${detectedPool.poolAddress} not found in database`
              );
            }
          } catch (error) {
            console.error(
              "Error processing detected pool for auto-investment:",
              error
            );
          }
        }, 2000); // Attendre 2 secondes
      });
    }

    // Configuration pour Shape Sepolia
    if (this.config.poolFactoryAddresses?.["11011"]) {
      const detectionService11011 = getPoolDetectionService(
        11011,
        this.config.poolFactoryAddresses["11011"]
      );

      detectionService11011.onPoolDetected(async (detectedPool) => {
        console.log(
          `🎯 New pool detected on Shape Sepolia: ${detectedPool.poolAddress}`
        );

        setTimeout(async () => {
          try {
            const { getPoolByAddress } = await import("../../../models/Pool");
            const pool = await getPoolByAddress(detectedPool.poolAddress);

            if (pool) {
              await autoInvestmentEngine.processNewPool(pool.id);
            }
          } catch (error) {
            console.error(
              "Error processing detected pool for auto-investment:",
              error
            );
          }
        }, 2000);
      });
    }
  }

  /**
   * Arrête le système d'auto-investment
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.warn("⚠️ Auto-investment system is not running");
      return;
    }

    console.log("🛑 Stopping auto-investment system...");

    try {
      // Arrêter la détection des pools
      if (this.config.enablePoolDetection) {
        const { stopAllPoolDetection } = await import("./poolDetectionService");
        stopAllPoolDetection();
      }

      // Arrêter le moteur d'auto-investment
      if (this.config.enableAutoInvestment) {
        const { stopAutoInvestmentEngine } = await import(
          "./autoInvestmentEngine"
        );
        stopAutoInvestmentEngine();
      }

      this.isRunning = false;
      console.log("✅ Auto-investment system stopped");
    } catch (error) {
      console.error("❌ Error stopping auto-investment system:", error);
      throw error;
    }
  }

  /**
   * Redémarre le système
   */
  async restart(): Promise<void> {
    console.log("🔄 Restarting auto-investment system...");
    await this.stop();
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Attendre 1 seconde
    await this.start();
  }

  /**
   * Traite manuellement une nouvelle pool
   */
  async processPool(poolAddress: string): Promise<void> {
    try {
      console.log(`🔧 Manual processing of pool: ${poolAddress}`);

      const { getPoolByAddress } = await import("../../../models/Pool");
      const pool = await getPoolByAddress(poolAddress);

      if (!pool) {
        throw new Error(`Pool ${poolAddress} not found in database`);
      }

      const autoInvestmentEngine = getAutoInvestmentEngine();
      await autoInvestmentEngine.processNewPool(pool.id);

      console.log(`✅ Pool ${poolAddress} processed successfully`);
    } catch (error) {
      console.error("Error processing pool manually:", error);
      throw error;
    }
  }

  /**
   * Scan d'une transaction pour détecter une nouvelle pool
   */
  async scanTransaction(txHash: string, chainId: number): Promise<void> {
    try {
      const poolFactoryAddress =
        this.config.poolFactoryAddresses?.[chainId as 360 | 11011];

      if (!poolFactoryAddress) {
        throw new Error(
          `Pool factory address not configured for chain ${chainId}`
        );
      }

      const detectionService = getPoolDetectionService(
        chainId,
        poolFactoryAddress
      );
      const detectedPool = await detectionService.scanTransaction(txHash);

      if (detectedPool) {
        console.log(
          `🎯 Pool detected in transaction ${txHash}: ${detectedPool.poolAddress}`
        );

        // Le callback d'auto-investment sera appelé automatiquement
      } else {
        console.log(`ℹ️ No pool detected in transaction ${txHash}`);
      }
    } catch (error) {
      console.error("Error scanning transaction:", error);
      throw error;
    }
  }

  /**
   * Obtient le statut du système
   */
  async getStatus() {
    try {
      const autoInvestmentEngine = getAutoInvestmentEngine();
      const engineStats = await autoInvestmentEngine.getStats();

      const detectionStats = {};

      // Statut des services de détection
      for (const chainId of [360, 11011]) {
        const poolFactoryAddress =
          this.config.poolFactoryAddresses?.[chainId as 360 | 11011];
        if (poolFactoryAddress) {
          const service = getPoolDetectionService(chainId, poolFactoryAddress);
          detectionStats[chainId] = service.getStats();
        }
      }

      return {
        isRunning: this.isRunning,
        config: this.config,
        autoInvestmentEngine: engineStats,
        poolDetection: detectionStats,
      };
    } catch (error) {
      console.error("Error getting auto-investment system status:", error);
      return null;
    }
  }
}

// Instance globale
let bootstrapInstance: AutoInvestmentBootstrap | null = null;

/**
 * Obtient l'instance globale du bootstrap d'auto-investment
 */
export function getAutoInvestmentBootstrap(
  config?: AutoInvestmentBootstrapConfig
): AutoInvestmentBootstrap {
  if (!bootstrapInstance) {
    bootstrapInstance = new AutoInvestmentBootstrap(config);
  }
  return bootstrapInstance;
}

/**
 * Démarre automatiquement le système selon l'environnement
 */
export async function autoStartAutoInvestment(): Promise<void> {
  const bootstrap = getAutoInvestmentBootstrap();

  // Démarrer automatiquement en production ou si explicitement activé
  if (
    process.env.NODE_ENV === "production" ||
    process.env.AUTO_START_AUTO_INVESTMENT === "true"
  ) {
    await bootstrap.start();
  } else {
    console.log(
      "ℹ️ Auto-investment system not auto-started. Set AUTO_START_AUTO_INVESTMENT=true to enable."
    );
  }
}
