import { AutoInvestmentStatus, PrismaClient } from "@prisma/client";
import { decryptPrivateKey } from "../crypto/encryption";
import { PoolService } from "../web3/pool";

const prisma = new PrismaClient();

interface PoolMatch {
  ruleId: string;
  poolId: string;
  score: number; // Score de correspondance (0-100)
  reasons: string[]; // Raisons du match
}

interface InvestmentExecution {
  success: boolean;
  txHash?: string;
  error?: string;
  amount: number;
}

export class AutoInvestmentEngine {
  private isProcessing = false;
  private processingInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Démarrer le traitement en arrière-plan
    this.startProcessing();
  }

  /**
   * Démarre le traitement automatique des investissements
   */
  private startProcessing(): void {
    if (this.isProcessing) return;

    this.isProcessing = true;
    console.log("🤖 Starting auto-investment engine");

    // Traiter les investissements en attente toutes les 30 secondes
    this.processingInterval = setInterval(async () => {
      await this.processPendingInvestments();
    }, 30000);
  }

  /**
   * Arrête le traitement automatique
   */
  stop(): void {
    if (!this.isProcessing) return;

    console.log("🛑 Stopping auto-investment engine");
    this.isProcessing = false;

    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  /**
   * Évalue si une pool correspond aux critères d'une règle d'investissement
   */
  async evaluatePoolForRule(
    poolId: string,
    ruleId: string
  ): Promise<PoolMatch | null> {
    try {
      const [pool, rule] = await Promise.all([
        prisma.pool.findUnique({
          where: { id: poolId },
          include: { creator: true },
        }),
        prisma.autoInvestmentRule.findUnique({
          where: { id: ruleId, isActive: true },
          include: { user: true, wallet: true },
        }),
      ]);

      if (!pool || !rule) {
        return null;
      }

      let score = 0;
      const reasons: string[] = [];
      const maxScore = 100;

      // Vérifier les critères obligatoires

      // 1. ChainId autorisé
      if (rule.chains.length > 0 && !rule.chains.includes(pool.chainId)) {
        return null; // Critère bloquant
      }
      score += 10;
      reasons.push(`Chain ${pool.chainId} autorisée`);

      // 2. Type de pool autorisé
      if (
        rule.poolTypes.length > 0 &&
        !rule.poolTypes.includes(pool.poolType)
      ) {
        return null; // Critère bloquant
      }
      score += 10;
      reasons.push(`Type ${pool.poolType} autorisé`);

      // 3. Collection NFT autorisée
      if (rule.allowedCollections.length > 0) {
        const collectionMatch = rule.allowedCollections.some(
          (collection) =>
            collection.toLowerCase() === pool.nftCollectionAddress.toLowerCase()
        );
        if (!collectionMatch) {
          return null; // Critère bloquant
        }
        score += 15;
        reasons.push("Collection NFT autorisée");
      }

      // 4. Prix d'achat maximum
      if (rule.maxBuyPrice !== null && pool.buyPrice > rule.maxBuyPrice) {
        return null; // Critère bloquant
      }
      if (rule.maxBuyPrice !== null) {
        score += 15;
        reasons.push(`Prix d'achat ${pool.buyPrice} ≤ ${rule.maxBuyPrice}`);
      }

      // 5. Prix de vente minimum
      if (rule.minSellPrice !== null && pool.sellPrice < rule.minSellPrice) {
        return null; // Critère bloquant
      }
      if (rule.minSellPrice !== null) {
        score += 15;
        reasons.push(`Prix de vente ${pool.sellPrice} ≥ ${rule.minSellPrice}`);
      }

      // 6. Frais créateur maximum
      if (rule.maxCreatorFee !== null && pool.creatorFee > rule.maxCreatorFee) {
        return null; // Critère bloquant
      }
      if (rule.maxCreatorFee !== null) {
        score += 10;
        reasons.push(
          `Frais créateur ${pool.creatorFee}% ≤ ${rule.maxCreatorFee}%`
        );
      }

      // 7. Âge minimum de la pool
      if (rule.minPoolAge !== null) {
        const poolAgeMinutes =
          (Date.now() - pool.createdAt.getTime()) / (1000 * 60);
        if (poolAgeMinutes < rule.minPoolAge) {
          return null; // Critère bloquant
        }
        score += 5;
        reasons.push(`Pool âgée de ${Math.round(poolAgeMinutes)} minutes`);
      }

      // 8. Créateur vérifié (si requis)
      if (rule.requireVerifiedCreator) {
        // TODO: Implémenter la vérification des créateurs
        // Pour l'instant, on considère que tous les créateurs sont vérifiés
        score += 5;
        reasons.push("Créateur vérifié");
      }

      // 9. Vérifier les limites journalières
      if (rule.maxInvestmentPerDay !== null) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayInvestments = await prisma.autoInvestment.aggregate({
          where: {
            ruleId: rule.id,
            createdAt: { gte: today },
            status: {
              in: [
                AutoInvestmentStatus.COMPLETED,
                AutoInvestmentStatus.PROCESSING,
              ],
            },
          },
          _sum: { amount: true },
        });

        const investedToday = todayInvestments._sum.amount || 0;
        if (investedToday + rule.investmentAmount > rule.maxInvestmentPerDay) {
          return null; // Limite journalière atteinte
        }
        score += 10;
        reasons.push(
          `Limite journalière respectée (${
            investedToday + rule.investmentAmount
          }/${rule.maxInvestmentPerDay})`
        );
      }

      // 10. Vérifier qu'on n'a pas déjà investi dans cette pool
      const existingInvestment = await prisma.autoInvestment.findUnique({
        where: { ruleId_poolId: { ruleId: rule.id, poolId: pool.id } },
      });

      if (existingInvestment) {
        return null; // Déjà investi
      }
      score += 10;
      reasons.push("Première fois pour cette pool");

      // Normaliser le score sur 100
      const finalScore = Math.min(score, maxScore);

      return {
        ruleId: rule.id,
        poolId: pool.id,
        score: finalScore,
        reasons,
      };
    } catch (error) {
      console.error("Error evaluating pool for rule:", error);
      return null;
    }
  }

  /**
   * Trouve toutes les règles qui correspondent à une pool
   */
  async findMatchingRules(poolId: string): Promise<PoolMatch[]> {
    try {
      // Récupérer toutes les règles actives
      const activeRules = await prisma.autoInvestmentRule.findMany({
        where: { isActive: true },
      });

      const matches: PoolMatch[] = [];

      for (const rule of activeRules) {
        const match = await this.evaluatePoolForRule(poolId, rule.id);
        if (match) {
          matches.push(match);
        }
      }

      // Trier par score décroissant
      return matches.sort((a, b) => b.score - a.score);
    } catch (error) {
      console.error("Error finding matching rules:", error);
      return [];
    }
  }

  /**
   * Exécute un investissement automatique
   */
  async executeInvestment(
    ruleId: string,
    poolId: string
  ): Promise<InvestmentExecution> {
    try {
      console.log(
        `🚀 Executing auto-investment: rule ${ruleId} → pool ${poolId}`
      );

      const [rule, pool] = await Promise.all([
        prisma.autoInvestmentRule.findUnique({
          where: { id: ruleId },
          include: { wallet: true, user: true },
        }),
        prisma.pool.findUnique({
          where: { id: poolId },
        }),
      ]);

      if (!rule || !pool) {
        throw new Error("Rule or pool not found");
      }

      // Créer l'enregistrement d'investissement automatique
      const autoInvestment = await prisma.autoInvestment.create({
        data: {
          ruleId: rule.id,
          poolId: pool.id,
          userId: rule.userId,
          amount: rule.investmentAmount,
          status: AutoInvestmentStatus.PROCESSING,
        },
      });

      try {
        // Décrypter la clé privée du wallet
        const privateKey = decryptPrivateKey(rule.wallet.encryptedPrivateKey);

        // Créer le service de pool pour l'investissement
        const poolService = new PoolService(
          pool.poolAddress,
          privateKey,
          pool.chainId
        );

        // Exécuter l'investissement
        const transaction = await poolService.invest(rule.investmentAmount);

        // Mettre à jour l'enregistrement avec le hash de transaction
        await prisma.autoInvestment.update({
          where: { id: autoInvestment.id },
          data: {
            txHash: transaction.hash,
            status: AutoInvestmentStatus.COMPLETED,
            executedAt: new Date(),
          },
        });

        // Mettre à jour les statistiques de la règle
        await prisma.autoInvestmentRule.update({
          where: { id: rule.id },
          data: {
            totalInvested: { increment: rule.investmentAmount },
            totalInvestments: { increment: 1 },
            lastTriggered: new Date(),
          },
        });

        console.log(
          `✅ Auto-investment executed successfully: ${transaction.hash}`
        );

        return {
          success: true,
          txHash: transaction.hash,
          amount: rule.investmentAmount,
        };
      } catch (executionError) {
        // Marquer l'investissement comme échoué
        await prisma.autoInvestment.update({
          where: { id: autoInvestment.id },
          data: {
            status: AutoInvestmentStatus.FAILED,
          },
        });

        throw executionError;
      }
    } catch (error) {
      console.error("Error executing auto-investment:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        amount: 0,
      };
    }
  }

  /**
   * Traite une nouvelle pool détectée
   */
  async processNewPool(poolId: string): Promise<void> {
    try {
      console.log(`🔍 Processing new pool for auto-investment: ${poolId}`);

      const matches = await this.findMatchingRules(poolId);

      if (matches.length === 0) {
        console.log(`ℹ️ No matching rules found for pool ${poolId}`);
        return;
      }

      console.log(
        `🎯 Found ${matches.length} matching rules for pool ${poolId}`
      );

      // Exécuter les investissements pour toutes les règles qui correspondent
      for (const match of matches) {
        console.log(
          `📋 Rule ${match.ruleId} matches with score ${match.score}:`
        );
        console.log(`   Reasons: ${match.reasons.join(", ")}`);

        const result = await this.executeInvestment(match.ruleId, match.poolId);

        if (result.success) {
          console.log(`✅ Auto-investment successful: ${result.txHash}`);
        } else {
          console.error(`❌ Auto-investment failed: ${result.error}`);
        }
      }
    } catch (error) {
      console.error("Error processing new pool:", error);
    }
  }

  /**
   * Traite les investissements en attente
   */
  private async processPendingInvestments(): Promise<void> {
    try {
      const pendingInvestments = await prisma.autoInvestment.findMany({
        where: { status: AutoInvestmentStatus.PENDING },
        include: { rule: true, pool: true },
        take: 10, // Limiter à 10 à la fois
      });

      if (pendingInvestments.length === 0) {
        return;
      }

      console.log(
        `⚙️ Processing ${pendingInvestments.length} pending auto-investments`
      );

      for (const investment of pendingInvestments) {
        await this.executeInvestment(investment.ruleId, investment.poolId);
      }
    } catch (error) {
      console.error("Error processing pending investments:", error);
    }
  }

  /**
   * Obtient les statistiques du moteur d'auto-investment
   */
  async getStats() {
    try {
      const [
        totalRules,
        activeRules,
        totalInvestments,
        pendingInvestments,
        completedInvestments,
        failedInvestments,
      ] = await Promise.all([
        prisma.autoInvestmentRule.count(),
        prisma.autoInvestmentRule.count({ where: { isActive: true } }),
        prisma.autoInvestment.count(),
        prisma.autoInvestment.count({
          where: { status: AutoInvestmentStatus.PENDING },
        }),
        prisma.autoInvestment.count({
          where: { status: AutoInvestmentStatus.COMPLETED },
        }),
        prisma.autoInvestment.count({
          where: { status: AutoInvestmentStatus.FAILED },
        }),
      ]);

      return {
        isProcessing: this.isProcessing,
        rules: {
          total: totalRules,
          active: activeRules,
        },
        investments: {
          total: totalInvestments,
          pending: pendingInvestments,
          completed: completedInvestments,
          failed: failedInvestments,
        },
      };
    } catch (error) {
      console.error("Error getting auto-investment stats:", error);
      return null;
    }
  }
}

// Instance globale
let autoInvestmentEngine: AutoInvestmentEngine | null = null;

/**
 * Obtient l'instance globale du moteur d'auto-investment
 */
export function getAutoInvestmentEngine(): AutoInvestmentEngine {
  if (!autoInvestmentEngine) {
    autoInvestmentEngine = new AutoInvestmentEngine();
  }
  return autoInvestmentEngine;
}

/**
 * Démarre le moteur d'auto-investment
 */
export function startAutoInvestmentEngine(): void {
  const engine = getAutoInvestmentEngine();
  console.log("🤖 Auto-investment engine started");
}

/**
 * Arrête le moteur d'auto-investment
 */
export function stopAutoInvestmentEngine(): void {
  if (autoInvestmentEngine) {
    autoInvestmentEngine.stop();
  }
}
