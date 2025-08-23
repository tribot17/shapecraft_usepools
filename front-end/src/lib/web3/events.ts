import { ethers } from "ethers";
import { PoolABI } from "../ABI/PoolABI";
import { PoolFactoryABI } from "../ABI/PoolFactoryABI";
import { getProvider } from "./config";

export interface PoolCreatedEvent {
  poolAddress: string;
  creator: string;
  blockNumber: number;
  transactionHash: string;
  timestamp: number;
}

export interface PoolContributionEvent {
  contributor: string;
  amount: string;
  poolAddress: string;
  blockNumber: number;
  transactionHash: string;
  timestamp: number;
}

export interface DecodedEvent {
  eventName: string;
  args: Record<string, unknown>;
  address: string;
  blockNumber: number;
  transactionHash: string;
  timestamp?: number;
}

const CONTRACT_ABIS = {
  PoolFactory: PoolFactoryABI,
  Pool: PoolABI,
} as const;

export async function decodeEvent(
  event: ethers.Log,
  contractType: keyof typeof CONTRACT_ABIS
): Promise<DecodedEvent | null> {
  try {
    const abi = CONTRACT_ABIS[contractType];
    const iface = new ethers.Interface(abi);

    console.log({ topics: event.topics, data: event.data });

    const decoded = iface.parseLog({
      topics: event.topics,
      data: event.data,
    });
    console.log("🚀 ~ decodeEvent ~ decoded:", decoded);

    if (!decoded) {
      console.warn("Could not decode event:", event);
      return null;
    }

    return {
      eventName: decoded.name,
      args: decoded.args,
      address: event.address,
      blockNumber: event.blockNumber,
      transactionHash: event.transactionHash,
    };
  } catch (error) {
    console.error("Error decoding event:", error);
    return null;
  }
}

/**
 * Récupère un événement spécifique à partir d'un hash de transaction
 */
export async function getEventFromTransaction({
  txHash,
  eventName,
  chainId = 360,
  contractType,
  provider,
}: {
  txHash: string;
  eventName: string;
  chainId?: number;
  contractType: keyof typeof CONTRACT_ABIS;
  provider?: ethers.Provider;
}): Promise<DecodedEvent | null> {
  try {
    const ethProvider = provider || getProvider(chainId);

    const hashString = String(txHash);

    const receipt = await ethProvider.getTransactionReceipt(hashString);

    if (!receipt) {
      console.warn(`No receipt found for transaction: ${hashString}`);
      return null;
    }

    const abi = CONTRACT_ABIS[contractType];
    const iface = new ethers.Interface(abi);

    for (const log of receipt.logs) {
      try {
        const parsedLog = iface.parseLog({
          topics: log.topics,
          data: log.data,
        });

        console.log(`Found event: ${parsedLog?.name} in tx: ${hashString}`);

        if (parsedLog?.name === eventName) {
          // Récupérer le timestamp du bloc
          const block = await ethProvider.getBlock(receipt.blockNumber);

          return {
            eventName: parsedLog.name,
            args: parsedLog.args,
            address: log.address,
            blockNumber: receipt.blockNumber,
            transactionHash: hashString,
            timestamp: block?.timestamp || 0,
          };
        }
      } catch {
        continue;
      }
    }

    console.warn(
      `Event "${eventName}" not found in transaction: ${hashString}`
    );
    return null;
  } catch (error) {
    console.error("Error getting event from transaction:", error);
    return null;
  }
}

/**
 * Récupère tous les événements d'un type spécifique à partir d'un hash de transaction
 */
export async function getAllEventsFromTransaction({
  txHash,
  chainId = 360,
  contractType,
  provider,
}: {
  txHash: string;
  chainId?: number;
  contractType: keyof typeof CONTRACT_ABIS;
  provider?: ethers.Provider;
}): Promise<DecodedEvent[]> {
  try {
    const ethProvider = provider || getProvider(chainId);

    // S'assurer que txHash est une string valide
    const hashString = String(txHash);

    const receipt = await ethProvider.getTransactionReceipt(hashString);

    if (!receipt) {
      console.warn(`No receipt found for transaction: ${hashString}`);
      return [];
    }

    const abi = CONTRACT_ABIS[contractType];
    const iface = new ethers.Interface(abi);
    const events: DecodedEvent[] = [];

    const block = await ethProvider.getBlock(receipt.blockNumber);
    const timestamp = block?.timestamp || 0;

    for (const log of receipt.logs) {
      try {
        const parsedLog = iface.parseLog({
          topics: log.topics,
          data: log.data,
        });

        if (parsedLog) {
          events.push({
            eventName: parsedLog.name,
            args: parsedLog.args,
            address: log.address,
            blockNumber: receipt.blockNumber,
            transactionHash: hashString,
            timestamp,
          });
        }
      } catch {
        continue;
      }
    }

    console.log(`Found ${events.length} events in transaction: ${hashString}`);
    return events;
  } catch (error) {
    console.error("Error getting all events from transaction:", error);
    return [];
  }
}

/**
 * Récupère spécifiquement l'événement PoolCreated à partir d'un hash de transaction
 */
