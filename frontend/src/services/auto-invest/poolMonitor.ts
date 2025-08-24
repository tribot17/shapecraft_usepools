import { decryptPrivateKeyAny } from "@/lib/crypto/encryption";
import { prisma } from "@/lib/prisma";
import { AutoInvestmentRule, Pool } from "@prisma/client";
import { ethers } from "ethers";
import { PoolService } from "../Pool";
import { createSessionFromWallet, usePoolsClient } from "../usepools";

interface PoolWithDetails extends Pool {
  creator: {
    id: string;
    walletAddress: string;
  };
}

interface AutoInvestRule extends AutoInvestmentRule {
  wallet: {
    id: string;
    address: string;
    encryptedPrivateKey: string;
  };
  user: {
    id: string;
    walletAddress: string;
  };
}

export class PoolMonitorService {
  private static instance: PoolMonitorService;
  private isRunning = false;

  static getInstance(): PoolMonitorService {
    if (!PoolMonitorService.instance) {
      PoolMonitorService.instance = new PoolMonitorService();
    }
    return PoolMonitorService.instance;
  }

  /**
   * Main monitoring function - scans for new pools and matches against active rules
   */
  async monitorAndInvest(): Promise<void> {
    if (this.isRunning) {
      console.log("Pool monitoring already running, skipping...");
      return;
    }

    this.isRunning = true;
    console.log("🤖 Starting auto-investment monitoring cycle...");

    try {
      const activeRules = await this.getActiveRules();
      if (activeRules.length === 0) {
        console.log("No active auto-investment rules found");
        return;
      }

      console.log(`Found ${activeRules.length} active auto-investment rules`);

      // 2. Get recent pools (created in last 30 minutes)
      const recentPools = await this.getRecentPools();
      if (recentPools.length === 0) {
        console.log("No recent pools found");
        return;
      }

      console.log(`Found ${recentPools.length} recent pools to analyze`);

      // 3. Match pools against rules and execute investments
      for (const rule of activeRules) {
        await this.processRuleAgainstPools(rule, recentPools);
      }
    } catch (error) {
      console.error("Error in pool monitoring cycle:", error);
    } finally {
      this.isRunning = false;
      console.log("🤖 Auto-investment monitoring cycle completed");
    }
  }

  /**
   * Get all active auto-investment rules with necessary relations
   */
  private async getActiveRules(): Promise<AutoInvestRule[]> {
    return await prisma.autoInvestmentRule.findMany({
      where: {
        isActive: true,
      },
      include: {
        wallet: {
          select: {
            id: true,
            address: true,
            encryptedPrivateKey: true,
          },
        },
        user: {
          select: {
            id: true,
            walletAddress: true,
          },
        },
      },
    });
  }

