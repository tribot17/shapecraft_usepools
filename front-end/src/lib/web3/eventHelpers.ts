import {
  getAllEventsFromTransaction,
  getEventFromTransaction,
  getPoolCreatedFromTransaction,
  type DecodedEvent,
  type PoolCreatedEvent,
} from "./events";

/**
 * Helper pour tester la récupération d'événements depuis une transaction
 */
export async function testEventRetrieval(
  txHash: string,
  chainId: number = 360
) {
  console.log(`🧪 Testing event retrieval for transaction: ${txHash}`);

  try {
    // Test 1: Récupérer l'événement PoolCreated spécifiquement
    console.log("1. Testing PoolCreated event retrieval...");
    const poolCreatedEvent = await getPoolCreatedFromTransaction(
      txHash,
      chainId
    );

    if (poolCreatedEvent) {
      console.log("✅ PoolCreated event found:", {
        poolAddress: poolCreatedEvent.poolAddress,
        creator: poolCreatedEvent.creator,
        blockNumber: poolCreatedEvent.blockNumber,
        timestamp: new Date(poolCreatedEvent.timestamp * 1000).toISOString(),
      });
    } else {
      console.log("❌ No PoolCreated event found");
    }

    // Test 2: Récupérer tous les événements PoolFactory
    console.log("\n2. Testing all PoolFactory events retrieval...");
    const poolFactoryEvents = await getAllEventsFromTransaction({
      txHash,
      chainId,
      contractType: "PoolFactory",
    });

    console.log(`Found ${poolFactoryEvents.length} PoolFactory events:`);
    poolFactoryEvents.forEach((event, index) => {
      console.log(`  ${index + 1}. ${event.eventName} at ${event.address}`);
    });

    // Test 3: Récupérer tous les événements Pool (si applicable)
    console.log("\n3. Testing all Pool events retrieval...");
    const poolEvents = await getAllEventsFromTransaction({
      txHash,
      chainId,
      contractType: "Pool",
    });

    console.log(`Found ${poolEvents.length} Pool events:`);
    poolEvents.forEach((event, index) => {
      console.log(`  ${index + 1}. ${event.eventName} at ${event.address}`);
    });

    // Test 4: Recherche d'un événement spécifique
    console.log("\n4. Testing specific event search...");
    const specificEvent = await getEventFromTransaction({
      txHash,
      eventName: "PoolCreated",
      chainId,
      contractType: "PoolFactory",
    });

    if (specificEvent) {
      console.log(
        "✅ Specific PoolCreated event found via getEventFromTransaction"
      );
    } else {
      console.log("❌ Specific PoolCreated event not found");
    }

    return {
      poolCreatedEvent,
      poolFactoryEvents,
      poolEvents,
      specificEvent,
      success: true,
    };
  } catch (error) {
    console.error("❌ Error during event retrieval test:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Helper pour analyser les logs bruts d'une transaction
 */
export async function analyzeTransactionLogs(
  txHash: string,
  chainId: number = 360
) {
  console.log(`🔍 Analyzing raw logs for transaction: ${txHash}`);

  try {
    const { getProvider } = await import("./config");
    const provider = getProvider(chainId);

    const receipt = await provider.getTransactionReceipt(txHash);

    if (!receipt) {
      console.log("❌ No receipt found for transaction");
      return null;
    }

    console.log(`📄 Transaction Receipt Analysis:`);
    console.log(`- Block Number: ${receipt.blockNumber}`);
    console.log(`- Gas Used: ${receipt.gasUsed.toString()}`);
    console.log(`- Status: ${receipt.status === 1 ? "Success" : "Failed"}`);
    console.log(`- Logs Count: ${receipt.logs.length}`);

    receipt.logs.forEach((log, index) => {
      console.log(`\n📝 Log ${index + 1}:`);
      console.log(`  - Address: ${log.address}`);
      console.log(`  - Topics: [${log.topics.join(", ")}]`);
      console.log(`  - Data: ${log.data}`);
    });

    return {
      receipt,
      success: true,
    };
  } catch (error) {
    console.error("❌ Error analyzing transaction logs:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Helper pour valider qu'un hash de transaction est correct
 */
export function validateTransactionHash(txHash: string): boolean {
  // Vérifier que c'est une string
  if (typeof txHash !== "string") {
    console.error("❌ Transaction hash must be a string");
    return false;
  }

  // Vérifier le format hexadécimal
  if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
    console.error(
      "❌ Invalid transaction hash format. Must be 0x followed by 64 hex characters"
    );
    return false;
  }

  console.log("✅ Transaction hash format is valid");
  return true;
}

/**
 * Helper pour formater les événements pour l'affichage
 */
export function formatEventForDisplay(event: DecodedEvent): string {
  const args = Object.entries(event.args as Record<string, unknown>)
    .map(([key, value]) => `${key}: ${value}`)
    .join(", ");

  return `${event.eventName}(${args}) at block ${event.blockNumber}`;
}

/**
 * Helper pour formater un événement PoolCreated pour l'affichage
 */
export function formatPoolCreatedEvent(event: PoolCreatedEvent): string {
  const date = new Date(event.timestamp * 1000).toLocaleString();
  return `Pool ${event.poolAddress} created by ${event.creator} at ${date}`;
}