export async function getPoolCreatedFromTransaction(
  txHash: string,
  chainId: number = 360,
  provider?: ethers.Provider
): Promise<PoolCreatedEvent | null> {
  try {
    // S'assurer que txHash est une string valide
    const hashString = String(txHash);

    const event = await getEventFromTransaction({
      txHash: hashString,
      eventName: "PoolCreated",
      chainId,
      contractType: "PoolFactory",
      provider,
    });

    if (!event || event.eventName !== "PoolCreated") {
      console.warn(`PoolCreated event not found in transaction: ${hashString}`);
      return null;
    }

    return {
      poolAddress: event.args.poolAddress as string,
      creator: event.args.creator as string,
      blockNumber: event.blockNumber,
      transactionHash: hashString,
      timestamp: event.timestamp || 0,
    };
  } catch (error) {
    console.error("Error getting PoolCreated event from transaction:", error);
    return null;
  }
}

/**
 * Version générique pour récupérer n'importe quel événement
 */
export async function getEventsFromTransactions({
  txHashes,
  eventName,
  chainId = 360,
  contractType,
  provider,
}: {
  txHashes: string[];
  eventName?: string;
  chainId?: number;
  contractType: keyof typeof CONTRACT_ABIS;
  provider?: ethers.Provider;
}): Promise<DecodedEvent[]> {
  try {
    // Normaliser les hashes de transaction
    const normalizedHashes = txHashes.map((hash) => String(hash));

    console.log(
      `Processing ${normalizedHashes.length} transactions for events`
    );

    const allEvents = await Promise.all(
      normalizedHashes.map(async (txHash) => {
        try {
          if (eventName) {
            // Récupérer un événement spécifique
            const event = await getEventFromTransaction({
              txHash,
              eventName,
              chainId,
              contractType,
              provider,
            });
            return event ? [event] : [];
          } else {
            // Récupérer tous les événements
            return await getAllEventsFromTransaction({
              txHash,
              chainId,
              contractType,
              provider,
            });
          }
        } catch (error) {
          console.error(`Error processing transaction ${txHash}:`, error);
          return [];
        }
      })
    );

    const flatEvents = allEvents.flat();
    console.log(
      `Found ${flatEvents.length} total events across all transactions`
    );

    return flatEvents;
  } catch (error) {
    console.error("Error getting events from transactions:", error);
    return [];
  }
}

export function listenToEvents(
  provider: ethers.Provider,
  contractAddress: string,
  contractType: keyof typeof CONTRACT_ABIS,
  eventName: string,
  callback: (decodedEvent: DecodedEvent) => void
) {
  const abi = CONTRACT_ABIS[contractType];
  const contract = new ethers.Contract(contractAddress, abi, provider);

  // Écouter l'événement spécifique
  contract.on(eventName, async (...args) => {
    try {
      // Le dernier argument est toujours l'objet event
      const event = args[args.length - 1];

      const decoded = await decodeEvent(event, contractType);
      if (decoded) {
        callback(decoded);
      }
    } catch (error) {
      console.error("Error processing event:", error);
    }
  });

  return () => {
    contract.removeAllListeners(eventName);
  };
}

/**
 * Récupère les événements historiques
 */
export async function getHistoricalEvents(
  provider: ethers.Provider,
  contractAddress: string,
  contractType: keyof typeof CONTRACT_ABIS,
  eventName: string,
  fromBlock: number = 0,
  toBlock: number | "latest" = "latest"
): Promise<DecodedEvent[]> {
  try {
    const abi = CONTRACT_ABIS[contractType];
    const contract = new ethers.Contract(contractAddress, abi, provider);

    const filter = contract.filters[eventName]();
    const events = await contract.queryFilter(filter, fromBlock, toBlock);

    const decodedEvents = await Promise.all(
      events.map(async (event) => {
        const decoded = await decodeEvent(event, contractType);
        if (decoded) {
          // Ajouter le timestamp
          const block = await provider.getBlock(event.blockNumber);
          decoded.timestamp = block?.timestamp || 0;
        }
        return decoded;
      })
    );

    return decodedEvents.filter(
      (event): event is DecodedEvent => event !== null
    );
  } catch (error) {
    console.error("Error getting historical events:", error);
    return [];
  }
}

/**
 * Décode plusieurs événements de différents types
 */
export async function decodeMultipleEvents(
  events: ethers.Log[],
  contractMappings: Map<string, keyof typeof CONTRACT_ABIS>,
  provider: ethers.Provider
): Promise<DecodedEvent[]> {
  const decodedEvents = await Promise.all(
    events.map(async (event) => {
      const contractType = contractMappings.get(event.address.toLowerCase());
      if (!contractType) {
        console.warn("Unknown contract address:", event.address);
        return null;
      }

      const decoded = await decodeEvent(event, contractType);
      if (decoded) {
        // Ajouter le timestamp
        const block = await provider.getBlock(event.blockNumber);
        decoded.timestamp = block?.timestamp || 0;
      }
      return decoded;
    })
  );

  return decodedEvents.filter((event): event is DecodedEvent => event !== null);
}