  /**
   * Get pools created in the last 30 minutes
   */
  private async getRecentPools(): Promise<PoolWithDetails[]> {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    return await prisma.pool.findMany({
      where: {
        createdAt: {
          gte: thirtyMinutesAgo,
        },
        status: "FUNDING", // Only consider pools that are open for funding
      },
      include: {
        creator: {
          select: {
            id: true,
            walletAddress: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  /**
   * Process a single rule against all recent pools
   */
  private async processRuleAgainstPools(
    rule: AutoInvestRule,
    pools: PoolWithDetails[]
  ): Promise<void> {
    console.log(`📊 Processing rule "${rule.name}" (${rule.id})`);

    for (const pool of pools) {
      try {
        const existingInvestment = await prisma.autoInvestment.findUnique({
          where: {
            ruleId_poolId: {
              ruleId: rule.id,
              poolId: pool.id,
            },
          },
        });

        if (existingInvestment) {
          continue;
        }

        if (await this.doesPoolMatchRule(pool, rule)) {
          console.log(`✅ Pool ${pool.name} matches rule ${rule.name}`);
          await this.executeInvestment(rule, pool);
        }
      } catch (error) {
        console.error(
          `Error processing pool ${pool.id} against rule ${rule.id}:`,
          error
        );
      }
    }
  }

  /**
   * Check if a pool matches the criteria of an auto-investment rule
   */
  private async doesPoolMatchRule(
    pool: PoolWithDetails,
    rule: AutoInvestRule
  ): Promise<boolean> {
    // 1. Check pool age (if minimum age is specified)
    if (rule.minPoolAge) {
      const poolAgeMinutes =
        (Date.now() - pool.createdAt.getTime()) / (1000 * 60);
      if (poolAgeMinutes < rule.minPoolAge) {
        console.log(
          `❌ Pool ${pool.name} too young: ${poolAgeMinutes.toFixed(1)} < ${
            rule.minPoolAge
          } minutes`
        );
        return false;
      }
    }

    // 2. Check buy price
    if (rule.maxBuyPrice) {
      console.log(pool.buyPrice);

      const buyPriceETH = Number(pool.buyPrice) / 1e18;
      if (buyPriceETH > rule.maxBuyPrice) {
        console.log(
          `❌ Pool ${pool.name} buy price too high: ${buyPriceETH} > ${rule.maxBuyPrice} ETH`
        );
        return false;
      }
    }

    // 3. Check sell price
    if (rule.minSellPrice) {
      const sellPriceETH = parseFloat(pool.sellPrice) / 1e18; // Convert Wei to ETH
      if (sellPriceETH < rule.minSellPrice) {
        console.log(
          `❌ Pool ${pool.name} sell price too low: ${sellPriceETH} < ${rule.minSellPrice} ETH`
        );
        return false;
      }
    }

    // 4. Check creator fee
    if (rule.maxCreatorFee) {
      if (pool.creatorFee > rule.maxCreatorFee) {
        console.log(
          `❌ Pool ${pool.name} creator fee too high: ${pool.creatorFee}% > ${rule.maxCreatorFee}%`
        );
        return false;
      }
    }

    // 5. Check pool types
    if (rule.poolTypes.length > 0) {
      if (!rule.poolTypes.includes(pool.poolType)) {
        console.log(
          `❌ Pool ${pool.name} type ${pool.poolType} not in allowed types: ${rule.poolTypes}`
        );
        return false;
      }
    }

    // 6. Check chains
    if (rule.chains.length > 0) {
      if (!rule.chains.includes(pool.chainId)) {
        console.log(
          `❌ Pool ${pool.name} chain ${pool.chainId} not in allowed chains: ${rule.chains}`
        );
        return false;
      }
    }

    // 7. Check allowed collections
    if (rule.allowedCollections.length > 0) {
      if (!rule.allowedCollections.includes(pool.nftCollection.toLowerCase())) {
        console.log(
          `❌ Pool ${pool.name} collection ${pool.nftCollection} not in allowed collections`
        );
        return false;
      }
    }

    // 8. Check daily investment limit
    if (rule.maxInvestmentPerDay) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const todayInvestments = await prisma.autoInvestment.aggregate({
        where: {
          ruleId: rule.id,
          createdAt: {
            gte: todayStart,
          },
          status: {
            in: ["COMPLETED", "PROCESSING"],
          },
        },
        _sum: {
          amount: true,
        },
      });

      const todayTotal = todayInvestments._sum.amount || 0;
      if (todayTotal + rule.investmentAmount > rule.maxInvestmentPerDay) {
        console.log(
          `❌ Pool ${pool.name} would exceed daily limit: ${
            todayTotal + rule.investmentAmount
          } > ${rule.maxInvestmentPerDay} ETH`
        );
        return false;
      }
    }

    // 9. Check verified creator (if required)
    if (rule.requireVerifiedCreator) {
      // TODO: Implement creator verification logic
      // For now, assume all creators are verified
    }

    console.log(
      `✅ Pool ${pool.name} passes all criteria for rule ${rule.name}`
    );
    return true;
  }

  private async executeInvestment(
    rule: AutoInvestRule,
    pool: PoolWithDetails
  ): Promise<void> {
    console.log(
      `💰 Executing investment: ${rule.investmentAmount} ETH in pool ${pool.name}`
    );

    try {
      const autoInvestment = await prisma.autoInvestment.create({
        data: {
          ruleId: rule.id,
          poolId: pool.id,
          userId: rule.userId,
          amount: rule.investmentAmount,
          status: "PROCESSING",
        },
      });

      try {
        const privateKey = decryptPrivateKeyAny(
          rule.wallet.encryptedPrivateKey
        );

        const poolService = new PoolService(
          pool.poolAddress,
          privateKey,
          pool.chainId
        );

        const amountInWEI = ethers.parseEther(rule.investmentAmount.toString());

        const tx = await poolService.invest(Number(amountInWEI));

        await prisma.autoInvestment.update({
          where: { id: autoInvestment.id },
          data: {
            txHash: tx.hash,
            status: "COMPLETED",
            executedAt: new Date(),
          },
        });

        console.log(rule.user.walletAddress);

        const usepoolsSession = createSessionFromWallet(
          rule.user.walletAddress
        );

        await usePoolsClient.joinPool(usepoolsSession, {
          poolId: pool.usepools_id || pool.id,
          amountInWEI: Number(amountInWEI),
          transactionHash: tx.hash,
        });

        // 4. Update rule statistics
        await prisma.autoInvestmentRule.update({
          where: { id: rule.id },
          data: {
            totalInvested: {
              increment: rule.investmentAmount,
            },
            totalInvestments: {
              increment: 1,
            },
            lastTriggered: new Date(),
          },
        });

        // 5. Update pool total contribution
        await prisma.pool.update({
          where: { id: pool.id },
          data: {
            totalContribution: {
              increment: rule.investmentAmount,
            },
          },
        });

        console.log(
          `✅ Investment completed successfully: ${rule.investmentAmount} ETH in pool ${pool.name}`
        );
      } catch (apiError) {
        console.error(
          "Failed to execute investment via UsePools API:",
          apiError
        );

        // Update auto-investment status to failed
        await prisma.autoInvestment.update({
          where: { id: autoInvestment.id },
          data: {
            status: "FAILED",
          },
        });
      }
    } catch (error) {
      console.error(
        `Failed to execute investment for rule ${rule.id} and pool ${pool.id}:`,
        error
      );
    }
  }

  /**
   * Get monitoring statistics
   */
  async getMonitoringStats(): Promise<{
    activeRules: number;
    totalInvestments: number;
    totalInvestedAmount: number;
    lastMonitoringRun?: Date;
  }> {
    const [activeRulesCount, totalInvestments, totalInvestedAmount] =
      await Promise.all([
        prisma.autoInvestmentRule.count({
          where: { isActive: true },
        }),
        prisma.autoInvestment.count({
          where: { status: "COMPLETED" },
        }),
        prisma.autoInvestment.aggregate({
          where: { status: "COMPLETED" },
          _sum: { amount: true },
        }),
      ]);

    return {
      activeRules: activeRulesCount,
      totalInvestments,
      totalInvestedAmount: totalInvestedAmount._sum.amount || 0,
    };
  }
}
